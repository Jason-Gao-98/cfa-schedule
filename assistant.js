/* =========================================================
 * 本地排片问答助手（assistant.js）
 *
 * 纯前端、零网络模型的规则问答：
 *   - 只读取站内已有数据：当前已加载的场次、archive/YYYY-MM.json 存档、
 *     prices.js（票价）、extra-schedule.js（补充场次）、events-2026-11.js（活动）。
 *   - 不联网调用任何问答服务、不需要 API Key、不猜测任何场次 / 时间 / 厅号 / 票价。
 *   - 算不出来就明确说「没查到」，并给出可继续操作的提示。
 *   - 上座率需要登录资料馆 APP，问答不查询、不伪造座位，只提示去卡片上的按钮。
 *
 * 依赖 app.js 的全局能力（同一个页面、普通 script）：
 *   state / monthCache / ensureAmount / fetchDay / loadArchive / mergeArchive /
 *   mergeExtras / priceOf / venueShortOf / hallRank / planEventOf / similarity /
 *   normKey / setDay / renderMonthLabel / load / reducedMotion / pad2 等。
 *
 * 数据加载策略（按需）：
 *   - 问某天 / 某周：只拉该日期所在月份「场次计数 + 存档 + 需要的单日明细」。
 *   - 问某部片：只扫描站内已发布的「当月 + 下月」，按 4 并发补拉尚未加载的日期；
 *     已加载过的日期直接复用，不重复请求。
 *   - 问整月：不整月拉取，只返回接口的场次计数，引导去「按月查看」。
 * ========================================================= */
(function () {
  'use strict';

  var MAX_ROWS = 40;          // 单个回答最多列出的场次行数
  var LOAD_LIMIT = 4;         // 按需补拉单日数据的并发数
  var HISTORY_MAX = 8;        // sessionStorage 里最多保留的问答轮数
  var STORE_KEY = 'cfa_assist_log_v1';

  /* ---------- 基础工具 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function nowToday() { return todayStr(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function mdText(ds) {
    return Number(ds.slice(5, 7)) + ' 月 ' + Number(ds.slice(8, 10)) + ' 日';
  }
  function weekText(ds) { return WEEK[weekdayOf(ds)]; }
  function dayFull(ds) { return mdText(ds) + '（' + weekText(ds) + '）'; }
  function cacheOf(ds) { return state.cache[ds.slice(0, 7)] || null; }
  function recKeyOf(r) {
    return String(r.playTime || '') + '|' + (r.cinemaInfo || '') + '|' + (r.movieHall || '');
  }
  function timeOf(r) { return String(r.playTime || '').slice(11, 16); }
  function minsOfText(t) {
    var p = String(t || '').split(':');
    return Number(p[0]) * 60 + Number(p[1] || 0);
  }
  function hm(mins) {
    var m = Math.max(0, Number(mins) || 0);
    return pad2(Math.floor(m / 60) % 24) + ':' + pad2(m % 60);
  }
  function nameOf(r) { return String((r.movieInfo || {}).movieName || ''); }

  function normalizeQuote(q) {
    return String(q || '')
      .replace(/[０-９]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 65248); })
      .replace(/：/g, ':').replace(/／/g, '/').replace(/　/g, ' ').trim();
  }
  function stripTitles(q) {
    return String(q || '')
      .replace(/《[^》]*》/g, ' ').replace(/「[^」]*」/g, ' ')
      .replace(/“[^”]*”/g, ' ').replace(/"[^"]*"/g, ' ');
  }

  /* ---------- 中文数字（日期 / 时间用） ---------- */
  var CN_NUM = { '〇': 0, '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  function cnToNum(str) {
    var s = String(str || '');
    if (/^\d+$/.test(s)) return Number(s);
    if (s === '十') return 10;
    var m = /^([一二三四五六七八九])?十([一二三四五六七八九])?$/.exec(s);
    if (m) return (m[1] ? CN_NUM[m[1]] : 1) * 10 + (m[2] ? CN_NUM[m[2]] : 0);
    if (s.length === 1 && Object.prototype.hasOwnProperty.call(CN_NUM, s)) return CN_NUM[s];
    return NaN;
  }
  function cnDateText(t) {
    return String(t || '').replace(/([〇零一二三四五六七八九十两]{1,3})\s*(月|日|号|点|时|分)/g,
      function (m, cn, unit) {
        var n = cnToNum(cn);
        return isNaN(n) ? m : String(n) + unit;
      });
  }

  /* ---------- 日期解析 ---------- */
  function mkDate(y, m, d) {
    var ds = Number(y) + '-' + pad2(Number(m)) + '-' + pad2(Number(d));
    return isValidDate(ds) ? ds : '';
  }
  function addMonthsY(y, m, delta) {
    var k = (y * 12 + (m - 1)) + delta;
    return { y: Math.floor(k / 12), m: (k % 12 + 12) % 12 + 1 };
  }
  var WD_INDEX = { '一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6, '天': 6 };
  function mondayOf(ds) {
    var wd = (weekdayOf(ds) + 6) % 7;   // 周一 = 0
    return addDays(ds, -wd);
  }

  function parseDatePart(text, p) {
    var today = nowToday();
    var y0 = Number(today.slice(0, 4));
    var m0 = Number(today.slice(5, 7));
    var d0 = Number(today.slice(8, 10));

    // ① 完整年月日：2026-11-08 / 2026/11/08
    var m = /(\d{4})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})/.exec(text);
    if (m) {
      var ds = mkDate(m[1], m[2], m[3]);
      if (ds) { p.dates = [ds]; p.dateExplicit = true; return; }
    }

    // ② 月日：11 月 8 日 / 11月8号（年份按「最近的将来」推断）
    m = /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/.exec(text);
    if (m) {
      var y = y0;
      var cand = mkDate(y, m[1], m[2]);
      if (cand && cand < addDays(today, -120)) cand = mkDate(y + 1, m[1], m[2]);
      if (cand) { p.dates = [cand]; p.dateExplicit = true; return; }
    }

    // ③ 斜杠 / 连字符短日期：11/8、11-8（后面跟「点」时视为时间范围，跳过）
    m = /(\d{1,2})\s*[\/-]\s*(\d{1,2})(?!\s*[点时:])(?![\d])/.exec(text);
    if (m) {
      var c2 = mkDate(y0, m[1], m[2]);
      if (c2 && c2 < addDays(today, -120)) c2 = mkDate(y0 + 1, m[1], m[2]);
      if (c2) { p.dates = [c2]; p.dateExplicit = true; return; }
    }

    // ④ 相对日期
    var relative = '';
    if (/大后天/.test(text)) relative = 3;
    else if (/后天/.test(text)) relative = 2;
    else if (/明天|明日|明儿|明晚/.test(text)) relative = 1;
    else if (/今天|今日|今儿|今晚/.test(text)) relative = 0;
    else if (/昨天|昨日/.test(text)) relative = -1;
    else if (/前天/.test(text)) relative = -2;
    if (relative !== '' && typeof relative === 'number') {
      p.dates = [addDays(today, relative)];
      p.dateExplicit = true;
      return;
    }

    // ⑤ 星期 / 周末 / 下周
    m = /(下下|下|本|这)?\s*(?:周|星期|礼拜)\s*([一二三四五六日天末])/.exec(text);
    if (m) {
      var prefix = m[1] || '';
      var off = prefix === '下' ? 1 : (prefix === '下下' ? 2 : 0);
      var monday = mondayOf(today);
      if (m[2] === '末') {
        var sat = addDays(monday, off * 7 + 5);
        var sun = addDays(sat, 1);
        if (!prefix && sun < today) { sat = addDays(sat, 7); sun = addDays(sat, 1); }
        p.dates = [sat, sun];
        p.dateLabel = (prefix === '下' ? '下周末' : '周末');
      } else {
        var target = addDays(monday, off * 7 + WD_INDEX[m[2]]);
        if (!prefix && target < today) target = addDays(target, 7);   // 未指明本周/下周时取最近的将来
        p.dates = [target];
        p.dateLabel = prefix + '周' + m[2];
      }
      p.dateExplicit = true;
      return;
    }

    // ⑥ 整周：这周 / 本周 / 下周
    m = /(下下|下|本|这)\s*(?:周|星期|礼拜)(?![一二三四五六日天末])/.exec(text);
    if (m) {
      var off2 = m[1] === '下' ? 1 : (m[1] === '下下' ? 2 : 0);
      var mon2 = addDays(mondayOf(today), off2 * 7);
      var list = [];
      for (var i = 0; i < 7; i++) list.push(addDays(mon2, i));
      p.dates = list;
      p.dateLabel = m[1] + '周';
      p.dateExplicit = true;
      return;
    }

    // ⑦ 只有「X 日 / X 号」（排除「3号厅」这类影厅）
    var re = /(\d{1,2})\s*[日号]/g, mm;
    while ((mm = re.exec(text))) {
      var after = text.slice(mm.index + mm[0].length, mm.index + mm[0].length + 2);
      if (/^(厅|影厅)/.test(after)) continue;
      var cy = y0, cm = m0;
      var day = Number(mm[1]);
      if (day > d0) { /* 本月未到 */ }
      else if (day < d0) { var nx = addMonthsY(y0, m0, 1); cy = nx.y; cm = nx.m; }  // 默认取最近的将来
      var cd = mkDate(cy, cm, day);
      if (cd) { p.dates = [cd]; p.dateExplicit = true; return; }
    }

    // ⑧ 只有月份：11 月 / 本月 / 下个月
    m = /(\d{1,2})\s*月(?!\s*[日号\d])/.exec(text);
    if (m) {
      p.monthOnly = { y: y0, m: Number(m[1]) };
      return;
    }
    if (/下个月|下月/.test(text)) { p.monthOnly = addMonthsY(y0, m0, 1); return; }
    if (/上个月|上月/.test(text)) { p.monthOnly = addMonthsY(y0, m0, -1); return; }
    if (/这个月|本月/.test(text)) { p.monthOnly = { y: y0, m: m0 }; }
  }

  /* ---------- 时间解析 ---------- */
  function normHour(h, text) {
    if (isNaN(h)) return NaN;
    var pm = /下午|傍晚|晚上|晚间|今晚|明晚|夜里|夜场/.test(text);
    var am = /上午|早上|早晨|清晨|中午早上/.test(text);
    if (am && h === 12) return 0;
    if (pm && h < 12) return h + 12;
    if (!am && !pm && h >= 1 && h <= 9) return h + 12;   // 没说上午/下午的 1–9 点，按晚间场理解
    return h;
  }
  function parseTimePart(text, p) {
    var lo = null, hi = null, label = '';

    // HH:MM - HH:MM
    var m = /(\d{1,2}):(\d{2})\s*(?:到|至|-|—|~|～)\s*(\d{1,2}):(\d{2})/.exec(text);
    if (m) {
      lo = normHour(+m[1], text) * 60 + +m[2];
      hi = normHour(+m[3], text) * 60 + +m[4];
    }
    // X 点到 Y 点
    if (lo === null) {
      m = /(\d{1,2})\s*[点时](?:\s*(\d{1,2})\s*分?)?\s*(?:到|至|-|—|~|～)\s*(\d{1,2})\s*[点时]/.exec(text);
      if (m) {
        lo = normHour(+m[1], text) * 60 + (m[2] ? +m[2] : 0);
        hi = normHour(+m[3], text) * 60;
      }
    }
    // X 点以后 / 之前
    if (lo === null) {
      var after = /(\d{1,2})\s*[点时](?:\s*(\d{1,2})\s*分)?\s*(?:以后|之后|后|起|开始)/.exec(text);
      if (after) {
        lo = normHour(+after[1], text) * 60 + (after[2] ? +after[2] : 0);
        hi = 24 * 60;
      }
    }
    if (lo === null) {
      var before = /(\d{1,2})\s*[点时](?:\s*(\d{1,2})\s*分)?\s*(?:以前|之前|前)/.exec(text);
      if (before) {
        lo = 0;
        hi = normHour(+before[1], text) * 60 + (before[2] ? +before[2] : 0);
      }
    }
    // 单独一小时：「7 点」= 19:00 起 90 分钟内
    if (lo === null) {
      var single = /(\d{1,2})\s*[点时]\s*(半|(\d{1,2})\s*分?)?/.exec(text);
      if (single) {
        var hh = normHour(+single[1], text);
        var mm2 = single[2] === '半' ? 30 : (single[3] ? +single[3] : 0);
        lo = hh * 60 + mm2;
        hi = lo + 90;
      }
    }
    // 时段词兜底
    if (lo === null) {
      if (/晚上|晚间|夜里|今晚|明晚|夜场/.test(text)) { lo = 18 * 60; hi = 24 * 60; }
      else if (/中午/.test(text)) { lo = 11 * 60; hi = 14 * 60; }
      else if (/下午|午后/.test(text)) { lo = 12 * 60; hi = 18 * 60; }
      else if (/傍晚/.test(text)) { lo = 17 * 60; hi = 19 * 60 + 30; }
      else if (/上午|早上|早晨|清晨/.test(text)) { lo = 0; hi = 12 * 60; }
    }
    if (lo !== null) {
      if (hi <= lo) hi = Math.min(24 * 60, lo + 90);
      label = hm(lo) + (hi >= 24 * 60 ? ' 以后' : '–' + hm(hi));
      p.hours = { lo: lo, hi: hi };
      p.hourLabel = label;
    }
  }

  /* ---------- 场馆 / 影厅 / 制式 / 活动 / 统计 ---------- */
  function parseFilters(text, p) {
    if (/江南|苏州/.test(text)) p.venue = '江南分馆影院';
    else if (/小西天/.test(text)) p.venue = '小西天艺术影院';
    else if (/百子湾/.test(text)) p.venue = '百子湾艺术影院';
    else if (/北京/.test(text)) p.venue = 'bj';

    var hallM = /(\d{1,2}|[一二三四五六七八九十])\s*号?\s*(厅|影厅)/.exec(text);
    if (hallM) p.hall = cnToNum(hallM[1]) + '号厅';
    else if (/多功能厅/.test(text)) p.hall = '多功能厅';

    if (/4k/i.test(text)) p.formats.push('4K');
    if (/imax/i.test(text)) p.formats.push('IMAX');
    if (/\b3d\b|3d/i.test(text)) p.formats.push('3D');
    if (/hfr/i.test(text)) p.formats.push('HFR');
    if (/杜比|atmos|dolby/i.test(text)) p.formats.push('杜比');

    if (/映后交流/.test(text)) p.event = '映后交流';
    else if (/映后对谈|对谈/.test(text)) p.event = '映后对谈';
    else if (/映前导赏|导赏/.test(text)) p.event = '映前导赏';
    else if (/映后/.test(text)) p.event = '映后';
    else if (/映前/.test(text)) p.event = '映前';
    else if (/活动场|有活动|活动/.test(text)) p.event = '活动';

    if (/最便宜|最低价|最划算|便宜点|便宜/.test(text)) p.stat = 'cheapest';
    else if (/最贵|最高价/.test(text)) p.stat = 'priciest';
    else if (/几部|多少部|哪些片|哪些影片|几部片/.test(text)) p.stat = 'films';
    else if (/几场|多少场|一共|总共|总数|场次总数/.test(text)) p.stat = 'count';
    else if (/票价|价格|多少钱/.test(text)) p.stat = 'price';

    if (/上座率|空座|余票|座位|卖出|售出|满座|空位|卖掉/.test(text)) p.seat = true;
  }

  /* ---------- 片名识别（字典 + 引用） ---------- */
  function filmKeysOf(name) {
    var out = [];
    String(name || '').split(/[｜|/／·•—–:：]+/).forEach(function (seg) {
      var n = normKey(seg);
      if (n.length >= 2 && out.indexOf(n) < 0) out.push(n);
    });
    var whole = normKey(name);
    if (whole && out.indexOf(whole) < 0) out.push(whole);
    return out;
  }
  function filmDictionary() {
    var out = [], seen = {};
    function add(name) {
      var n = normKey(name);
      if (!n || seen[n]) return;
      seen[n] = 1;
      out.push(String(name));
    }
    Object.keys(window.DOUBAN_MAP || {}).forEach(function (k) { add(k.split('|')[0]); });
    Object.keys(window.PRICES || {}).forEach(function (k) {
      var parts = k.split('|');
      add(parts[parts.length - 1]);
    });
    Object.keys(state.cache || {}).forEach(function (key) {
      var c = state.cache[key];
      Object.keys((c && c.days) || {}).forEach(function (d) {
        (c.days[d] || []).forEach(function (r) {
          add(nameOf(r));
          var en = (r.movieInfo || {}).englishName;
          if (en) add(en);
        });
      });
    });
    return out;
  }
  function detectFilm(text) {
    var t = normKey(text);
    if (!t) return '';
    var best = '', bestLen = 0;
    filmDictionary().forEach(function (name) {
      filmKeysOf(name).forEach(function (n) {
        if (n.length < 2) return;
        if (t.indexOf(n) >= 0 && n.length > bestLen) { best = name; bestLen = n.length; }
      });
    });
    return best;
  }

  /* ---------- 总解析 ---------- */
  function parseQuery(raw) {
    var q = normalizeQuote(raw);
    var text = stripTitles(q);
    text = cnDateText(text);

    var p = {
      raw: q, text: text, quoted: '', film: '', dates: [], dateExplicit: false,
      dateLabel: '', monthOnly: null, venue: '', hall: '', hours: null, hourLabel: '',
      formats: [], event: '', stat: '', seat: false, filmAsk: false
    };

    var m = /《([^》]{1,60})》/.exec(q) || /「([^」]{1,60})」/.exec(q) ||
            /“([^”]{1,60})”/.exec(q) || /"([^"]{1,60})"/.exec(q);
    if (m) p.quoted = m[1].trim();

    parseDatePart(text, p);
    parseTimePart(text, p);
    parseFilters(text, p);

    if (p.quoted) {
      p.film = p.quoted;
      p.filmAsk = true;
    } else {
      var dict = detectFilm(text);
      if (dict) { p.film = dict; p.filmAsk = true; }
    }

    // 只问「有没有映后交流 / 活动场」但没给日期时，默认看未来 7 天，避免只答今天而错过活动
    if (p.event && !p.dates.length && !p.monthOnly) {
      var upcoming = [];
      for (var k = 0; k < 7; k++) upcoming.push(addDays(nowToday(), k));
      p.dates = upcoming;
    }

    // 只说了「什么时候放」但没识别到片名：仍按影片检索，用后续相似度兜底
    var cue = /什么时候|哪天|哪一天|放吗|放映|上映|场次|排了吗|有这部|这部片/.test(text);
    if (!p.filmAsk && cue && !p.dates.length && !p.monthOnly && !p.venue && !p.hall &&
        !p.hours && !p.formats.length && !p.event && !p.stat) {
      p.filmAsk = true;
    }
    return p;
  }

  /* ---------- 按需加载（复用 app.js 的计数 / 存档 / 明细链路） ---------- */
  function ensureMonth(key) {
    var y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7));
    var c = monthCache(y, m);
    var tasks = [];
    if (!c.amountFetched) tasks.push(ensureAmount(y, m));
    // 官网只发布当月与下月；更远的月份不会有存档，跳过请求以免产生无意义的 404
    var t = nowToday(), ny = Number(t.slice(0, 4)), nm = Number(t.slice(5, 7));
    var nx = addMonthsY(ny, nm, 1);
    if (key <= nx.y + '-' + pad2(nx.m)) {
      tasks.push(loadArchive(key).then(function (arch) {
        if (arch && arch.length) mergeArchive(c, arch);   // 存档补回已放映场次，并补齐存档里的票价
      }));
    }
    return Promise.all(tasks).then(function () { return c; });
  }

  /** 把接口明细并入某天，保留已有的存档记录（同「时刻|影院|影厅」去重，只增不减） */
  function mergeIntoDay(c, d, recs) {
    var list = c.days[d] || (c.days[d] = []);
    var seen = {};
    list.forEach(function (r) { seen[recKeyOf(r)] = 1; });
    (recs || []).forEach(function (r) {
      var k = recKeyOf(r);
      if (!k || seen[k]) return;
      seen[k] = 1;
      list.push(r);
    });
  }

  function fetchOneDay(ds) {
    var c = cacheOf(ds);
    if (!c) return Promise.resolve(false);
    var y = Number(ds.slice(0, 4)), m = Number(ds.slice(5, 7)), d = Number(ds.slice(8, 10));
    return fetchDay(y, m, d).then(function (j) {
      var recs = (j && j.data && j.data.records) ? j.data.records : [];
      mergeIntoDay(c, d, recs);
      c.aDays = c.aDays || {};
      c.aDays[ds] = 1;
      return true;
    })['catch'](function () { return false; });
  }

  function runQueue(items, limit, worker, onStep) {
    return new Promise(function (resolve) {
      if (!items.length) { resolve(); return; }
      var idx = 0, active = 0, done = 0;
      function next() {
        while (active < limit && idx < items.length) {
          (function (item) {
            active++;
            Promise.resolve(worker(item))['catch'](function () {})
              .then(function () {
                active--; done++;
                if (onStep) onStep(done, items.length);
                if (idx >= items.length && active === 0) resolve();
                else next();
              });
          })(items[idx++]);
        }
      }
      next();
    });
  }

  /**
   * 按需加载若干日期。过去日期只读存档（接口已剔除），今天及以后按需拉接口明细。
   * meta.failed 为接口失败天数，meta.archive 记录各月是否有存档文件。
   */
  function loadDates(dates, onProgress) {
    var byMonth = {}, keys = [];
    dates.forEach(function (ds) {
      if (!isValidDate(ds)) return;
      var k = ds.slice(0, 7);
      if (!byMonth[k]) { byMonth[k] = []; keys.push(k); }
      if (byMonth[k].indexOf(ds) < 0) byMonth[k].push(ds);
    });
    var meta = { failed: 0, total: 0, apiDays: 0, archive: {} };

    return Promise.all(keys.map(function (k) {
      return ensureMonth(k).then(function () {
        meta.archive[k] = !!(state.archives[k] && state.archives[k].length);
      });
    })).then(function () {
      mergeExtras();
      var queue = [];
      keys.forEach(function (k) {
        var c = state.cache[k];
        if (!c || c.done) return;                 // 已由主页面整月加载，直接复用
        byMonth[k].forEach(function (ds) {
          if (c.aDays && c.aDays[ds]) return;      // 本次会话已拉过
          if (ds < nowToday()) return;             // 过去日期只信存档
          queue.push(ds);
        });
      });
      meta.total = queue.length;
      if (queue.length && onProgress) onProgress(0, queue.length);
      return runQueue(queue, LOAD_LIMIT, function (ds) {
        return fetchOneDay(ds).then(function (ok) {
          meta.apiDays++;
          if (!ok) meta.failed++;
        });
      }, function (done, total) {
        if (onProgress) onProgress(done, total);
      });
    }).then(function () {
      mergeExtras();
      return meta;
    });
  }

  /** 读某天全部记录（接口 + 存档 + 补充场次，按时间/影院/影厅排序） */
  function readDay(ds) {
    var c = cacheOf(ds);
    if (!c) return [];
    var d = Number(ds.slice(8, 10));
    var list = (c.days[d] || []).filter(function (r) {
      return String(r.playTime || '').slice(0, 10) === ds;
    });
    return sortRecs(list);
  }

  function sortRecs(list) {
    return list.slice().sort(function (a, b) {
      if (a.playTime !== b.playTime) return a.playTime < b.playTime ? -1 : 1;
      var va = (typeof venueRank === 'function' ? venueRank(a.cinemaInfo) : 0);
      var vb = (typeof venueRank === 'function' ? venueRank(b.cinemaInfo) : 0);
      if (va !== vb) return va - vb;
      return (hallRank(a.movieHall) - hallRank(b.movieHall));
    });
  }

  /** 某月需要覆盖的日期：接口场次计数 + 存档/补充场次已有日期 */
  function monthScanDates(key) {
    var c = state.cache[key];
    var seen = {};
    mergeExtras();
    Object.keys((c && c.amount) || {}).forEach(function (ds) {
      if (Number(c.amount[ds]) > 0) seen[ds] = 1;
    });
    Object.keys((c && c.days) || {}).forEach(function (d) {
      seen[key + '-' + pad2(Number(d))] = 1;
    });
    return Object.keys(seen).sort();
  }

  /** 扫描若干整月（当月+下月），用于「某部片什么时候放」这类问题 */
  function scanMonths(keys, onProgress) {
    return Promise.all(keys.map(ensureMonth)).then(function () {
      mergeExtras();
      var dates = [];
      keys.forEach(function (k) {
        monthScanDates(k).forEach(function (ds) {
          if (dates.indexOf(ds) < 0) dates.push(ds);
        });
      });
      return loadDates(dates, onProgress);
    });
  }

  /* ---------- 记录上的制式 / 活动 / 票价 ---------- */
  function formatTextOf(r) {
    var node = (r.node || []).join(' ');
    var note = String((r.movieInfo || {}).note || '');
    return (node + ' ' + note).toUpperCase();
  }
  function hasFormat(r, f) {
    var txt = formatTextOf(r);
    if (f === '4K') return /4K/.test(txt);
    if (f === 'IMAX') return /IMAX/.test(txt);
    if (f === '3D') return /3D/.test(txt);
    if (f === 'HFR') return /HFR/.test(txt);
    if (f === '杜比') return /杜比|ATMOS|DOLBY/.test(txt);
    return false;
  }
  /** 片名后的制式小标签（与主列表口径一致：node + 备注开头） */
  function formatChips(r) {
    var out = [];
    (r.node || []).forEach(function (x) {
      var t = String(x || '').trim();
      if (t && /^(4K|IMAX|3D|HFR|杜比全景声|杜比|ATMOS)$/i.test(t) &&
          out.map(function (v) { return v.toUpperCase(); }).indexOf(t.toUpperCase()) < 0) out.push(t);
    });
    var note = String((r.movieInfo || {}).note || '').trim();
    if (note) {
      var parts = note.split(/\s*(?:·|｜|\||，|,|；|;)\s*/);
      var FORMAT = /^(4K|IMAX|3D|HFR|杜比全景声|杜比|ATMOS)$/i;
      while (parts.length && FORMAT.test(String(parts[0]).trim())) {
        var t2 = String(parts.shift()).trim();
        if (out.map(function (v) { return v.toUpperCase(); }).indexOf(t2.toUpperCase()) < 0) out.push(t2);
      }
    }
    return out;
  }
  function evTypeOf(r) {
    var ev = (typeof planEventOf === 'function') ? planEventOf(r) : null;
    if (ev && ev.type) return ev.type;
    var note = String((r.movieInfo || {}).note || '');
    if (/映后交流/.test(note)) return '映后交流';
    if (/映后对谈/.test(note)) return '映后对谈';
    if (/映前导赏|导赏/.test(note)) return '映前导赏';
    if (/映后/.test(note)) return '映后活动';
    if (/映前/.test(note)) return '映前活动';
    return '';
  }
  function eventMatches(r, want) {
    var t = evTypeOf(r);
    if (!t) return false;
    if (want === '活动') return true;
    if (want === '映后') return /映后/.test(t);
    if (want === '映前') return /映前/.test(t);
    return t.indexOf(want) >= 0;
  }
  function priceOfRec(r) {
    var p = (typeof priceOf === 'function') ? priceOf(r) : null;
    if (!p) return null;
    return { min: Number(p.min), max: Number(p.max) || Number(p.min), note: p.note || '' };
  }
  function priceText(p) {
    if (!p) return '票价未知';
    return p.max > p.min ? '¥' + p.min + '–' + p.max : '¥' + p.min;
  }

  /* ---------- 条件过滤 / 片名匹配 ---------- */
  function filterRecs(list, p) {
    return list.filter(function (r) {
      if (p.venue === 'bj') {
        if (r.cinemaInfo === '江南分馆影院') return false;
      } else if (p.venue && r.cinemaInfo !== p.venue) {
        return false;
      }
      if (p.hall) {
        var h = String(r.movieHall || '');
        if (p.hall === '多功能厅') {
          if (!/多功能/.test(h)) return false;
        } else {
          var no = (h.match(/\d+/) || [''])[0];
          if (String(Number(p.hall.replace('号厅', ''))) !== no) return false;
        }
      }
      if (p.hours) {
        var t = minsOfText(timeOf(r));
        if (t < p.hours.lo || t >= p.hours.hi) return false;
      }
      if (p.formats.length && !p.formats.every(function (f) { return hasFormat(r, f); })) return false;
      if (p.event && !eventMatches(r, p.event)) return false;
      return true;
    });
  }

  function matchFilm(r, target) {
    var qk = normKey(target);
    if (!qk) return false;
    var keys = filmKeysOf(nameOf(r));
    var en = normKey((r.movieInfo || {}).englishName || '');
    if (en.length >= 3) keys.push(en);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!k) continue;
      if (k === qk || k.indexOf(qk) >= 0 || qk.indexOf(k) >= 0) return true;
    }
    if (similarity(target, nameOf(r)) >= 0.8) return true;
    if (en && similarity(target, (r.movieInfo || {}).englishName) >= 0.8) return true;
    return false;
  }

  /** 片名候选：bigram 相似度之外，再看汉字重合度（应对「上海的女儿」这类多字/少字） */
  function charScore(a, b) {
    var A = normKey(a).replace(/[^0-9A-Za-z\u4e00-\u9fa5]/g, '').split('');
    var B = normKey(b).replace(/[^0-9A-Za-z\u4e00-\u9fa5]/g, '').split('');
    if (!A.length || !B.length) return 0;
    var set = {}, used = {}, hit = 0;
    A.forEach(function (c) { set[c] = 1; });
    B.forEach(function (c) { if (set[c] && !used[c]) { used[c] = 1; hit++; } });
    return hit / Math.max(A.length, B.length);
  }

  function filmCandidates(target, names) {
    var out = [];
    var seen = {};
    names.forEach(function (n) {
      if (!n || seen[normKey(n)]) return;
      seen[normKey(n)] = 1;
      var score = Math.max(similarity(target, n), charScore(target, n));
      filmKeysOf(n).forEach(function (seg) {
        score = Math.max(score, similarity(target, seg), charScore(target, seg));
      });
      if (score >= 0.5) out.push({ name: n, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 5);
  }

  /* ---------- 回答渲染 ---------- */
  function filterText(p) {
    var bits = [];
    if (p.venue) bits.push(p.venue === 'bj' ? '北京两家' : venueShortOf(p.venue));
    if (p.hall) bits.push(p.hall);
    if (p.hourLabel) bits.push(p.hourLabel);
    if (p.formats.length) bits.push(p.formats.join(' + '));
    if (p.event) bits.push(p.event);
    return bits.join(' · ');
  }
  function rangeText(dates) {
    if (!dates.length) return '';
    var a = dates[0], b = dates[dates.length - 1];
    if (dates.length === 1) {
      return (a === nowToday() ? '今天 · ' : '') + dayFull(a);
    }
    return mdText(a) + ' – ' + mdText(b) + '（' + dates.length + ' 天）';
  }

  function card(title, sub, body, foot) {
    return '<div class="assist-card">' +
      '<div class="assist-card-head">' +
        '<span class="assist-card-title">' + esc(title) + '</span>' +
        (sub ? '<span class="assist-card-sub">' + esc(sub) + '</span>' : '') +
      '</div>' + body +
      (foot ? '<p class="assist-foot">' + foot + '</p>' : '') +
      '</div>';
  }

  function chipsHtml(r) {
    var chips = formatChips(r).map(function (t) { return '<i class="ar-chip">' + esc(t) + '</i>'; });
    var ev = evTypeOf(r);
    if (ev) chips.push('<i class="ar-chip ar-chip-ev">' + esc(ev) + '</i>');
    if (r.extra) chips.push('<i class="ar-chip ar-chip-extra">补充</i>');
    return chips.length ? '<span class="ar-chips">' + chips.join('') + '</span>' : '';
  }

  function rowHtml(r) {
    var p = priceOfRec(r);
    return '<button type="button" class="assist-row' + (r.archived ? ' is-past' : '') + '" ' +
      'data-ds="' + esc(String(r.playTime).slice(0, 10)) + '" data-t="' + esc(timeOf(r)) + '" ' +
      'data-n="' + esc(nameOf(r)) + '" title="在主列表中定位这一场">' +
      '<span class="ar-time">' + esc(timeOf(r)) + '</span>' +
      '<span class="ar-body">' +
        '<span class="ar-title">' + esc(nameOf(r)) + chipsHtml(r) + '</span>' +
        '<span class="ar-meta">' + esc(venueShortOf(r.cinemaInfo)) + ' · ' +
          esc(String(r.movieHall || '未标注影厅')) + '</span>' +
      '</span>' +
      '<span class="ar-right"><span class="ar-price' + (p ? '' : ' is-unknown') + '">' +
        priceText(p) + '</span>' + (r.archived ? '<span class="ar-state">已放映</span>' : '') +
      '</span>' +
      '</button>';
  }

  function rowsHtml(list, limit) {
    var shown = limit ? list.slice(0, limit) : list;
    var groups = {}, order = [];
    shown.forEach(function (r) {
      var ds = String(r.playTime).slice(0, 10);
      if (!groups[ds]) { groups[ds] = []; order.push(ds); }
      groups[ds].push(r);
    });
    order.sort();
    var html = order.map(function (ds) {
      var g = groups[ds];
      return '<div class="assist-group">' +
        '<div class="assist-day"><span>' + esc(mdText(ds) + ' ' + weekText(ds)) + '</span>' +
        '<span class="assist-day-n">' + g.length + ' 场</span></div>' +
        g.map(rowHtml).join('') +
        '</div>';
    }).join('');
    if (list.length > shown.length) {
      html += '<p class="assist-more">共 ' + list.length + ' 场，这里列出前 ' + shown.length +
        ' 场。要更精确可以加影院、影厅或时间段。</p>';
    }
    return html;
  }

  function dataFoot(meta, dates) {
    var bits = [];
    if (meta && meta.failed) bits.push(meta.failed + ' 天接口请求失败，结果可能不完整');
    if (dates && dates.some(function (ds) { return ds < nowToday(); })) bits.push('已放映场次来自站内存档');
    return bits.length ? '<span class="assist-data">' + esc(bits.join(' · ')) + '</span>' : '';
  }

  function suggestButtons(cands) {
    return '<div class="assist-suggests">' + cands.map(function (c) {
      return '<button type="button" class="assist-suggest" data-q="' +
        esc('《' + c.name + '》什么时候放') + '">《' + esc(c.name) + '》</button>';
    }).join('') + '</div>';
  }

  function emptyDayCard(ds, meta) {
    var body = '<p class="assist-empty">没查到 ' + esc(dayFull(ds)) + ' 的排片。' +
      '可能是当天未排片，或已经放映且站内没有存档。可以换个说法，或直接看下面的列表。</p>';
    if (meta && meta.failed) {
      body += '<p class="assist-empty">另外有 ' + meta.failed + ' 天的接口请求失败，也可能是暂时没取到。</p>';
    }
    var c = cacheOf(ds);
    if (c && c.amount) {
      var fw = Object.keys(c.amount).filter(function (k) {
        return k > ds && Number(c.amount[k]) > 0;
      }).sort().slice(0, 3);
      if (fw.length) {
        body += '<p class="assist-hint">最近有排片的日期：</p><div class="assist-suggests">' +
          fw.map(function (k) {
            return '<button type="button" class="assist-suggest" data-q="' +
              esc(mdText(k) + '有什么') + '">' + esc(mdText(k)) + '</button>';
          }).join('') + '</div>';
      }
    }
    return card(rangeText([ds]), '没查到', body);
  }

  function helpCard() {
    var body = '<p class="assist-empty">没查到，可以换个说法，或直接看下方列表。' +
      '我只回答站内排片数据能算出来的事，不编造场次、时间、厅号或票价。</p>' +
      '<p class="assist-hint">可以这样问：</p><div class="assist-suggests">' +
      ['今天有什么', '明天江南晚上 7 点后', '《上海女儿》什么时候放', '3号厅今天有什么',
       '这周有几部片', '最便宜的一场', '下周有映后交流的场次吗'].map(function (q) {
        return '<button type="button" class="assist-suggest" data-q="' + esc(q) + '">' + esc(q) + '</button>';
      }).join('') + '</div>';
    return card('排片问答', '仅基于站内数据', body);
  }

  /* ---------- 列表类回答 ---------- */
  function listAnswer(list, p, dates, meta) {
    var filtered = filterRecs(list, p);
    var base = filterRecs(list, { venue: p.venue, hall: p.hall, formats: [], event: '', hours: null });
    var sub = filterText(p);
    if (!filtered.length) {
      if (!list.length) return emptyDayCard(dates[0] || nowToday(), meta);
      var body = '<p class="assist-empty">' + esc(rangeText(dates)) + ' 共有 ' + list.length +
        ' 场，但没有符合「' + esc(sub || '当前条件') + '」的场次。可以去掉一个条件再问，或直接看列表。</p>';
      if (base.length) {
        var times = base.map(timeOf).sort();
        var who = p.venue === 'bj' ? '北京两家 ' : (p.venue ? esc(venueShortOf((base[0] || {}).cinemaInfo)) + ' ' : '');
        body += '<p class="assist-hint">不加这段筛选时：' + who +
          '共 ' + base.length + ' 场，最早 ' + esc(times[0]) + '，最晚 ' + esc(times[times.length - 1]) + '。</p>';
      }
      return card(rangeText(dates), sub || '没有匹配', body);
    }
    var body2 = rowsHtml(filtered, MAX_ROWS);
    return card(rangeText(dates), sub ? sub + ' · 共 ' + filtered.length + ' 场' : '共 ' + filtered.length + ' 场',
      body2, dataFoot(meta, dates));
  }

  /* ---------- 统计类回答 ---------- */
  function uniqueFilms(list) {
    var map = {}, out = [];
    list.forEach(function (r) {
      var n = nameOf(r);
      var k = normName(n);
      if (!k || map[k]) return;
      map[k] = 1;
      out.push(n);
    });
    return out;
  }
  function statAnswer(list, p, dates, meta) {
    var filtered = filterRecs(list, p);
    var head = rangeText(dates);
    var sub = filterText(p);
    if (!filtered.length) {
      if (!list.length) return emptyDayCard(dates[0] || nowToday(), meta);
      return card(head, sub || '没有匹配',
        '<p class="assist-empty">' + esc(head) + ' 共 ' + list.length +
        ' 场，但没有符合「' + esc(sub) + '」的场次，所以算不出统计。可以去掉一个条件再问。</p>');
    }

    if (p.stat === 'count' || p.stat === 'films') {
      var films = uniqueFilms(filtered);
      var bj = 0, jn = 0;
      filtered.forEach(function (r) { if (r.cinemaInfo === '江南分馆影院') jn++; else bj++; });
      var priced = filtered.map(priceOfRec).filter(Boolean);
      var body = '<p class="assist-summary">共 <b>' + filtered.length + '</b> 场 · <b>' +
        films.length + '</b> 部影片 · 小西天/百子湾 ' + bj + ' 场、江南分馆 ' + jn + ' 场。</p>';
      if (priced.length) {
        var lo = Math.min.apply(null, priced.map(function (x) { return x.min; }));
        var hi = Math.max.apply(null, priced.map(function (x) { return x.max; }));
        body += '<p class="assist-summary">已登记票价 ¥' + lo + '–' + hi + '；' +
          (filtered.length - priced.length) + ' 场票价未知。</p>';
      } else {
        body += '<p class="assist-summary">这些场次都没有登记票价（unknown），不猜测价格。</p>';
      }
      if (p.stat === 'films') {
        body += '<p class="assist-hint">影片：' + films.slice(0, 24).map(function (n) {
          return '《' + esc(n) + '》';
        }).join('　') + (films.length > 24 ? ' 等' : '') + '</p>';
      } else {
        body += rowsHtml(filtered, MAX_ROWS);
      }
      return card(head, sub || '场次统计', body, dataFoot(meta, dates));
    }

    if (p.stat === 'cheapest' || p.stat === 'priciest') {
      var rows = filtered.map(function (r) { return { r: r, p: priceOfRec(r) }; })
        .filter(function (x) { return !!x.p; });
      if (!rows.length) {
        return card(head, sub || '票价未知',
          '<p class="assist-empty">这些场次都没有登记票价（站内标记为 unknown）。票价不猜测，' +
          '可以直接看卡片有没有价签，或以官方购票页为准。</p>', dataFoot(meta, dates));
      }
      rows.sort(function (a, b) {
        var d = p.stat === 'cheapest' ? (a.p.min - b.p.min) : (b.p.min - a.p.min);
        return d || (a.r.playTime < b.r.playTime ? -1 : 1);
      });
      var best = rows[0];
      var tieRows = rows.filter(function (x) { return x.p.min === best.p.min && x.p.max === best.p.max; });
      var ties = tieRows.slice(0, 4);
      return card(head, (p.stat === 'cheapest' ? '最便宜' : '最贵') + '的一场 · ' + priceText(best.p),
        '<p class="assist-summary">' + (p.stat === 'cheapest' ? '最低价' : '最高价') + '为 <b>' +
        esc(priceText(best.p)) + '</b>，共 ' + tieRows.length + ' 场同价。</p>' +
        rowsHtml(ties.map(function (x) { return x.r; }), 4),
        dataFoot(meta, dates));
    }

    // 票价类
    var all = filtered.map(priceOfRec);
    var known = all.filter(Boolean);
    if (!known.length) {
      return card(head, sub || '票价未知',
        '<p class="assist-empty">' + esc(head) + ' 这些场次都没有登记票价（unknown）。' +
        '站内不编造价格，实际以官方购票页为准。</p>', dataFoot(meta, dates));
    }
    var lo2 = Math.min.apply(null, known.map(function (x) { return x.min; }));
    var hi2 = Math.max.apply(null, known.map(function (x) { return x.max; }));
    var body2 = '<p class="assist-summary">已登记票价 <b>¥' + lo2 + (hi2 > lo2 ? '–' + hi2 : '') + '</b>' +
      '；' + (filtered.length - known.length) + ' 场票价未知。同一场多价档会显示区间。</p>' +
      rowsHtml(filtered, MAX_ROWS);
    return card(head, sub || '票价', body2, dataFoot(meta, dates));
  }

  /* ---------- 默认日期 / 范围 ---------- */
  function resolveDates(p) {
    if (p.dates.length) return Promise.resolve({ dates: p.dates, fallback: false });
    var today = nowToday();
    return ensureMonth(today.slice(0, 7)).then(function () {
      return loadDates([today], null).then(function () {
        if (readDay(today).length) return { dates: [today], fallback: false };
        return nextScreeningDate(today).then(function (next) {
          if (!next) return { dates: [today], fallback: false, none: true };
          return loadDates([next], null).then(function () {
            return { dates: [next], fallback: true, from: today };
          });
        })['catch'](function () {
          return { dates: [today], fallback: false, none: true };
        });
      });
    });
  }

  function progressWriter(pending, base) {
    return function (done, total) {
      setPending(pending, base + '（' + done + '/' + total + ' 天）…');
    };
  }

  function answerByScope(p, pending) {
    return resolveDates(p).then(function (scope) {
      setPending(pending, '正在加载 ' + rangeText(scope.dates) + ' 排片…');
      return loadDates(scope.dates, progressWriter(pending, '正在加载 ' + rangeText(scope.dates) + ' 排片')).then(function (meta) {
        var list = [];
        scope.dates.forEach(function (ds) {
          readDay(ds).forEach(function (r) { list.push(r); });
        });
        var html = p.stat ? statAnswer(list, p, scope.dates, meta)
                          : listAnswer(list, p, scope.dates, meta);
        if (scope.fallback) {
          html = '<p class="assist-note-inline">今天没有排片，已按最近有排片的 ' +
            esc(dayFull(scope.dates[0])) + ' 回答。</p>' + html;
        }
        return html;
      });
    });
  }

  /* ---------- 影片检索 ---------- */
  function cleanFilmQuery(text) {
    return String(text || '')
      .replace(/请|帮我|查一下|查询|一下|想问|想看|什么时候|哪天|哪一天|放映|上映|放吗|排了吗|有没有|场次|的场|在放|放|呢|吗|？|\?/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function filmMonthKeys(p) {
    var out = [];
    if (p.dates.length) {
      p.dates.forEach(function (ds) {
        var k = ds.slice(0, 7);
        if (out.indexOf(k) < 0) out.push(k);
      });
      return out;
    }
    if (p.monthOnly) return [p.monthOnly.y + '-' + pad2(p.monthOnly.m)];
    var t = nowToday();
    var y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
    out.push(y + '-' + pad2(m));
    var nx = addMonthsY(y, m, 1);
    out.push(nx.y + '-' + pad2(nx.m));
    return out;
  }
  function monthLabelOf(keys) {
    return keys.map(function (k) {
      return Number(k.slice(0, 4)) + ' 年 ' + Number(k.slice(5, 7)) + ' 月';
    }).join('、');
  }

  function answerFilm(p, pending) {
    var keys = filmMonthKeys(p);
    var label = monthLabelOf(keys);
    setPending(pending, '正在检索 ' + label + ' 排片…');
    return scanMonths(keys, progressWriter(pending, '正在检索 ' + label + ' 排片')).then(function (meta) {
      var dates = [];
      keys.forEach(function (k) {
        monthScanDates(k).forEach(function (ds) {
          if (dates.indexOf(ds) < 0) dates.push(ds);
        });
      });
      var scopeDates = p.dates.length ? dates.filter(function (ds) { return p.dates.indexOf(ds) >= 0; }) : dates;
      var allList = [], scopeList = [];
      dates.forEach(function (ds) {
        readDay(ds).forEach(function (r) {
          allList.push(r);
          if (!p.dates.length || p.dates.indexOf(ds) >= 0) scopeList.push(r);
        });
      });

      var target = p.film || cleanFilmQuery(p.text);
      var matchedAll = allList.filter(function (r) { return matchFilm(r, target); });
      var filtered = filterRecs(scopeList.filter(function (r) { return matchFilm(r, target); }), p);
      var foot = dataFoot(meta, dates);

      if (filtered.length) {
        return card('《' + target + '》的场次',
          (filterText(p) ? filterText(p) + ' · ' : '') + '共 ' + filtered.length + ' 场',
          rowsHtml(filtered, MAX_ROWS), foot);
      }

      if (p.dates.length && matchedAll.length) {
        var others = filterRecs(matchedAll, p);
        if (others.length) {
          return card('《' + target + '》的场次',
            '你问的日期没有 · ' + label + ' 内共 ' + others.length + ' 场',
            '<p class="assist-note-inline">' + esc(rangeText(p.dates)) +
            ' 没查到《' + esc(target) + '》的场次，下面是检索范围内的全部场次。</p>' +
            rowsHtml(others, MAX_ROWS), foot);
        }
      }

      var names = uniqueFilms(allList);
      var cands = filmCandidates(target, names);
      if (cands.length) {
        return card('没查到《' + target + '》', '检索范围：' + label,
          '<p class="assist-empty">在' + esc(label) + '里没查到《' + esc(target) +
          '》。最相近的片名是：</p>' + suggestButtons(cands) +
          '<p class="assist-hint">点一下候选会重新检索；都不对的话，可以加上映月份，或直接看列表。</p>', foot);
      }
      return card('没查到《' + target + '》', '检索范围：' + label,
        '<p class="assist-empty">没查到，可以换个说法或直接看列表。' +
        '我只读站内已发布的排片（当月与下月）和存档，没出现过的片名不会编造场次。</p>', foot);
    });
  }

  /* ---------- 整月概览 ---------- */
  function answerMonth(p, pending) {
    var y = p.monthOnly.y, m = p.monthOnly.m;
    var key = y + '-' + pad2(m);
    setPending(pending, '正在读取 ' + y + ' 年 ' + m + ' 月的场次计数…');
    return ensureMonth(key).then(function (c) {
      var days = [];
      Object.keys(c.amount || {}).forEach(function (ds) {
        if (Number(c.amount[ds]) > 0) days.push(ds);
      });
      var total = days.reduce(function (sum, ds) { return sum + Number(c.amount[ds] || 0); }, 0);
      var body = '<p class="assist-summary">接口显示 ' + y + ' 年 ' + m + ' 月共有 <b>' +
        days.length + '</b> 天排片、约 <b>' + total + '</b> 场。</p>' +
        '<p class="assist-empty">问答不会为了一个月把每天的明细全部拉一遍。' +
        '要看整月请切到页面上的「按月查看」；也可以直接问我某一天，例如「' +
        esc(mdText(days[0] || (key + '-01')) + '有什么') + '」。</p>';
      if (p.stat) {
        body += '<p class="assist-hint">统计类问题请带具体日期或「这周」，例如「今天一共几场」「这周有几部片」。</p>';
      }
      return card(y + ' 年 ' + m + ' 月', '仅场次计数', body);
    });
  }

  function seatCard() {
    return card('上座率需要登录查看', '问答不查询座位',
      '<p class="assist-empty">问答只读排片数据，不查询、不猜测座位和余票。' +
      '要看上座率，请点场次卡片右侧的「上座率」按钮，用你自己的资料馆 APP 账号登录后查询。' +
      '连场第二场会共用前一场的座位图，按钮上会注明。</p>');
  }

  /* ---------- 面板与交互 ---------- */
  var panel = null, assistBtn = null, logEl = null, inputEl = null, formEl = null;
  var busy = false, HISTORY = [];

  function setPending(el, text) {
    if (!el) return;
    var t = el.querySelector('.assist-pending-text');
    if (t) t.textContent = text;
    logScroll();
  }
  function logScroll() {
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }
  function appendUser(text) {
    var el = document.createElement('div');
    el.className = 'assist-msg is-user';
    var b = document.createElement('div');
    b.className = 'assist-bubble';
    b.textContent = text;
    el.appendChild(b);
    logEl.appendChild(el);
    logScroll();
    return el;
  }
  function appendBot(html) {
    var el = document.createElement('div');
    el.className = 'assist-msg is-bot';
    el.innerHTML = html;
    logEl.appendChild(el);
    logScroll();
    return el;
  }
  function appendPending(text) {
    var el = document.createElement('div');
    el.className = 'assist-msg is-bot';
    el.innerHTML = '<div class="assist-card is-pending">' +
      '<span class="assist-spinner" aria-hidden="true"></span>' +
      '<span class="assist-pending-text"></span></div>';
    el.querySelector('.assist-pending-text').textContent = text;
    logEl.appendChild(el);
    logScroll();
    return el;
  }
  function fillPending(el, html) {
    if (!el) return;
    el.innerHTML = html;
    logScroll();
  }
  function remember(q, html) {
    HISTORY.push({ q: q, a: html });
    if (HISTORY.length > HISTORY_MAX) HISTORY = HISTORY.slice(-HISTORY_MAX);
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(HISTORY)); } catch (e) { /* 隐私模式下忽略 */ }
  }
  function restoreHistory() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      arr.forEach(function (item) {
        if (!item || !item.q || !item.a) return;
        appendUser(item.q);
        appendBot(item.a);
        HISTORY.push({ q: item.q, a: item.a });
      });
      logScroll();
    } catch (e) { HISTORY = []; }
  }

  var EXAMPLES = ['今天有什么', '明天江南晚上 7 点后有什么 4K', '《上海女儿》什么时候放',
    '3号厅今天有什么', '这周有几部片', '最便宜的一场', '有映后交流的场次吗'];
  function examplesHtml() {
    return '<div class="assist-suggests">' + EXAMPLES.map(function (q) {
      return '<button type="button" class="assist-suggest" data-q="' + esc(q) + '">' + esc(q) + '</button>';
    }).join('') + '</div>';
  }
  function welcomeHtml() {
    return card('想问什么？', '本地规则问答 · 不联网、不接大模型',
      '<p class="assist-empty">我只根据站内排片数据回答：某天 / 某影院 / 某影厅 / 某部片 / 时间段 / ' +
      '制式 / 活动 / 统计。算不出来会直说，不编造场次、时间、厅号或票价；上座率需要登录查看。</p>' +
      '<p class="assist-hint">可以直接照着问：</p>' + examplesHtml());
  }

  function preferReduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function jumpToRecord(ds, t, name) {
    if (!isValidDate(ds)) return;
    var switched = !(state.scope === 'day' && state.day === ds);
    if (switched) {
      state.scope = 'day';
      state.dayFallbackFrom = '';
      state.dayArchiveOnly = false;
      state.anchorFrom = '';
      state.anchorPending = false;
      state.keepScrollY = -1;
      setDay(ds);
      Array.prototype.forEach.call(document.querySelectorAll('#scopeSwitch .tab'), function (tab) {
        tab.classList.toggle('is-active', tab.getAttribute('data-scope') === 'day');
      });
      if (typeof renderMonthLabel === 'function') renderMonthLabel();
      if (typeof load === 'function') load(false);
    }
    try {
      if (window.matchMedia('(max-width: 760px)').matches) closePanel(false);
    } catch (e) { /* 忽略 */ }
    pollScroll(ds, t, name, 0);
  }

  function pollScroll(ds, t, name, attempt) {
    var group = document.getElementById('day-' + ds);
    if (!group) {
      if (attempt < 80) setTimeout(function () { pollScroll(ds, t, name, attempt + 1); }, 150);
      return;
    }
    var target = null;
    var films = group.querySelectorAll('article.film');
    for (var i = 0; i < films.length; i++) {
      var pill = films[i].querySelector('.time-pill');
      var title = films[i].querySelector('.film-title');
      if (!pill || !title) continue;
      if (pill.textContent.trim() === t) {
        if (title.textContent.indexOf(name) >= 0) { target = films[i]; break; }
        if (!target) target = films[i];
      }
    }
    if (!target) target = group;
    var top = target.getBoundingClientRect().top + (window.pageYOffset || 0) - 88;
    try {
      window.scrollTo({ top: Math.max(0, top), behavior: preferReduced() ? 'auto' : 'smooth' });
    } catch (e) {
      window.scrollTo(0, Math.max(0, top));
    }
    target.classList.add('assist-hit');
    setTimeout(function () { target.classList.remove('assist-hit'); }, 2600);
  }

  function ask(q) {
    var text = String(q == null ? '' : q).trim();
    if (!text || !logEl) return;
    if (busy) {
      appendBot(card('稍等', '上一条还在检索', '<p class="assist-empty">上一条问题还在加载排片，' +
        '完成后会自动出结果。稍等一下再问，或者直接看列表。</p>'));
      return;
    }
    if (/^(你好|hi|hello|在吗|帮助|help|怎么用|能问什么|可以问什么)[.!！。?？]*$/i.test(text)) {
      appendUser(text);
      var w = welcomeHtml();
      appendBot(w);
      remember(text, w);
      return;
    }

    appendUser(text);
    inputEl.value = '';

    var p;
    try { p = parseQuery(text); } catch (e) { p = null; }
    if (!p) {
      var h0 = helpCard();
      appendBot(h0);
      remember(text, h0);
      return;
    }
    if (p.seat) {
      var hs = seatCard();
      appendBot(hs);
      remember(text, hs);
      return;
    }

    busy = true;
    var pending = appendPending('正在查…');
    var task;
    if (p.filmAsk) task = answerFilm(p, pending);
    else if (p.monthOnly && !p.dates.length) task = answerMonth(p, pending);
    else task = answerByScope(p, pending);

    task.then(function (html) {
      busy = false;
      fillPending(pending, html);
      remember(text, html);
    })['catch'](function (err) {
      busy = false;
      var msg = '<p class="assist-empty">这次没取到排片数据。可以稍后再试，或者直接看下方列表。' +
        (err && err.message ? '<br><span class="assist-data">' + esc(err.message) + '</span>' : '') + '</p>';
      var h = card('没查到', '加载出错', msg);
      fillPending(pending, h);
      remember(text, h);
      logScroll();
    });
  }

  function openPanel() {
    if (!panel || !panel.hidden) return;
    panel.hidden = false;
    document.body.classList.add('assist-open');
    assistBtn.setAttribute('aria-expanded', 'true');
    if (!logEl.children.length) appendBot(welcomeHtml());
    logScroll();
    setTimeout(function () { try { inputEl.focus(); } catch (e) { /* 忽略 */ } }, 30);
  }
  function closePanel(focusBack) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.body.classList.remove('assist-open');
    assistBtn.setAttribute('aria-expanded', 'false');
    if (focusBack) assistBtn.focus();
  }

  function init() {
    panel = document.getElementById('assistPanel');
    assistBtn = document.getElementById('assistBtn');
    logEl = document.getElementById('assistLog');
    inputEl = document.getElementById('assistInput');
    formEl = document.getElementById('assistForm');
    var closeBtn = document.getElementById('assistClose');
    if (!panel || !assistBtn || !logEl || !inputEl || !formEl) return;
    if (!window.state || typeof ensureAmount !== 'function') return;

    assistBtn.addEventListener('click', function () {
      if (panel.hidden) openPanel(); else closePanel(true);
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { closePanel(true); });

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      ask(inputEl.value);
    });

    // 显式处理 Enter：避免个别输入法/浏览器不触发表单默认提交；输入法拼字中的 Enter 不提交
    inputEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      if (formEl.requestSubmit) formEl.requestSubmit();
      else formEl.dispatchEvent(new Event('submit', { cancelable: true }));
    });

    logEl.addEventListener('click', function (e) {
      var sug = e.target.closest ? e.target.closest('.assist-suggest') : null;
      if (sug && sug.getAttribute('data-q')) { ask(sug.getAttribute('data-q')); return; }
      var row = e.target.closest ? e.target.closest('.assist-row') : null;
      if (row) jumpToRecord(row.getAttribute('data-ds'), row.getAttribute('data-t'), row.getAttribute('data-n'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || panel.hidden) return;
      if (!panel.contains(document.activeElement)) return;
      e.preventDefault();
      e.stopPropagation();
      closePanel(true);
    }, true);

    restoreHistory();
    if (!logEl.children.length) appendBot(welcomeHtml());
  }

  // 供本地调试 / 自测：解析结果与控制台快速提问（不影响正常使用）
  window.CFA_ASSIST_DEBUG = { parse: parseQuery, ask: ask };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
