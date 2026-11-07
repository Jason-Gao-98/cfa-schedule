'use strict';

/* =========================================================
 * 中国电影资料馆 · 月度排片查询
 * 数据来自资料馆官网放映日历所调用的公开接口
 * ========================================================= */

var API = 'https://api.guoyingjiaying.cn/api/web';
var DETAIL_PAGE = 'https://www.cfa.org.cn/eportal/ui?pageId=6bbec57b81114a378be9f08c356c4136&movieId=';

/* ---------- MD5（RFC 1321 实现，已用标准向量校验） ---------- */
function md5(str) {
  function safeAdd(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function rotl(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function cmn(q, a, b, x, s, t) { return safeAdd(rotl(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  var bytes = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else if (c < 55296 || c >= 57344) bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
    else {
      i++;
      var cp = 65536 + (((c & 1023) << 10) | (str.charCodeAt(i) & 1023));
      bytes.push(240 | (cp >> 18), 128 | ((cp >> 12) & 63), 128 | ((cp >> 6) & 63), 128 | (cp & 63));
    }
  }
  var len = bytes.length, bitLen = len * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  var hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
  for (var j = 0; j < 4; j++) bytes.push((lo >>> (j * 8)) & 0xFF);
  for (var j2 = 0; j2 < 4; j2++) bytes.push((hi >>> (j2 * 8)) & 0xFF);

  var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (var off = 0; off < bytes.length; off += 64) {
    var x = [];
    for (var k = 0; k < 16; k++) {
      x[k] = bytes[off + k * 4] | (bytes[off + k * 4 + 1] << 8) |
             (bytes[off + k * 4 + 2] << 16) | (bytes[off + k * 4 + 3] << 24);
    }
    var oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[0], 7, -680876936);   d = ff(d, a, b, c, x[1], 12, -389564586);
    c = ff(c, d, a, b, x[2], 17, 606105819);    b = ff(b, c, d, a, x[3], 22, -1044525330);
    a = ff(a, b, c, d, x[4], 7, -176418897);    d = ff(d, a, b, c, x[5], 12, 1200080426);
    c = ff(c, d, a, b, x[6], 17, -1473231341);  b = ff(b, c, d, a, x[7], 22, -45705983);
    a = ff(a, b, c, d, x[8], 7, 1770035416);    d = ff(d, a, b, c, x[9], 12, -1958414417);
    c = ff(c, d, a, b, x[10], 17, -42063);      b = ff(b, c, d, a, x[11], 22, -1990404162);
    a = ff(a, b, c, d, x[12], 7, 1804603682);   d = ff(d, a, b, c, x[13], 12, -40341101);
    c = ff(c, d, a, b, x[14], 17, -1502002290); b = ff(b, c, d, a, x[15], 22, 1236535329);
    a = gg(a, b, c, d, x[1], 5, -165796510);    d = gg(d, a, b, c, x[6], 9, -1069501632);
    c = gg(c, d, a, b, x[11], 14, 643717713);   b = gg(b, c, d, a, x[0], 20, -373897302);
    a = gg(a, b, c, d, x[5], 5, -701558691);    d = gg(d, a, b, c, x[10], 9, 38016083);
    c = gg(c, d, a, b, x[15], 14, -660478335);  b = gg(b, c, d, a, x[4], 20, -405537848);
    a = gg(a, b, c, d, x[9], 5, 568446438);     d = gg(d, a, b, c, x[14], 9, -1019803690);
    c = gg(c, d, a, b, x[3], 14, -187363961);   b = gg(b, c, d, a, x[8], 20, 1163531501);
    a = gg(a, b, c, d, x[13], 5, -1444681467);  d = gg(d, a, b, c, x[2], 9, -51403784);
    c = gg(c, d, a, b, x[7], 14, 1735328473);   b = gg(b, c, d, a, x[12], 20, -1926607734);
    a = hh(a, b, c, d, x[5], 4, -378558);       d = hh(d, a, b, c, x[8], 11, -2022574463);
    c = hh(c, d, a, b, x[11], 16, 1839030562);  b = hh(b, c, d, a, x[14], 23, -35309556);
    a = hh(a, b, c, d, x[1], 4, -1530992060);   d = hh(d, a, b, c, x[4], 11, 1272893353);
    c = hh(c, d, a, b, x[7], 16, -155497632);   b = hh(b, c, d, a, x[10], 23, -1094730640);
    a = hh(a, b, c, d, x[13], 4, 681279174);    d = hh(d, a, b, c, x[0], 11, -358537222);
    c = hh(c, d, a, b, x[3], 16, -722521979);   b = hh(b, c, d, a, x[6], 23, 76029189);
    a = hh(a, b, c, d, x[9], 4, -640364487);    d = hh(d, a, b, c, x[12], 11, -421815835);
    c = hh(c, d, a, b, x[15], 16, 530742520);   b = hh(b, c, d, a, x[2], 23, -995338651);
    a = ii(a, b, c, d, x[0], 6, -198630844);    d = ii(d, a, b, c, x[7], 10, 1126891415);
    c = ii(c, d, a, b, x[14], 15, -1416354905); b = ii(b, c, d, a, x[5], 21, -57434055);
    a = ii(a, b, c, d, x[12], 6, 1700485571);   d = ii(d, a, b, c, x[3], 10, -1894986606);
    c = ii(c, d, a, b, x[10], 15, -1051523);    b = ii(b, c, d, a, x[1], 21, -2054922799);
    a = ii(a, b, c, d, x[8], 6, 1873313359);    d = ii(d, a, b, c, x[15], 10, -30611744);
    c = ii(c, d, a, b, x[6], 15, -1560198380);  b = ii(b, c, d, a, x[13], 21, 1309151649);
    a = ii(a, b, c, d, x[4], 6, -145523070);    d = ii(d, a, b, c, x[11], 10, -1120210379);
    c = ii(c, d, a, b, x[2], 15, 718787259);    b = ii(b, c, d, a, x[9], 21, -343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }
  function hex(n) {
    var s = '';
    for (var i = 0; i < 4; i++) {
      var v = (n >>> (i * 8)) & 0xFF;
      s += (v < 16 ? '0' : '') + v.toString(16);
    }
    return s;
  }
  return hex(a) + hex(b) + hex(c) + hex(d);
}

/* ---------- 会话：token + 服务器时钟偏移 ---------- */
var session = { token: '', at: 0, offset: 0 };

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function formBody(obj) {
  var p = new URLSearchParams();
  Object.keys(obj).forEach(function (k) { p.append(k, obj[k]); });
  return p.toString();
}

function post(path, data) {
  return fetch(API + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody(data)
  }).then(function (r) {
    // 用服务器 Date 头校准本机时钟（签名时间戳必须接近服务器时间）
    var dh = r.headers.get('Date');
    if (dh) {
      var parsed = Date.parse(dh);
      if (!isNaN(parsed)) session.offset = parsed - Date.now();
    }
    return r.json();
  });
}

function serverNow() { return Date.now() + session.offset; }

/** 获取并缓存签名 token（token 不随时间戳变化，可复用） */
function ensureToken(force) {
  var age = Date.now() - session.at;
  if (!force && session.token && age < 80000) return Promise.resolve(session.token);
  return post('getkey', { t: serverNow() }).then(function (j) {
    if (j && j.data && j.data.token) {
      session.token = j.data.token;
      session.at = Date.now();
    }
    return session.token;
  });
}

/** 拉取某月每日场次数（签名失效时自动刷新 token 重试一次） */
function fetchAmount(year, month) {
  return ensureToken().then(function (token) {
    var y = String(year), m = pad2(month);
    var t = serverNow();
    var signer = md5(y + m + t + token);
    return post('arrangementAmount', { year: y, month: m, t: t, signer: signer })
      .then(function (json) {
        if (json && json.status && json.status !== 200) {
          // 签名校验不通过：刷新 token 后重试一次，仍失败则抛出走错误分支
          return ensureToken(true).then(function (tk) {
            var t2 = serverNow();
            var sg2 = md5(y + m + t2 + tk);
            return post('arrangementAmount', { year: y, month: m, t: t2, signer: sg2 });
          }).then(function (json2) {
            if (json2 && json2.status && json2.status !== 200) {
              throw new Error(json2.msg || '排片接口返回异常');
            }
            return json2;
          });
        }
        return json;
      });
  });
}

/** 拉取某日排片明细 */
function fetchDay(year, month, day) {
  return ensureToken().then(function (token) {
    var y = String(year), m = pad2(month), d = pad2(day);
    var t = serverNow();
    var signer = md5(y + m + d + t + token);
    return post('arrangementPage', {
      year: y, month: m, day: d, cinema: 'all', t: t, signer: signer
    }).then(function (json) {
      // 签名失效（token 过期 / 时钟异常）时刷新 token 重试一次
      var bad = json && json.status !== 200;
      if (bad) {
        return ensureToken(true).then(function (tk) {
          var t2 = serverNow();
          var sg2 = md5(y + m + d + t2 + tk);
          return post('arrangementPage', {
            year: y, month: m, day: d, cinema: 'all', t: t2, signer: sg2
          });
        });
      }
      return json;
    });
  });
}

/* ---------- 时间基准：Asia/Shanghai ----------
 * 站点面向北京/苏州两地影院，统一按 UTC+8 判断“今天”。
 * 直接 new Date() 取的是本机时区（可能在别的时区），或部署在 UTC 机器上
 * 时会在北京时间 00:00–08:00 之间把“今天”算成昨天，因此统一做偏移换算。
 */
function cstNow() {
  var d = new Date();
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 8 * 3600000);
}
/** Date -> 'YYYY-MM-DD'（以传入 Date 的本地字段为准，配合 cstNow 即为北京时间日期） */
function dateStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function todayStr() { return dateStr(cstNow()); }

/** 'YYYY-MM-DD' 是否合法日期（排除 2026-02-31 这类越界值） */
function isValidDate(ds) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return false;
  var p = ds.split('-');
  var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return dt.getUTCFullYear() === Number(p[0]) &&
         dt.getUTCMonth() === Number(p[1]) - 1 &&
         dt.getUTCDate() === Number(p[2]);
}

/** 'YYYY-MM-DD' 加减天数（用 UTC 计算，规避夏令时/时区影响） */
function addDays(ds, n) {
  var p = ds.split('-');
  var dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate());
}

/** 'YYYY-MM-DD' 对应的星期索引（0=周日） */
function weekdayOf(ds) {
  var p = ds.split('-');
  return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]))).getUTCDay();
}

/* ---------- 状态 ---------- */
var state = {
  scope: 'day',       // 'day'=当日排片（默认） | 'all'=全部排片（跨月） | 'month'=单月
  day: '',            // 当日的 'YYYY-MM-DD'（scope=day 时使用）
  year: cstNow().getFullYear(),
  month: cstNow().getMonth() + 1,
  venue: 'all',
  query: '',
  cache: {},          // "2026-11" -> { amount:{}, days:{1:[..]}, done:bool }
  archives: {},       // "2026-11" -> 存档记录数组 | null（null=无存档）
  loadedDays: 0,
  totalDays: 0,
  allEmpty: false,
  dayFallbackFrom: '', // 当天无场次时自动跳转的来源日期（用于提示）
  dayArchiveOnly: false, // 接口失败、仅存档可用时的提示标记
  dayArchived: 0,       // 当日从存档补入的已放映场次数
  anchorPending: false, // 切换进「全部排片」后，等渲染完成再定位到今天
  anchorFrom: '',       // 「全部排片」里今天无场次时，实际定位到的最近前向日期（用于提示）
  keepScrollY: -1       // 切到「按月查看」时记住当前滚动位置，渲染后原样恢复（不做跳转）
};

var VENUES = ['小西天艺术影院', '百子湾艺术影院', '江南分馆影院'];
var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function cacheKey() { return state.year + '-' + pad2(state.month); }

function monthCache(y, m) {
  var k = y + '-' + pad2(m);
  if (!state.cache[k]) state.cache[k] = { amount: {}, days: {}, done: false };
  return state.cache[k];
}

function getCache() { return monthCache(state.year, state.month); }

/** 切换当前日期，并同步年月（供月份视图/存档键使用） */
function setDay(ds) {
  state.day = ds;
  state.year = Number(ds.slice(0, 4));
  state.month = Number(ds.slice(5, 7));
}

/** 当天日期文本：「11 月 3 日 周一」 */
function dayTextOf(ds) {
  return Number(ds.slice(5, 7)) + ' 月 ' + Number(ds.slice(8, 10)) + ' 日 ' + WEEK[weekdayOf(ds)];
}

/** 简短日期文本：「11 月 3 日」（用于提示文案，不带星期） */
function mdTextOf(ds) {
  return Number(ds.slice(5, 7)) + ' 月 ' + Number(ds.slice(8, 10)) + ' 日';
}

/** 是否偏好「减少动态效果」（滚动动画降级为瞬时跳转） */
function reducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { return false; }
}

function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

function matchVenue(cinema) {
  if (state.venue === 'all') return true;
  if (state.venue === 'jiangnan') return cinema === '江南分馆影院';
  return cinema === state.venue;
}

function matchQuery(film) {
  if (!state.query) return true;
  var q = state.query.toLowerCase();
  return (film.movieInfo.movieName || '').toLowerCase().indexOf(q) >= 0 ||
         (film.movieInfo.englishName || '').toLowerCase().indexOf(q) >= 0;
}

/**
 * 把站内手工补充场次（extra-schedule.js，来源：江南分馆公众号排片表）
 * 合并进已加载的接口数据。幂等：接口同日已有同片名或同开始时间的场次
 * 就跳过，官网日后上架这些场次也不会重复显示。
 */
function mergeExtras(cacheMap) {
  var list = window.EXTRA_SCHEDULE;
  if (!list || !list.length) return;
  var map = cacheMap || state.cache;
  list.forEach(function (e) {
    var cache = map[e.d.slice(0, 7)];   // 该月尚未加载时跳过，加载后自然合入
    if (!cache) return;
    var day = Number(e.d.slice(8, 10));
    var recs = cache.days[day];
    var name = String(e.title || '').toLowerCase();
    var stamp = e.d + ' ' + e.t;
    if (recs) {
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].cinemaInfo !== '江南分馆影院') continue;   // 去重只针对江南（补充场次均为江南）
        var mi = recs[i].movieInfo || {};
        if (String(mi.movieName || '').toLowerCase() === name) return;   // 已有同片名
        if (recs[i].playTime.slice(0, 16) === stamp) return;             // 已有同时刻
      }
    } else {
      recs = cache.days[day] = [];
    }
    recs.push({
      extra: true,
      cinemaInfo: '江南分馆影院',
      movieHall: e.hall,
      playTime: stamp + ':00',
      node: [],
      movieInfo: { movieName: e.title, movieTime: e.year, movieMinute: e.min, note: e.note || '' }
    });
  });
}

/**
 * 读取站内历史存档 archive/YYYY-MM.json（由 GitHub Actions 每日保存）。
 * 资料馆接口会剔除已放映的场次，存档用于把它们补回来。
 */
function loadArchive(key) {
  if (Object.prototype.hasOwnProperty.call(state.archives, key)) {
    return Promise.resolve(state.archives[key]);
  }
  return fetch('archive/' + key + '.json').then(function (r) {
    return r.ok ? r.json() : null;
  })['catch'](function () { return null; }).then(function (j) {
    var recs = (j && j.records) || null;
    state.archives[key] = recs;
    return recs;
  });
}

/** 当前时间戳（"YYYY-MM-DD HH:mm:ss"，与 playTime 同格式，可直接字符串比较） */
function nowStamp() {
  var d = cstNow();   // 用北京时间，避免本机/服务器时区把「已放映」判定错位
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
    ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

/**
 * 把存档记录并入缓存（接口已有同一时刻/影厅/影院的场次则跳过）。
 * 「已放映」按开始时间早于当前时刻判定；返回值为补入/标记的已放映场次数。
 */
function mergeArchive(cache, arch) {
  var added = 0;
  var nowStr = nowStamp();
  (arch || []).forEach(function (a) {
    if (!a || !a.playTime) return;
    var day = Number(a.playTime.slice(8, 10));
    var list = cache.days[day] || (cache.days[day] = []);
    var key = a.playTime + '|' + a.cinema + '|' + (a.hall || '');
    for (var i = 0; i < list.length; i++) {
      if (list[i].playTime + '|' + list[i].cinemaInfo + '|' + (list[i].movieHall || '') === key) {
        // 已存在（接口数据或先前并入的补充场次）：若确属过去的场次，补上「已放映」标记
        if (a.playTime < nowStr && !list[i].archived) { list[i].archived = true; added++; }
        // 接口不返回票价：把存档里已备份的票价补到列表记录（只补不覆盖）
        if (!(Number(list[i].price) > 0) && Number(a.price) > 0) {
          list[i].price = a.price;
          if (Number(a.priceMax) > 0) list[i].priceMax = a.priceMax;
          if (a.priceNote) list[i].priceNote = a.priceNote;
        }
        return;
      }
    }
    var past = a.playTime < nowStr;
    var rec = {
      archived: past,
      extra: !!a.extra,
      cinemaInfo: a.cinema,
      movieHall: a.hall || '',
      playTime: a.playTime,
      node: a.formats || [],
      movieId: a.movieId || '',
      movieInfo: {
        movieId: a.movieId || '',
        movieName: a.name || '',
        englishName: a.en || '',
        movieTime: a.year || '',
        movieMinute: a.min || 0,
        pictureBig: a.poster || '',
        note: a.note || ''
      }
    };
    if (Number(a.price) > 0) {
      rec.price = a.price;
      if (Number(a.priceMax) > 0) rec.priceMax = a.priceMax;
      if (a.priceNote) rec.priceNote = a.priceNote;
    }
    list.push(rec);
    if (past) added++;   // 仅统计已放映的场次（未来场次本就该在列表里，不算“补档”）
  });
  return added;
}

/** 收集当前筛选条件下、已加载的排片记录（day 模式仅当日；all 模式跨所有已加载月份） */
function visibleRecords() {
  mergeExtras();
  var out = [];
  var caches;
  if (state.scope === 'day') {
    var k = (state.day || todayStr()).slice(0, 7);
    caches = state.cache[k] ? [state.cache[k]] : [];
  } else if (state.scope === 'month') {
    caches = [getCache()];
  } else {
    caches = Object.keys(state.cache).sort().map(function (key) { return state.cache[key]; });
  }
  caches.forEach(function (cache) {
    Object.keys(cache.days).forEach(function (day) {
      cache.days[day].forEach(function (rec) {
        if (state.scope === 'day' && String(rec.playTime).slice(0, 10) !== state.day) return;
        if (matchVenue(rec.cinemaInfo) && matchQuery(rec)) out.push(rec);
      });
    });
  });
  out.sort(function (a, b) {
    if (a.playTime === b.playTime) return (a.movieHall || '').localeCompare(b.movieHall || '');
    return a.playTime < b.playTime ? -1 : 1;
  });
  return out;
}

/* ---------- 渲染 ---------- */
var $ = function (id) { return document.getElementById(id); };

function renderMonthLabel() {
  var isDay = state.scope === 'day';
  $('dayNavWrap').hidden = !isDay;

  if (isDay) {
    var ds = state.day || todayStr();
    var isToday = ds === todayStr();
    $('dayText').textContent = dayTextOf(ds) + (isToday ? ' · 今天' : '');
    $('backToday').hidden = isToday;
    $('monthNavWrap').hidden = true;
    $('calendarBlock').hidden = true;
    return;
  }

  if (state.scope === 'all') {
    // 全部排片模式没有月份切换：保留标题、隐藏左右箭头
    $('monthText').textContent = '全部排片';
    $('thisMonth').hidden = true;
    $('monthNavWrap').hidden = false;
    $('prevMonth').hidden = true;
    $('nextMonth').hidden = true;
    $('calendarBlock').hidden = true;
    return;
  }
  $('monthNavWrap').hidden = false;
  $('prevMonth').hidden = false;
  $('nextMonth').hidden = false;
  $('calendarBlock').hidden = false;
  $('monthText').textContent = state.year + ' 年 ' + state.month + ' 月';
  var now = cstNow();
  var isCurrent = state.year === now.getFullYear() && state.month === now.getMonth() + 1;
  $('thisMonth').hidden = isCurrent;
}

function renderStats(records) {
  // 场次统计基于已加载数据 + 当前筛选
  var bj = 0, jn = 0, total = 0;
  var films = {};
  records.forEach(function (r) {
    if (r.cinemaInfo === '江南分馆影院') jn++; else bj++;
    // 影片数按片名去重（movieId 每场唯一，不能用来数影片）
    var mi = r.movieInfo || {};
    var name = String(mi.movieName || mi.englishName || '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
    films[name || ('k:' + recKey(r))] = 1;
  });
  total = bj + jn;
  var chips = [
    '<span class="stat-chip gold"><b>' + total + '</b>场排片</span>',
    '<span class="stat-chip"><b>' + Object.keys(films).length + '</b>部影片</span>',
    '<span class="stat-chip bj"><b>' + bj + '</b>场 · 北京</span>',
    '<span class="stat-chip jn"><b>' + jn + '</b>场 · 江南</span>'
  ];
  if (state.updatedAt) {
    chips.push('<span class="stat-chip">数据更新于 ' + state.updatedAt + '</span>');
  }
  $('stats').innerHTML = chips.join('');
}

function renderNotice() {
  var el = $('notice');
  var now = cstNow();

  if (state.scope === 'day') {
    if (loading) { el.hidden = true; return; }
    // 当天无场次 → 已自动切到最近的前向日期
    if (state.dayFallbackFrom) {
      var fromTxt = state.dayFallbackFrom === todayStr() ? '今天' : mdTextOf(state.dayFallbackFrom);
      el.hidden = false;
      el.className = 'notice';
      el.textContent = fromTxt + '已无场次，已为你显示 ' + mdTextOf(state.day) + ' 的排片。';
      return;
    }
    if (state.dayArchiveOnly) {
      el.hidden = false;
      el.className = 'notice';
      el.textContent = '排片接口暂时不可用，以下为站内每日保存的存档数据。';
    } else if (state.dayArchived) {
      el.hidden = false;
      el.className = 'notice';
      el.textContent = '部分已放映场次来自站内每日自动保存的历史存档。';
    } else {
      el.hidden = true;
    }
    return;
  }

  if (state.scope === 'all') {
    var archShown = false;
    Object.keys(state.cache).forEach(function (k) { if (state.cache[k].archiveAdded) archShown = true; });
    if (state.anchorFrom && !loading) {
      // 今天在「全部排片」范围内无场次：已定位到最近的前向日期（只提示这一条）
      el.hidden = false;
      el.className = 'notice';
      el.textContent = '今天已无场次，已为你定位到 ' + mdTextOf(state.anchorFrom) + '。';
    } else if (state.allEmpty && !loading) {
      el.hidden = false;
      el.className = 'notice';
      el.textContent = '暂未查到未来排片。资料馆官方接口仅提供从今天起约两个月的排片，更早的已过期、更远的尚未发布。';
    } else if (archShown && !loading) {
      el.hidden = false;
      el.className = 'notice';
      el.textContent = '其中已放映的场次来自站内每日自动保存的历史存档。';
    } else {
      el.hidden = true;
    }
    return;
  }

  var cache = getCache();
  var total = 0;
  Object.keys(cache.amount).forEach(function (k) { total += Number(cache.amount[k]) || 0; });

  if (!cache.done) { el.hidden = true; return; }

  if (total === 0) {
    if (cache.archiveAdded) {   // 接口已无数据，当前显示全部来自站内存档
      el.hidden = false;
      el.className = 'notice';
      el.textContent = '该月排片已过接口可查期，以下为站内每日自动保存的历史存档（含已放映场次）。';
      return;
    }
    el.hidden = false;
    var thisYear = now.getFullYear(), thisMonth = now.getMonth() + 1;
    var cmp = state.year * 12 + state.month, cur = thisYear * 12 + thisMonth;
    if (cmp < cur) {
      el.className = 'notice warn';
      el.textContent = '该月排片已过期。资料馆官方接口仅提供近两个月的排片数据，历史月份无法查询。';
    } else if (cmp > cur + 2) {
      el.className = 'notice';
      el.textContent = '该月排片尚未发布。资料馆通常提前约两个月公布节目，届时请再来查询。';
    } else {
      el.className = 'notice';
      el.textContent = '该月暂未查到排片数据，可能尚未排定或已停售，请稍后再试。';
    }
    return;
  }
  if (cache.archiveAdded) {   // 接口有数据，但已放映的场次来自存档
    el.hidden = false;
    el.className = 'notice';
    el.textContent = '其中已放映的场次来自站内每日自动保存的历史存档。';
    return;
  }
  el.hidden = true;
}

function renderCalendar(records) {
  var cache = getCache();
  var y = state.year, m = state.month;
  var dim = daysInMonth(y, m);
  var firstWk = new Date(y, m - 1, 1).getDay();   // 0=周日
  var now = cstNow();
  var isThisMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
  var filtered = cache.done;   // 明细加载完成后按筛选条件显示场次

  // 每日可见场次数
  var perDay = {};
  if (filtered) {
    records.forEach(function (r) {
      var d = Number(r.playTime.slice(8, 10));
      perDay[d] = (perDay[d] || 0) + 1;
    });
  }

  var html = '<div class="cal-head">' +
    ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      .map(function (w) { return '<span>' + w + '</span>'; }).join('') +
    '</div>';

  // 周一为一周起点
  var lead = (firstWk + 6) % 7;
  for (var p = 0; p < lead; p++) html += '<div class="cal-cell pad"></div>';

  for (var d = 1; d <= dim; d++) {
    var dt = new Date(y, m - 1, d);
    var wkIdx = (dt.getDay() + 6) % 7;   // 0=周一
    var cnt = filtered ? (perDay[d] || 0) : (Number(cache.amount[pad2(y) + '-' + pad2(m) + '-' + pad2(d)]) || 0);
    var cls = 'cal-cell';
    if (cnt > 0) cls += ' has'; else cls += ' empty-day';
    if (isThisMonth && d === now.getDate()) cls += ' today';
    html += '<div class="' + cls + '" data-day="' + d + '">' +
              '<div><div class="cal-day">' + d + '</div>' +
              '<div class="cal-wk">' + ['一','二','三','四','五','六','日'][wkIdx] + '</div></div>' +
              '<span class="cal-count">' + (cnt > 0 ? cnt + ' 场' : '—') + '</span>' +
            '</div>';
  }
  $('calendar').innerHTML = html;

  Array.prototype.forEach.call($('calendar').querySelectorAll('.cal-cell.has'), function (cell) {
    cell.addEventListener('click', function () {
      var target = document.querySelector('.day-group[data-day="' + cell.dataset.day + '"]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else {
        var notice = $('notice');
        notice.hidden = false;
        notice.className = 'notice';
        notice.textContent = '该日无可显示的排片（可能不满足当前的影院或搜索条件）。';
      }
    });
  });
}

/* ---------- 日期速选小日历（仅「按月查看」） ----------
 * 滚过顶部日历区后浮现，固定在不与「观影计划」浮动按钮重叠的位置；
 * 数据直接取自已渲染的日期分组，因此与当前影院 / 搜索筛选保持一致。
 */
var miniCalOpen = !(window.matchMedia && window.matchMedia('(max-width:760px)').matches);

function setMiniCalOpen(open) {
  miniCalOpen = !!open;
  $('miniCalPanel').hidden = !miniCalOpen;
  $('miniCalToggle').setAttribute('aria-expanded', miniCalOpen ? 'true' : 'false');
  $('miniCalToggle').setAttribute('aria-label', miniCalOpen ? '收起日期速选小日历' : '打开日期速选小日历');
  if (miniCalOpen) renderMiniCal();
}

/** 已渲染日期分组（反映当前筛选），按 'YYYY-MM-DD' 索引 */
function miniCalDayMap() {
  var map = {};
  Array.prototype.forEach.call($('dayList').querySelectorAll('.day-group[id]'), function (g) {
    map[g.id.slice(4)] = true;
  });
  return map;
}

function renderMiniCal() {
  var y = state.year, m = state.month;
  $('mcTitle').textContent = y + ' 年 ' + m + ' 月';
  var dim = daysInMonth(y, m);
  var lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;   // 周一为起点
  var days = miniCalDayMap();
  var today = todayStr();
  var html = '';
  // 空白占位：不可见空格子，仅按星期偏移占位，不带边框/虚线/独立高度
  for (var p = 0; p < lead; p++) html += '<span class="mc-day mc-blank" aria-hidden="true"></span>';
  for (var d = 1; d <= dim; d++) {
    var ds = y + '-' + pad2(m) + '-' + pad2(d);
    var has = !!days[ds];
    var isToday = ds === today;
    html += '<button type="button" class="mc-day ' + (has ? 'mc-has' : 'mc-empty') + (isToday ? ' mc-today' : '') + '"' +
      ' data-day="' + ds + '"' + (has ? '' : ' disabled') +
      (isToday ? ' aria-current="date"' : '') +
      ' aria-label="' + m + ' 月 ' + d + ' 日' + (has ? '，有排片，点击定位' : '，无排片') + '">' + d + '</button>';
  }
  $('mcGrid').innerHTML = html;
}

/** 出现阈值：滚过顶部日历区底部（至少 300px），并补偿吸顶头部高度 */
function miniCalThreshold() {
  var block = $('calendarBlock');
  if (!block || block.hidden) return 300;
  var hd = document.querySelector('.site-header');
  var hh = hd ? hd.getBoundingClientRect().height : 0;
  var bottom = block.getBoundingClientRect().bottom + (window.pageYOffset || 0);
  return Math.max(300, bottom - hh);
}

function updateMiniCal() {
  var el = $('miniCal');
  var y = window.pageYOffset || document.documentElement.scrollTop || 0;
  var th = miniCalThreshold();
  // 已显示时用 40px 回滞，避免在阈值附近来回闪隐
  var show = state.scope === 'month' && !loading && (el.hidden ? y > th : y > th - 40);
  if (show === !el.hidden) return;
  el.hidden = !show;
  if (show) renderMiniCal();
}

$('miniCalToggle').addEventListener('click', function () {
  setMiniCalOpen(!miniCalOpen);
});
$('mcClose').addEventListener('click', function () {
  setMiniCalOpen(false);
  $('miniCalToggle').focus();
});
$('mcPrev').addEventListener('click', function () { goMonth(-1); });
$('mcNext').addEventListener('click', function () { goMonth(1); });
$('mcGrid').addEventListener('click', function (e) {
  var btn = e.target.closest('.mc-day.mc-has');
  if (!btn) return;
  var el = document.getElementById('day-' + btn.dataset.day);
  if (!el) { updateMiniCal(); return; }
  scrollDayIntoView(el);
  // 窄屏点选后收起，避免大面积遮挡列表
  if (window.matchMedia && window.matchMedia('(max-width:760px)').matches) setMiniCalOpen(false);
});
$('miniCal').addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && miniCalOpen) {
    setMiniCalOpen(false);
    $('miniCalToggle').focus();
  }
});
window.addEventListener('scroll', updateMiniCal, { passive: true });
window.addEventListener('resize', updateMiniCal);
setMiniCalOpen(miniCalOpen);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

/* ---------- 豆瓣关联（数据来自构建期生成的 douban-map.js，前端零请求） ----------
 * 豆瓣无 CORS 头、无法在浏览器里实时查询，因此由
 * scripts/build-douban-map.ps1 在构建期把 豆瓣ID/评分/海报 固化成
 * window.DOUBAN_MAP 静态表，前端查表即可。 */
var DOUBAN_MAP = window.DOUBAN_MAP || {};

/** 片名归一化：去掉全部空白 + 小写（与构建脚本保持一致） */
function normName(s) {
  return String(s == null ? '' : s).replace(/\s+/g, '').trim().toLowerCase();
}

/** 依据「片名 + 年份」查映射表；年份不中时回退「仅片名」兜底键 */
function doubanOf(mi) {
  var name = mi && mi.movieName;
  if (!name) return null;
  var nn = normName(name);
  var yr = String((mi && mi.movieTime) || '');
  return DOUBAN_MAP[nn + '|' + yr] || DOUBAN_MAP[nn] || null;
}

/** 豆瓣链接：命中精确条目跳 subject 详情页，否则退到豆瓣搜索页，保证每片都能关联 */
function doubanUrlOf(mi, db) {
  if (db && db.i) return 'https://movie.douban.com/subject/' + db.i + '/';
  var name = mi && mi.movieName;
  if (!name) return '';
  return 'https://search.douban.com/movie/subject_search?search_text=' + encodeURIComponent(name);
}

/** 高分阈值（含等于）：豆瓣评分 >= 8.5 走高分徽章，全站唯一判断点 */
var DOUBAN_HIGH = 8.5;

/** 豆瓣评分徽章 HTML（无评分返回空串；>= 8.5 用高分样式） */
function doubanPill(db) {
  if (!db || !db.r) return '';
  var v = parseFloat(db.r);
  if (!isNaN(v) && v >= DOUBAN_HIGH) {
    return '<span class="douban-pill high" title="豆瓣评分 ' + esc(db.r) + '，高分影片">' +
      '<span class="high-star">★</span>豆瓣 ' + esc(db.r) + '</span>';
  }
  return '<span class="douban-pill" title="豆瓣评分">豆瓣 ' + esc(db.r) + '</span>';
}

/* ---------- 票价（prices.js 由 scripts/price-ledger.json 生成；未登记 = unknown，不显示价签） ---------- */
var PRICE_MAP = window.PRICES || {};
var PRICE_NOTES = window.PRICE_NOTES || {};

/**
 * 查某场次票价。返回 {min,max,note} 或 null（null = 未知，绝不猜价）。
 * 顺序：① 记录自带 price 字段（每日快照已写入存档）→ ② 静态表逐级回退：
 * 日期|时间|影院|影厅|片名 → 日期|影院|影厅|片名 → 日期|影厅|片名 → 日期|片名。
 */
function priceOf(r) {
  if (Number(r.price) > 0) {
    var lo = Number(r.price);
    var hi = Number(r.priceMax) > 0 ? Number(r.priceMax) : lo;
    return { min: lo, max: hi, note: r.priceNote || '' };
  }
  var date = String(r.playTime || '').slice(0, 10);
  var time = String(r.playTime || '').slice(11, 16);
  var name = normName((r.movieInfo || {}).movieName);
  if (!date || !name) return null;
  var nCinema = normName(r.cinemaInfo), nHall = normName(r.movieHall);
  var cand = [
    [date, time, nCinema, nHall, name],
    [date, nCinema, nHall, name],
    [date, nHall, name],
    [date, name]
  ];
  for (var i = 0; i < cand.length; i++) {
    var k = cand[i].filter(function (x) { return !!x; }).join('|');
    var v = PRICE_MAP[k];
    if (v == null) continue;
    var lo2, hi2;
    if (Array.isArray(v)) { lo2 = Number(v[0]); hi2 = Number(v[1]); }
    else { lo2 = hi2 = Number(v); }
    if (!(lo2 > 0)) continue;
    return { min: lo2, max: hi2, note: PRICE_NOTES[k] || '' };
  }
  return null;
}

/** 票价价签：卡片右下角独立标识，单一票价「¥40」，区间「¥30–60」；未知（null）不渲染 */
function pricePill(r) {
  var p = priceOf(r);
  if (!p) return '';
  var amount = p.max > p.min
    ? '<span class="amt">' + p.min + '</span><span class="dash">–</span><span class="amt">' + p.max + '</span>'
    : '<span class="amt">' + p.min + '</span>';
  var tip = '票价' + (p.max > p.min
    ? '（' + p.min + '–' + p.max + ' 元，不同价档）'
    : '（' + p.min + ' 元）') + (p.note ? ' · ' + p.note : '');
  return '<span class="price-tag" title="' + esc(tip) + '"><span class="cur">¥</span>' + amount + '</span>';
}

/** 影院排序：小西天 → 百子湾 → 江南分馆 → 其他 */
function venueRank(name) {
  if (name === '小西天艺术影院') return 0;
  if (name === '百子湾艺术影院') return 1;
  if (name === '江南分馆影院') return 2;
  return 3;
}
function venueShortOf(name) {
  if (name === '江南分馆影院') return '江南分馆';
  if (name === '小西天艺术影院') return '小西天';
  if (name === '百子湾艺术影院') return '百子湾';
  return String(name || '未标注影院');
}
/** 厅号自然排序键：取厅名首个数字；无数字（多功能厅等）返回 9999 排最后 */
function hallRank(h) {
  var m = String(h || '').match(/\d+/);
  return m ? Number(m[0]) : 9999;
}

/** 构造影片海报区：优先本地缓存的豆瓣海报（构建期已下载，避开 ORB/防盗链），整体包裹为可点击跳转豆瓣 */
function posterBlock(mi, db, dbUrl) {
  var orig = mi.pictureBig ? mi.pictureBig.replace(/^http:/, 'https:') : '';
  var doub = (db && db.p) ? db.p : '';
  // 本地副本 assets/posters/<id>.jpg 存在时优先；失败逐级回退：豆瓣 CDN -> 资料馆
  var local = (db && db.i) ? ('assets/posters/' + db.i + '.jpg') : '';
  var primary = local || doub || orig;
  var fb = [];
  if (local && doub && doub !== local) fb.push(doub);
  if (primary && orig && orig !== primary) fb.push(orig);

  var inner;
  if (primary) {
    inner = '<img class="poster" src="' + esc(primary) + '" alt="' + esc(mi.movieName) + '" loading="lazy"' +
            (fb.length ? ' data-fb="' + esc(fb.join('|')) + '"' : '') + '>';
  } else {
    inner = '<div class="poster-ph">暂无海报</div>';
  }
  if (!dbUrl) return inner;
  var tip = (db && db.i) ? ('在豆瓣打开《' + mi.movieName + '》') : '在豆瓣搜索该片';
  return '<a class="poster-link" href="' + esc(dbUrl) + '" target="_blank" rel="noopener" title="' +
         esc(tip) + '">' + inner + '</a>';
}

function renderList(records) {
  seatRecs = records;
  if (!records.length) {
    // 加载中保持骨架屏，避免「先闪空列表再填充」的跳动
    if (loading) return;
    $('dayList').innerHTML = '<div class="empty"><span class="big">◎</span>' +
      (state.query ? '没有匹配「' + esc(state.query) + '」的排片。'
                   : (state.scope === 'day' ? '这一天没有排片记录。' : '当前条件下没有排片记录。')) + '</div>';
    return;
  }
  var groups = {};
  var order = [];
  records.forEach(function (r) {
    var date = r.playTime.slice(0, 10);
    if (!groups[date]) { groups[date] = []; order.push(date); }
    groups[date].push(r);
  });

  // data-i 指向 records 原数组下标，分组重排后仍能正确映射到上座率场次
  var idxOf = new Map();
  records.forEach(function (r, i) { idxOf.set(r, i); });

  var html = order.map(function (date) {
    var list = groups[date];
    var wk = WEEK[new Date(date.replace(/-/g, '/')).getDay()];
    var isToday = date === todayStr();
    var bjN = 0, jnN = 0;
    list.forEach(function (r) { if (r.cinemaInfo === '江南分馆影院') jnN++; else bjN++; });
    var badge = [];
    if (bjN) badge.push('北京 ' + bjN + ' 场');
    if (jnN) badge.push('江南 ' + jnN + ' 场');

    var renderFilm = function (r) {
      var myIdx = idxOf.get(r);
      var mi = r.movieInfo || {};
      var time = r.playTime.slice(11, 16);
      // 散场时间 = 开始 + 片长（推算，实际以现场为准）
      var dur = Number(mi.movieMinute) || 0;
      var endStr = '';
      if (dur > 0) {
        var endMin = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + dur;
        endStr = pad2(Math.floor(endMin / 60) % 24) + ':' + pad2(endMin % 60);
      }
      var isJn = r.cinemaInfo === '江南分馆影院';
      var venueShort = venueShortOf(r.cinemaInfo);
      var db = doubanOf(mi);                    // 豆瓣映射表命中项（可能为 null）
      var dbUrl = doubanUrlOf(mi, db);          // 豆瓣链接（精确条目 / 搜索兜底，可能为空）
      // 制式拆分：4K/IMAX/3D 等紧跟片名，其余（DCP 等）留在备注行，避免重复
      var fmtTokens = (r.node || []).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
      var titleFmt = fmtTokens.filter(function (t) { return /4K|IMAX|3D|HFR|杜比|ATMOS|Dolby/i.test(t); });
      var metaFmt = fmtTokens.filter(function (t) { return titleFmt.indexOf(t) < 0; });
      // 补充场次没有 node 字段，制式写在备注开头（如「4K · 映后交流」「4K · 连场…」），同样前移
      var noteText = String(mi.note || '').trim();
      var noteFmt = [];
      if (noteText) {
        var parts = noteText.split(/\s*(?:·|｜|\||，|,|；|;)\s*/);
        var FORMAT_WORD = /^(4K|IMAX|3D|HFR|杜比全景声|杜比|ATMOS)$/i;
        while (parts.length && FORMAT_WORD.test(String(parts[0]).trim())) {
          noteFmt.push(String(parts.shift()).trim());
        }
        if (noteFmt.length) noteText = parts.join(' · ');
      }
      titleFmt = titleFmt.concat(noteFmt).filter(function (t, i, arr) {
        return arr.map(function (x) { return x.toUpperCase(); }).indexOf(t.toUpperCase()) === i;
      });
      var nameUp = String(mi.movieName || '').toUpperCase();
      var fmtTags = titleFmt.filter(function (t) { return nameUp.indexOf(t.toUpperCase()) < 0; })
        .map(function (t) { return '<span class="fmt-title">' + esc(t) + '</span>'; }).join('');
      var link = DETAIL_PAGE + (mi.movieId || r.movieId || '');
      var isExtra = !!r.extra;   // 公众号 / 淘票票渠道补充场次（APP 未上架，无详情页）
      // 连场第二场虽为补充场次，但可用前一场的合并场次查座位图，因此同样给上座率入口
      var chainPrev = isChainRec(r) ? chainPrevOf(r, records) : null;

      var meta = [];
      if (mi.movieTime) meta.push(esc(mi.movieTime) + ' 年');
      if (mi.movieMinute) meta.push(esc(mi.movieMinute) + ' 分钟');
      if (metaFmt.length) meta.push('<span class="fmt">' + esc(metaFmt.join(' + ')) + '</span>');
      if (noteText) meta.push('<span class="extra-note">' + esc(noteText) + '</span>');

      // 来源徽章不再视觉呈现，仅保留屏幕阅读器文本
      var extraSr = '<span class="sr-only">公众号补充场次（淘票票可购票）</span>';
      var side = '';
      if (isExtra) {
        // 补充场次没有详情页，但同样提供上座率入口，走既有 openSeat 链路；
        // 查不到排期时由既有分支文案说明（票务检索为空 / 无本场排期 / 登录失效等）
        var chainTip = (chainPrev && !r.archived)
          ? ' title="连场：与前一场同一张票，座位图来自票务系统的合并场次"'
          : '';
        side = '<button type="button" class="occ-open" data-i="' + myIdx + '"' + chainTip + '>上座率</button>' + extraSr;
      } else if (r.archived) {
        // 已放映场次不再提供上座率入口
        side = '<a class="detail-link" href="' + link + '" target="_blank" rel="noopener">影片详情</a>';
      } else {
        side = '<button type="button" class="occ-open" data-i="' + myIdx + '">上座率</button>' +
          '<a class="detail-link" href="' + link + '" target="_blank" rel="noopener">影片详情</a>';
      }

      return '<article class="film">' +
        posterBlock(mi, db, dbUrl) +
        '<div class="film-main">' +
          '<div class="film-time">' +
            '<span class="time-pill">' + esc(time) + '</span>' +
            (endStr ? '<span class="end-time">散场约 ' + esc(endStr) + '</span>' : '') +
            occBadge(r) +
            doubanPill(db) +
            '<span class="venue-tag ' + (isJn ? 'jn' : 'bj') + '">' + venueShort + '</span>' +
          '</div>' +
          '<h3 class="film-title">' + (isExtra
            ? esc(mi.movieName)
            : '<a href="' + link + '" target="_blank" rel="noopener">' + esc(mi.movieName) + '</a>') +
            fmtTags + planEventBadge(r) + '</h3>' +
          (mi.englishName ? '<p class="film-en">' + esc(mi.englishName) + '</p>' : '<p class="film-en"></p>') +
          '<div class="film-meta">' + meta.join('<span class="sep">／</span>') + '</div>' +
        '</div>' +
        '<div class="film-side">' + side + pricePill(r) + '</div>' +
      '</article>';
    };

    // 影院 → 影厅 两级分组：影院顺序固定（北京在前），厅内按开场时间升序、厅间按厅号自然排序
    var cinemaMap = {};
    var cinemaKeys = [];
    list.forEach(function (r) {
      var ck = r.cinemaInfo || '';
      if (!Object.prototype.hasOwnProperty.call(cinemaMap, ck)) {
        cinemaMap[ck] = [];
        cinemaKeys.push(ck);
      }
      cinemaMap[ck].push(r);
    });
    cinemaKeys.sort(function (a, b) {
      return venueRank(a) - venueRank(b) || String(a).localeCompare(String(b), 'zh');
    });
    var multiCinema = cinemaKeys.length > 1;

    var items = cinemaKeys.map(function (ck) {
      var rows = cinemaMap[ck];
      var hallMap = {};
      var hallKeys = [];
      rows.forEach(function (r) {
        var hk = String(r.movieHall || '').trim() || '__none';
        if (!hallMap[hk]) { hallMap[hk] = []; hallKeys.push(hk); }
        hallMap[hk].push(r);
      });
      hallKeys.sort(function (a, b) {
        if (a === '__none') return 1;
        if (b === '__none') return -1;
        return hallRank(a) - hallRank(b) || String(a).localeCompare(String(b), 'zh');
      });
      return hallKeys.map(function (hk) {
        var hr = hallMap[hk].slice().sort(function (a, b) {
          if (a.playTime === b.playTime) return 0;
          return a.playTime < b.playTime ? -1 : 1;
        });
        var label = hk === '__none' ? '未标注影厅' : hk;
        return '<div class="hall-group">' +
          '<div class="hall-head">' +
            (multiCinema ? '<span class="hall-venue ' + (ck === '江南分馆影院' ? 'jn' : 'bj') + '">' +
              esc(venueShortOf(ck)) + '</span>' : '') +
            '<span class="hall-name">' + esc(label) + '</span>' +
            '<span class="hall-count">' + hr.length + ' 场</span>' +
          '</div>' +
          hr.map(renderFilm).join('') +
        '</div>';
      }).join('');
    }).join('');

    return '<section class="day-group' + (isToday ? ' is-today' : '') + '" data-day="' + Number(date.slice(8, 10)) + '" id="day-' + date + '">' +
      '<div class="day-head">' +
        '<span class="day-date">' + date.slice(5, 7) + ' 月 ' + Number(date.slice(8, 10)) + ' 日</span>' +
        '<span class="day-week">' + wk + '</span>' +
        (isToday ? '<span class="day-today">今天</span>' : '') +
        '<span class="day-badge">' + badge.join(' · ') + '</span>' +
      '</div>' + items + '</section>';
  }).join('');

  $('dayList').innerHTML = html;
}

function renderSkeleton() {
  var row = '<div class="sk-row"><div class="sk-block sk-poster"></div>' +
    '<div class="sk-lines"><div class="sk-block sk-l1"></div>' +
    '<div class="sk-block sk-l2"></div><div class="sk-block sk-l3"></div></div></div>';
  $('dayList').innerHTML = '<div class="day-group"><div class="skeleton">' +
    row + row + row + row + '</div></div>';
}

function render() {
  renderMonthLabel();
  var records = visibleRecords();
  // 仅在切换进「全部排片」的这次定位渲染里计算兜底提示，之后的筛选重绘不再提示
  state.anchorFrom = (state.scope === 'all' && !loading && state.anchorPending)
    ? anchorFallbackDate(records) : '';
  renderStats(records);
  renderNotice();
  if (state.scope === 'month') renderCalendar(records);
  renderList(records);
  updateMiniCal();
  // 「按月查看」切换后不自动定位：恢复切换前的滚动位置，抵消内容替换带来的滚动锚定位移
  if (state.keepScrollY >= 0 && !loading) {
    var keepY = state.keepScrollY;
    state.keepScrollY = -1;
    window.scrollTo({ top: keepY, behavior: 'auto' });
  }
}

/** 今天在「全部排片」里没有场次 → 返回最近的前向有排片日期；否则返回 '' */
function anchorFallbackDate(records) {
  var today = todayStr();
  var ds = '';
  for (var i = 0; i < records.length; i++) {
    var d = records[i].playTime.slice(0, 10);
    if (d === today) return '';
    if (d > today && (!ds || d < ds)) ds = d;
  }
  return ds;
}

/* ---------- 定位到「今天」分组（全部排片 / 按月查看） ----------
 * 切换进入这两种视图后，等渲染完成再把今天所在的分组滚到吸顶头部下方，
 * 只在切换/首次加载时定位一次；用户手动滚动不会被打断。 */
function anchorTarget() {
  var today = todayStr();
  var dates = [];
  Array.prototype.forEach.call($('dayList').querySelectorAll('.day-group[id]'), function (g) {
    dates.push(g.id.slice(4));   // id = 'day-YYYY-MM-DD'
  });
  if (dates.indexOf(today) >= 0) return { ds: today };
  if (state.scope !== 'all') return null;   // 按月视图：本月不含今天则停在顶部
  var first = '';
  for (var i = 0; i < dates.length; i++) {
    if (dates[i] > today && (!first || dates[i] < first)) first = dates[i];
  }
  return first ? { ds: first } : null;      // 全都无排片 → 停在顶部
}

/** 把某个日期分组滚到吸顶头部下方（绝对定位，偏移只由头部高度决定） */
function scrollDayIntoView(el) {
  var hd = document.querySelector('.site-header');
  var hh = hd ? hd.getBoundingClientRect().height : 0;
  var off = ((hh > 0 && hh < 140) ? hh : 72) + 10;
  var y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - off;
  window.scrollTo({ top: Math.max(0, y), behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function applyAnchor() {
  if (!state.anchorPending) return;
  state.anchorPending = false;
  var target = anchorTarget();
  var el = target ? document.getElementById('day-' + target.ds) : null;
  if (!el) { window.scrollTo({ top: 0, behavior: 'auto' }); return; }
  var hd = document.querySelector('.site-header');
  var hh = hd ? hd.getBoundingClientRect().height : 0;
  var off = ((hh > 0 && hh < 140) ? hh : 72) + 10;
  // 用绝对位置滚动（而非 scrollIntoView），偏移只由头部高度决定，定位更可预期
  var y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - off;
  window.scrollTo({ top: Math.max(0, y), behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/* ---------- 数据加载（按日并发，带进度） ---------- */
var loading = false;

/** 解析 arrangementAmount 返回结构（兼容包一层 data 的形式） */
function parseAmount(j) {
  var amount = {};
  if (j && typeof j === 'object') {
    Object.keys(j).forEach(function (k) {
      var v = j[k];
      if (v && typeof v === 'object') return;
      amount[k] = Number(v) || 0;
    });
    if (j.data && typeof j.data === 'object' && !Array.isArray(j.data)) {
      Object.keys(j.data).forEach(function (k) {
        if (typeof j.data[k] === 'number') amount[k] = j.data[k];
      });
    }
  }
  return amount;
}

/** 限流并发拉取多日明细。tasks: [{y,m,d,cache}]；onEach 每完成一天回调一次 */
function loadDetails(tasks, onEach) {
  state.totalDays = tasks.length;
  state.loadedDays = 0;
  return new Promise(function (resolve) {
    if (!tasks.length) { resolve(0); return; }
    var LIMIT = 5, idx = 0, active = 0, failed = 0;
    function next() {
      if (idx >= tasks.length && active === 0) { resolve(failed); return; }
      while (active < LIMIT && idx < tasks.length) {
        (function (task) {
          active++;
          fetchDay(task.y, task.m, task.d)
            .then(function (j) {
              var recs = (j && j.data && j.data.records) ? j.data.records : [];
              task.cache.days[task.d] = recs;
            })
            ['catch'](function () { failed++; })
            .then(function () {
              active--;
              state.loadedDays++;
              $('progressText').textContent = '已加载 ' + state.loadedDays + ' / ' + state.totalDays + ' 天';
              if (onEach) onEach();
              next();
            });
        })(tasks[idx++]);
      }
    }
    next();
  });
}

function failLoad(err) {
  loading = false;
  state.anchorPending = false;
  $('refreshBtn').disabled = false;
  $('progressText').textContent = '';
  $('dayList').innerHTML = '<div class="empty"><span class="big">⚠</span>' +
    '数据获取失败，请点击「刷新数据」重试。<br><span class="muted">' +
    esc(err && err.message ? err.message : '网络错误') + '</span></div>';
  $('notice').hidden = false;
  $('notice').className = 'notice warn';
  $('notice').textContent = '暂时无法连接资料馆排片接口，请稍后重试。';
}

/** 加载指定单月的排片 */
function loadMonth(force) {
  var cache = getCache();
  if (!force && cache.done) {
    // 已加载过该月：若还没接过存档（例如先在「全部排片」里加载过），补拉一次再渲染
    var k = cacheKey();
    if (!state.archives.hasOwnProperty(k)) {
      loadArchive(k).then(function (arch) {
        var c = getCache();
        if (arch && arch.length && !c.archiveAdded) c.archiveAdded = mergeArchive(c, arch);
        render();
        applyAnchor();
      });
      return;
    }
    render();
    applyAnchor();
    return;
  }

  loading = true;
  $('refreshBtn').disabled = true;
  $('progressText').textContent = '正在获取排片…';
  if (!cache.done) renderSkeleton();

  var y = state.year, m = state.month, dim = daysInMonth(y, m);

  // 存档与接口并行拉取：已放映的场次接口不再返回，靠存档补全
  var archP = loadArchive(cacheKey());

  fetchAmount(y, m).then(function (amtJson) {
    var amount = parseAmount(amtJson);
    cache.amount = amount;

    // 只拉取有场次的日子，节省请求
    var tasks = [];
    for (var d = 1; d <= dim; d++) {
      var k2 = pad2(y) + '-' + pad2(m) + '-' + pad2(d);
      if ((Number(amount[k2]) || 0) > 0) tasks.push({ y: y, m: m, d: d, cache: cache });
    }
    // 当月无计数时仍尝试今天，防止 amount 接口空返回导致整月被跳过
    var now = cstNow();
    if (!tasks.length && y === now.getFullYear() && m === now.getMonth() + 1) {
      tasks.push({ y: y, m: m, d: now.getDate(), cache: cache });
    }

    if (!tasks.length) return;
    return loadDetails(tasks);
  }).then(function () {
    return archP;
  }).then(function (arch) {
    var cache2 = getCache();
    if (arch && arch.length) cache2.archiveAdded = mergeArchive(cache2, arch);
    cache2.done = true;
    finishLoad();
  })['catch'](failLoad);
}

/** 加载从今天起、接口已发布的全部排片（跨月） */
function loadAll(force) {
  loading = true;
  state.allEmpty = false;
  $('refreshBtn').disabled = true;
  $('progressText').textContent = '正在获取排片…';

  var firstKey = Object.keys(state.cache).sort()[0];
  if (!firstKey || !state.cache[firstKey].amountFetched) renderSkeleton();

  // 覆盖窗口：从今天所在月起最多 6 个月（接口实际只发布约 2 个月，其余自动为空）
  var now = cstNow();
  var months = [], y = now.getFullYear(), m = now.getMonth() + 1;
  for (var i = 0; i < 6; i++) {
    months.push({ y: y, m: m });
    m++; if (m > 12) { m = 1; y++; }
  }

  // 存档与接口并行拉取：已放映的场次接口不再返回，靠存档补全
  // （每日任务只保存当月+下月，更远的月份没有存档文件，直接跳过避免 404）
  var archPs = months.map(function (mm, i) {
    if (i > 1) return Promise.resolve(null);
    return loadArchive(mm.y + '-' + pad2(mm.m));
  });

  // 第一步：并发拉取各月每日场次数
  var amtTasks = months.map(function (mm) {
    var key = mm.y + '-' + pad2(mm.m);
    var c = state.cache[key] || (state.cache[key] = { amount: {}, days: {}, done: false });
    if (force) { c.days = {}; c.done = false; c.amountFetched = false; }
    if (c.amountFetched) return Promise.resolve();
    return fetchAmount(mm.y, mm.m).then(function (j) {
      c.amount = parseAmount(j);
      c.amountFetched = true;
    })['catch'](function () {
      c.amountFetched = true;   // 个别未来月查询失败不阻断整体
    });
  });

  Promise.all(amtTasks).then(function () {
    // 第二步：收集「今天及以后、有场次」的日期
    var today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
    var tasks = [];
    months.forEach(function (mm) {
      var c = state.cache[mm.y + '-' + pad2(mm.m)];
      var dim = daysInMonth(mm.y, mm.m);
      for (var d = 1; d <= dim; d++) {
        var ds = mm.y + '-' + pad2(mm.m) + '-' + pad2(d);
        if (ds < today) continue;
        if ((Number(c.amount[pad2(mm.y) + '-' + pad2(mm.m) + '-' + pad2(d)]) || 0) > 0) {
          tasks.push({ y: mm.y, m: mm.m, d: d, cache: c });
        }
      }
    });

    // 兜底：今天有排片但 amount 空返回时至少查今天
    if (!tasks.length) {
      var t = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(),
                cache: state.cache[now.getFullYear() + '-' + pad2(now.getMonth() + 1)] };
      tasks.push(t);
    }

    // 边加载边增量渲染（节流）
    var lastRender = 0;
    var throttled = function () {
      var ts = Date.now();
      if (ts - lastRender > 500) { lastRender = ts; render(); }
    };

    return loadDetails(tasks, throttled);
  }).then(function () {
    // 合并历史存档：补回接口已剔除的已放映场次，并标记「已放映」
    return Promise.all(archPs).then(function (archList) {
      months.forEach(function (mm, i) {
        var c = state.cache[mm.y + '-' + pad2(mm.m)];
        var arch = archList && archList[i];
        if (c && arch && arch.length) c.archiveAdded = mergeArchive(c, arch);
      });
    });
  }).then(function () {
    // 标记覆盖月份明细完成，切回单月模式可直接复用
    months.forEach(function (mm) {
      var c = state.cache[mm.y + '-' + pad2(mm.m)];
      if (c && c.amountFetched) c.done = true;
    });
    // 检查是否全月为空（兜底任务返回 0 条）
    var rec = visibleRecords();
    state.allEmpty = !rec.length;
    finishLoad();
  })['catch'](failLoad);
}

/** 按当前模式分派加载 */
function load(force) {
  if (state.scope === 'all') loadAll(force);
  else if (state.scope === 'day') loadDay(force);
  else loadMonth(force);
}

/** 拉取某月每日场次数（失败不阻断，标记已尝试避免重复请求） */
function ensureAmount(y, m) {
  var c = monthCache(y, m);
  if (c.amountFetched) return Promise.resolve();
  return fetchAmount(y, m).then(function (j) {
    c.amount = parseAmount(j);
    c.amountFetched = true;
  })['catch'](function () { c.amountFetched = true; });
}

/** 拉取单日明细 + 并入存档（顺序与按月视图一致：先接口明细，再合入存档补全已放映场次）
 *  返回 { failed: 请求失败数, total: 该日记录数, archived: 该日补入的存档条数 } */
function pullDay(ds) {
  var y = Number(ds.slice(0, 4)), m = Number(ds.slice(5, 7)), d = Number(ds.slice(8, 10));
  var c = monthCache(y, m);
  return loadDetails([{ y: y, m: m, d: d, cache: c }]).then(function (failed) {
    return loadArchive(y + '-' + pad2(m)).then(function (arch) {
      var added = 0;
      if (arch && arch.length) added = mergeArchive(c, arch) || 0;
      return {
        failed: failed || 0,
        total: (c.days[d] || []).length,
        archived: Number(added) || 0
      };
    });
  });
}

/** 从 fromDs 次日开始，找接口已发布且有场次的最早日期（最多向后 75 天） */
function nextScreeningDate(fromDs) {
  var y = Number(fromDs.slice(0, 4)), m = Number(fromDs.slice(5, 7));
  var months = [];
  for (var i = 0; i < 3; i++) {
    months.push({ y: y, m: m });
    m++; if (m > 12) { m = 1; y++; }
  }
  return Promise.all(months.map(function (mm) { return ensureAmount(mm.y, mm.m); })).then(function () {
    for (var i = 1; i <= 75; i++) {
      var t = addDays(fromDs, i);
      var c = state.cache[t.slice(0, 7)];
      if (c && (Number(c.amount[t]) || 0) > 0) return t;
    }
    return '';   // 无可用的前向日期
  });
}

/**
 * 加载「当日」排片（默认视图）。
 * 只请求所选日期一天的明细，首屏最快；若该日无场次（放映已结束/未排片），
 * 自动前向查找最近一个有排片的日期并提示。接口失败时由存档兜底。
 */
function loadDay(force) {
  var ds = state.day || todayStr();
  setDay(ds);
  var d = Number(ds.slice(8, 10));
  var cache = monthCache(state.year, state.month);
  if (force) {
    cache.days = {};
    cache.amountFetched = false;
    cache.archiveAdded = 0;
  }
  if (!cache.days[d] || force) renderSkeleton();

  loading = true;
  state.dayFallbackFrom = '';
  state.dayArchiveOnly = false;
  state.dayArchived = 0;
  $('refreshBtn').disabled = true;
  $('progressText').textContent = '正在获取 ' + dayTextOf(ds) + ' 的排片…';

  ensureAmount(state.year, state.month).then(function () {
    return pullDay(ds);
  }).then(function (res) {
    state.dayArchived = res.archived;
    if (res.total > 0) {
      // 接口失败但存档有数据：正常展示并提示来源
      if (res.failed > 0) state.dayArchiveOnly = true;
      return;
    }
    if (res.failed > 0) throw new Error('接口暂时不可用');   // 失败且存档也没有
    // 当天无场次：找最近的前向日期
    return nextScreeningDate(ds).then(function (target) {
      if (!target) { state.allEmpty = true; return; }
      state.dayFallbackFrom = ds;
      setDay(target);
      return ensureAmount(state.year, state.month).then(function () {
        return pullDay(target);
      }).then(function (res2) {
        state.dayArchived = res2.archived;
        if (res2.total > 0 && res2.failed > 0) state.dayArchiveOnly = true;
        if (res2.total === 0 && res2.failed > 0) throw new Error('接口暂时不可用');
      });
    });
  }).then(function () {
    finishLoad();
  })['catch'](failLoad);
}

function finishLoad() {
  loading = false;
  $('refreshBtn').disabled = false;
  $('progressText').textContent = '';
  state.updatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  $('updatedAt').textContent = '最近刷新：' + new Date().toLocaleString('zh-CN', { hour12: false });
  render();
  applyAnchor();   // 跨月/按月视图：渲染完成后再定位到今天，避免中途跳动
}

/* =========================================================
 * 上座率：资料馆 APP 票务接口（需登录）
 * 不做全量自动计算，只在用户点击某场次的「上座率」入口时查询：
 * login → searchMovie → getProgramDetailsApp(screens)
 * → getCinemaSeat(restmap 计数 + 座位明细) → 座位图弹窗
 * ========================================================= */
var APP_API = 'https://api.guoyingjiaying.cn/api';
var AUTH_KEY = 'cfa_app_auth';
var auth = { token: '', uid: '', account: '' };
var occ = { on: false, cache: {} };   // recKey -> {seat,sold}（仅缓存用户已查询过的场次）
var progCache = {};                   // movieId -> screens[]

function appPost(path, data) {
  var h = { 'Content-Type': 'application/json', 'Form-type': 'app' };
  if (auth.token) h['Authori-zation'] = 'Bearer ' + auth.token;
  return fetch(APP_API + '/' + path, {
    method: 'POST', headers: h, body: JSON.stringify(data || {})
  }).then(function (r) { return r.json(); });
}

function appGet(path) {
  var h = { 'Form-type': 'app' };
  if (auth.token) h['Authori-zation'] = 'Bearer ' + auth.token;
  return fetch(APP_API + '/' + path, { headers: h }).then(function (r) { return r.json(); });
}

function authExpired(j) {
  return !!j && [110002, 110003, 110004, 110005].indexOf(j.status) >= 0;
}

function series(fns) {
  return fns.reduce(function (p, f) {
    return p.then(function () { return f(); });
  }, Promise.resolve());
}

function appLogin(account, password) {
  return appPost('login', { account: account, password: password }).then(function (j) {
    if (!j || j.status !== 200 || !j.data || !j.data.token) {
      throw new Error((j && j.msg) || '登录失败，请检查账号密码');
    }
    auth.token = j.data.token;
    auth.account = account;
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ account: account, token: auth.token }));
    } catch (e) {}
    return appGet('user');
  }).then(function (j) {
    if (authExpired(j)) throw new Error('登录已失效');
    var d = (j && j.data) || {};
    auth.uid = d.uid || d.user_id || d.id || d.userid || d.user_id_str || '';
    if (j && j.status === 200) return true;
    // user 接口异常不阻断登录，座位接口会用 token 兜底
    return true;
  });
}

function clearAuth() {
  auth.token = ''; auth.uid = ''; auth.account = '';
  try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  occ.on = false;
  occ.cache = {};
  progCache = {};
  pendingSeatRec = null;
  renderOccBtn();
  render();
}

function recKey(r) {
  var mi = r.movieInfo || {};
  return r.playTime + '|' + r.cinemaInfo + '|' + (r.movieHall || '') + '|' +
         (mi.movieId || r.movieId || mi.movieName || '');
}

/** "YYYY-MM-DD HH:mm:ss" → 当日分钟数，用于时间容差比较 */
function minsOf(st) {
  return Number(st.slice(11, 13)) * 60 + Number(st.slice(14, 16));
}

/** 影片名归一化：去掉括号备注、副标题、年份与标点，仅用于检索回退 */
function normTitle(s) {
  return String(s || '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[·•・:：;；\-—–/／、,，.。!！?？'"“”‘’\s]/g, '')
    .replace(/^\d{4}/, '')
    .toLowerCase();
}

/** 在 screens 数组中匹配某条排片：日期 + 开始时间，其次影厅号、影院 */
function matchScreen(r, screens) {
  if (!screens || !screens.length) return null;
  var date = r.playTime.slice(0, 10), time = r.playTime.slice(11, 16);
  var hallNo = (String(r.movieHall || '').match(/\d+/) || [''])[0];
  var isJn = r.cinemaInfo === '江南分馆影院';

  function pick(hit) {
    if (!hit.length) return null;
    if (hit.length === 1) return hit[0];
    if (hallNo) {
      var byHall = hit.filter(function (s) {
        var hh = (String(s.screen_hall || '').match(/\d+/) || [''])[0];
        return hh === hallNo;
      });
      if (byHall.length) hit = byHall;
    }
    if (hit.length > 1) {
      var byVenue = hit.filter(function (s) {
        var c = String(s.screen_cinema || '') + String(s.screen_hall || '');
        return isJn ? /江南|苏州/.test(c) : !/江南|苏州/.test(c);
      });
      if (byVenue.length) hit = byVenue;
    }
    return hit[0];
  }

  // 第一轮：开演时间完全一致
  var hit = screens.filter(function (s) {
    var st = s.screen_start_time || '';
    return st.slice(0, 10) === date && st.slice(11, 16) === time;
  });
  var got = pick(hit);
  if (got) return got;

  // 第二轮：同日、同影院且影厅号相同、开演时间相差 ≤3 分钟（仅在唯一命中时采用，避免串场）
  var target = minsOf(r.playTime);
  var near = screens.filter(function (s) {
    var st = s.screen_start_time || '';
    if (st.slice(0, 10) !== date) return false;
    var hh = (String(s.screen_hall || '').match(/\d+/) || [''])[0];
    if (hallNo && hh && hh !== hallNo) return false;
    var c = String(s.screen_cinema || '') + String(s.screen_hall || '');
    var okVenue = isJn ? /江南|苏州/.test(c) : !/江南|苏州/.test(c);
    if (!okVenue) return false;
    return Math.abs(minsOf(st) - target) <= 3;
  });
  return near.length === 1 ? near[0] : null;
}

/* ---------- 连场配对（公众号排片表里的「连场」场次） ----------
 * 连场的第二场不单独售票，推算开场时间 = 前一场开场 + 片长；
 * 配对必须同时满足：同日 + 同影院 + 同影厅号 + 前一场结束时间≈本场推算开场（≤2 分钟）
 * + 本场备注含「连场」。不按时间相邻硬配对，避免把普通相邻场次误认成连场。
 */
function noteOf(r) {
  var mi = r.movieInfo || {};
  return String(mi.note || r.note || '');
}
function isChainRec(r) { return /连场/.test(noteOf(r)); }
function hallNoOf(r) { return (String(r.movieHall || '').match(/\d+/) || [''])[0]; }
function endMinsOf(r) {
  var d = Number((r.movieInfo || {}).movieMinute) || 0;
  return d > 0 ? minsOf(r.playTime) + d : -1;
}
/** 本场（连场第二场）对应的前一场；找不到返回 null */
function chainPrevOf(r, records) {
  if (!isChainRec(r) || !records) return null;
  var date = r.playTime.slice(0, 10), t = minsOf(r.playTime), hall = hallNoOf(r);
  var best = null;
  records.forEach(function (x) {
    if (x === r || String(x.playTime).slice(0, 10) !== date) return;
    if (x.cinemaInfo !== r.cinemaInfo || hallNoOf(x) !== hall) return;
    if (minsOf(x.playTime) >= t) return;
    var end = endMinsOf(x);
    if (end < 0 || Math.abs(end - t) > 2) return;
    if (!best || minsOf(x.playTime) > minsOf(best.playTime)) best = x;
  });
  return best;
}
/** 本场作为连场第一场时，紧随的连场第二场；没有返回 null */
function chainNextOf(r, records) {
  if (!records) return null;
  var out = null;
  records.forEach(function (x) {
    if (out || !isChainRec(x)) return;
    if (chainPrevOf(x, records) === r) out = x;
  });
  return out;
}

/** 票务接口的登录态是否仍有效（仅在查不到场次时用于区分「登录失效」与「未开售」） */
function verifyAuth() {
  return appGet('user').then(function (j) {
    if (authExpired(j)) return false;
    return !!(j && j.status === 200);
  })['catch'](function () { return true; });   // 网络异常时不做误判
}

/**
 * 票务检索探活：用一个极宽泛的关键词查一次。票务检索若整体返回空
 * （登录态失效 / 接口调整 / 风控），就不能据此断言「影片库里没有这部片」，
 * 否则会把接口异常错报成影片缺失。
 */
function probeSearchAlive() {
  var probes = ['的', '一'];
  function next(i) {
    if (i >= probes.length) return Promise.resolve(false);
    return appPost('v3/movie/searchMovie', { cn_name: probes[i] }).then(function (j) {
      if (authExpired(j)) return false;
      if (j && j.data && j.data.list && j.data.list.length) return true;
      return next(i + 1);
    })['catch'](function () { return false; });
  }
  return next(0);
}

/** 搜索影片并拉取其场次列表（合并多个同名候选的 screens）
 *  传多条记录时（连场），依次用各自片名检索，命中任一条即停止。 */
function loadScreens(recs) {
  var gids = recs.map(function (r) {
    var mi = r.movieInfo || {};
    return mi.movieId || r.movieId || mi.movieName || '';
  }).filter(function (g, i, a) { return g && a.indexOf(g) === i; });
  var merged = [], seen = {};
  gids.forEach(function (g) {
    (progCache[g] || []).forEach(function (s) {
      var k = s.id + '|' + s.place_id;
      if (!seen[k]) { seen[k] = 1; merged.push(s); }
    });
  });

  // 检索词候选：原名 → 去副标题/括号版 → 带制式（如「海上劳工 4K」）→ 英文/原文名（含小写）
  var tried = [], queries = [];
  function addQuery(q) {
    q = String(q || '').trim();
    if (q && queries.indexOf(q) < 0) queries.push(q);
  }
  recs.forEach(function (r) {
    var mi = r.movieInfo || {};
    var name = mi.movieName || '';
    if (name) {
      addQuery(name);
      addQuery(normTitle(name));
      // 票务系统片名可能带制式后缀，如「海上劳工 4K」
      (r.node instanceof Array ? r.node : []).slice(0, 2).forEach(function (f) {
        if (/4K|IMAX|3D/i.test(String(f)) && String(f) && name.toUpperCase().indexOf(String(f).toUpperCase()) < 0) {
          addQuery(name + ' ' + f);
        }
      });
    }
    if (mi.englishName) {
      addQuery(String(mi.englishName));
      addQuery(String(mi.englishName).toLowerCase());
    }
  });
  queries = queries.slice(0, 5);
  if (!queries.length) return Promise.resolve({ screens: [], films: 0, tried: [] });
  var year = String((recs[0].movieInfo || {}).movieTime || '');

  var films = 0;

  function searchOne(q) {
    tried.push(q);
    return appPost('v3/movie/searchMovie', { cn_name: q }).then(function (j) {
      if (authExpired(j)) { var e1 = new Error('登录已失效'); e1.auth = true; throw e1; }
      return (j && j.data && j.data.list) || [];
    });
  }

  /** 依次尝试检索词，直到拿到候选影片 */
  function searchNext(i) {
    if (i >= queries.length) return Promise.resolve([]);
    return searchOne(queries[i]).then(function (list) {
      if (list && list.length) return list;
      return searchNext(i + 1);
    });
  }

  return searchNext(0).then(function (list) {
    films = list.length;
    // 年份一致的候选优先
    list = list.slice().sort(function (a, b) {
      var pa = String(a.years_content || '') === year ? 0 : 1;
      var pb = String(b.years_content || '') === year ? 0 : 1;
      return pa - pb;
    });
    var cands = list.slice(0, 4);

    function merge(arr) {
      (arr || []).forEach(function (s) {
        var k = s.id + '|' + s.place_id;
        if (!seen[k]) { seen[k] = 1; merged.push(s); }
      });
    }

    return collectScreens(recs, cands, merge, merged).then(function () {
      gids.forEach(function (g) { progCache[g] = merged; });   // 连场两场共用缓存
      return { screens: merged, films: films, tried: tried };
    });
  });
}

/** 按候选影片逐个取节目明细并合并去重；任一场次能对上即提前停止
 *  screens 为调用方持有的合并数组（供 matchScreen 判断是否已够用） */
function collectScreens(recs, cands, merge, screens) {
  function covered() {
    // 连场时只要其中一场能对上（合并节目通常对应上一场的时间），就不再继续探测
    return recs.some(function (r) { return !!matchScreen(r, screens); });
  }
  return series(cands.map(function (c) {
    return function () {
      if (covered()) return;
      var ids = [c.id, c.screen_id].filter(function (v, i, a) { return v && a.indexOf(v) === i; });
      return series(ids.map(function (pid) {
        return function () {
          if (covered()) return;
          return appPost('v3/movie/getProgramDetailsApp', { program_id: pid, uid: auth.uid })
            .then(function (p) {
              if (authExpired(p)) { var e2 = new Error('登录已失效'); e2.auth = true; throw e2; }
              if (p && p.status === 200 && p.data && p.data.screens) merge(p.data.screens);
            })['catch'](function (err) { if (err && err.auth) throw err; });
        };
      }));
    };
  }));
}

function fetchSeatOf(screen) {
  return appPost('v3/movie/getCinemaSeat', {
    userid: auth.uid, screen_id: screen.id, place_id: screen.place_id
  }).then(function (j) {
    if (authExpired(j)) { var e = new Error('登录已失效'); e.auth = true; throw e; }
    if (!j || j.status !== 200 || !j.data) {
      return { error: (j && j.msg) || '座位接口返回异常' };
    }
    var d = j.data;
    var rm = (d.restmap && typeof d.restmap === 'object' && !Array.isArray(d.restmap)) ? d.restmap : {};
    var seatRaw = rm.seat_count !== undefined ? rm.seat_count : d.seat_count;
    var soldRaw = rm.sold_count !== undefined ? rm.sold_count : d.sold_count;
    var seatKnown = seatRaw !== undefined && seatRaw !== null && seatRaw !== '';
    var soldKnown = soldRaw !== undefined && soldRaw !== null && soldRaw !== '';
    var seat = Number(seatRaw) || 0;
    var sold = Number(soldRaw) || 0;

    var seats = extractSeats(d, seat, sold, soldKnown);
    if (seats.length) {
      if (!seatKnown) seat = seats.length;
      if (!soldKnown) sold = seats.filter(function (s) { return s.state === 'sold'; }).length;
    }
    return { seat: seat, sold: sold, seats: seats };
  });
}

/* ---------- 片段检索 + 相似度兜底（仅在精确检索全部为空时触发） ---------- */
var FUZZY_CACHE = {};

/** 归一化片名：去括号及其内容、去制式词、去标点空白并转小写，用于相似度比较 */
function normKey(s) {
  return String(s || '').toLowerCase()
    .replace(/[（(【\[][^）)】\]]*[）)】\]]/g, '')
    .replace(/[《》〈〉「」『』【】\[\]()（）]/g, '')
    .replace(/(4k|2k|imax|3d|dcp|修复版|修复)/g, '')
    .replace(/[\s\u3000]/g, '')
    .replace(/[，。、！？：；·•\-—–_'’"“”,.!?:;\\/|]/g, '');
}

function bigramSet(s) {
  var set = {}, out = [], i;
  for (i = 0; i < s.length - 1; i++) {
    var g = s.substr(i, 2);
    if (!set[g]) { set[g] = 1; out.push(g); }
  }
  return out;
}

/** 片名相似度（Dice 二元组系数，0~1） */
function similarity(a, b) {
  var x = normKey(a), y = normKey(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  var A = bigramSet(x), B = bigramSet(y), hit = 0;
  A.forEach(function (g) { if (B.indexOf(g) >= 0) hit++; });
  return 2 * hit / (A.length + B.length);
}

/** 片段检索词：中文取前 2 字、后 2 字；外文取长度 ≥5 的关键词（跳过冠词介词） */
function segmentsOf(rec) {
  var mi = rec.movieInfo || {};
  var name = String(mi.movieName || ''), en = String(mi.englishName || '');
  var out = [];
  function add(q) { q = String(q || '').trim(); if (q && out.indexOf(q) < 0) out.push(q); }
  var cn = normKey(name);
  if (cn.length >= 3) {
    add(name.substr(0, 2));
    add(name.substr(name.length - 2));
  }
  en.split(/[^A-Za-z0-9\u00C0-\u00FF]+/).forEach(function (w) {
    if (w.length >= 5 && !/^(the|and|of|les|des|pour|with)$/i.test(w)) add(w.toLowerCase());
  });
  return out.slice(0, 4);
}

function candName(c) {
  return String(c.cn_name || c.name || c.movieName || '');
}

/** 片段检索 → 归一化相似度打分；结果按分数倒序，最多 6 条，带缓存 */
function fuzzyCandidates(rec) {
  var key = recKey(rec);
  if (FUZZY_CACHE[key]) return Promise.resolve(FUZZY_CACHE[key]);
  var segs = segmentsOf(rec);
  if (!segs.length) return Promise.resolve([]);
  var found = [], seenIds = {};
  return series(segs.map(function (q) {
    return function () {
      return appPost('v3/movie/searchMovie', { cn_name: q }).then(function (j) {
        if (authExpired(j)) { var e = new Error('登录已失效'); e.auth = true; throw e; }
        ((j && j.data && j.data.list) || []).forEach(function (c) {
          var k = (c.id || '') + '|' + (c.screen_id || '');
          if (seenIds[k]) return;
          seenIds[k] = 1;
          found.push(c);
        });
      })['catch'](function (err) { if (err && err.auth) throw err; });
    };
  })).then(function () {
    var mi = rec.movieInfo || {};
    var en = String(mi.englishName || '');
    var out = found.map(function (c) {
      var nm = candName(c);
      var s = similarity(nm, mi.movieName || '');
      if (en) {
        var alt = String(c.en_name || c.english_name || c.original_name || c.enName || '');
        if (alt) s = Math.max(s, similarity(alt, en));
      }
      return {
        raw: c,
        name: nm,
        year: String(c.years_content || c.year || c.movie_year || ''),
        min: Number(c.duration || c.minute || c.movie_minute || 0) || 0,
        score: s
      };
    }).filter(function (c) { return c.name && c.score >= 0.5; });
    out.sort(function (a, b) { return b.score - a.score; });
    out = out.slice(0, 6);
    FUZZY_CACHE[key] = out;
    return out;
  });
}

/** 唯一高分、且年份/片长不冲突时自动采用；出现多个高分候选一律交给用户点选 */
function pickAutoCandidate(cands, rec) {
  if (!cands || !cands.length) return null;
  if (cands[0].score < 0.8) return null;
  if (cands.length > 1 && cands[1].score >= 0.8) return null;
  var mi = rec.movieInfo || {};
  var c = cands[0];
  var cy = Number(c.year), my = Number(mi.movieTime);
  if (cy && my && Math.abs(cy - my) > 1) return null;   // 年份不符 → 只列为候选
  var cm = Number(c.min), mm = Number(mi.movieMinute);
  if (cm && mm && Math.abs(cm - mm) > 15) return null;  // 片长差太多 → 防跨片错配
  return c;
}

/** 用选定的票务候选条目取场次明细（复用 progCache） */
function screensFromCandidate(rec, cand) {
  var mi = rec.movieInfo || {};
  var gid = mi.movieId || rec.movieId || mi.movieName || '';
  var merged = [], seen = {};
  (progCache[gid] || []).forEach(function (s) {
    var k = s.id + '|' + s.place_id;
    if (!seen[k]) { seen[k] = 1; merged.push(s); }
  });
  function merge(arr) {
    (arr || []).forEach(function (s) {
      var k = s.id + '|' + s.place_id;
      if (!seen[k]) { seen[k] = 1; merged.push(s); }
    });
  }
  return collectScreens([rec], [cand.raw], merge, merged).then(function () {
    if (gid) progCache[gid] = merged;
    return merged;
  });
}

/** 官网排片的 movieId 形如「hex:签名」的复合标识（同一影片不同场次也会变），
 *  很可能就是票务系统的节目标识。票务检索库缺条目时用它作 program_id 兜底。 */
function programIdsOf(rec) {
  var mi = rec.movieInfo || {};
  var raw = String(mi.movieId || rec.movieId || '');
  if (!raw) return [];
  var dec = raw;
  try { dec = decodeURIComponent(raw); } catch (e) { dec = raw; }
  var out = [];
  function add(v) {
    v = String(v || '');
    if (v && out.indexOf(v) < 0) out.push(v);
  }
  add(dec);
  add(raw);
  var head = dec.split(':')[0];
  if (/^[0-9a-f]{16,64}$/i.test(head)) add(head);
  return out.slice(0, 3);
}

/** 用官网排片的 movieId 直接取节目明细（不依赖票务的影片检索） */
function screensFromProgramIds(rec) {
  var ids = programIdsOf(rec);
  if (!ids.length) return Promise.resolve([]);
  var mi = rec.movieInfo || {};
  var gid = mi.movieId || rec.movieId || mi.movieName || '';
  var merged = [], seen = {};
  (progCache[gid] || []).forEach(function (s) {
    var k = s.id + '|' + s.place_id;
    if (!seen[k]) { seen[k] = 1; merged.push(s); }
  });
  function merge(arr) {
    (arr || []).forEach(function (s) {
      var k = s.id + '|' + s.place_id;
      if (!seen[k]) { seen[k] = 1; merged.push(s); }
    });
  }
  var cands = ids.map(function (pid) { return { id: pid }; });
  return collectScreens([rec], cands, merge, merged).then(function () {
    if (gid) progCache[gid] = merged;
    return merged;
  });
}

/* ---------- 座位明细解析（对接口返回结构做防御式兼容） ---------- */
var ROW_KEYS = ['row', 'rowNo', 'row_no', 'rowNum', 'row_num', 'seatRow', 'seat_row', 'rowName', 'row_name', 'rows', 'hang'];
var COL_KEYS = ['col', 'column', 'colNo', 'col_no', 'colNum', 'col_num', 'seatCol', 'seat_col', 'colName', 'col_name', 'cols', 'lie'];
var ROW_FALLBACK = ['y', 'line'];
var COL_FALLBACK = ['x', 'index', 'no', 'num'];
var NAME_KEYS = ['name', 'seatName', 'seat_name', 'label', 'seatLabel', 'seatNo', 'seat_no', 'seatCode', 'code', 'seatNum'];
var STAT_KEYS = ['statu', 'status', 'state', 'seatStatus', 'seat_status', 'seatState', 'seat_state', 'sellStatus', 'sell_status',
  'saleStatus', 'sale_status', 'isSold', 'is_sold', 'sold', 'soldStatus', 'sold_status', 'lockStatus', 'lock_status',
  'isLock', 'is_lock', 'lock', 'usable', 'available', 'isAvailable', 'is_available', 'canBuy', 'can_buy',
  'booked', 'isBooked', 'orderStatus', 'order_status', 'seatType', 'seat_type', 'type', 'flag', 'category'];
var SOLD_ORDER = ['sold', 'sold_out', 'soldout', '已售', 'occupied', 'booked', 'unavailable', 'locked', 'lock',
  'x', 'true', 'y', 'yes', 's', '1', '2', 'n', 'no', 'false', 'free', 'available', 'empty', '0'];

function normVal(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return String(v).trim().toLowerCase();
}

function soldScore(k) {
  var i = SOLD_ORDER.indexOf(k);
  return i < 0 ? 40 : i;
}

function unwrapVal(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (v.name !== undefined) return v.name;
    if (v.value !== undefined) return v.value;
    if (v.id !== undefined) return v.id;
    return null;
  }
  return v;
}

function firstVal(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && v !== '') return unwrapVal(v);
  }
  return undefined;
}

/** "1排5座" / "A5" / "1-5" → {row,col} */
function seatKeyParse(str) {
  var s = String(str || '');
  var m = s.match(/(\d+)\s*排\s*(\d+)/);
  if (m) return { row: Number(m[1]), col: Number(m[2]) };
  m = s.match(/^([A-Za-z])\s*[-_]?\s*(\d+)$/);
  if (m) return { row: m[1].toUpperCase().charCodeAt(0) - 64, col: Number(m[2]) };
  m = s.match(/(\d+)\s*[-_:,]\s*(\d+)/);
  if (m) return { row: Number(m[1]), col: Number(m[2]) };
  return null;
}

/** 在返回体里收集所有可能是座位表的数组 / 对象 */
function collectCandidates(root) {
  var out = [];
  function walk(node, depth) {
    if (depth > 7 || node === null || node === undefined) return;
    if (Array.isArray(node)) {
      if (node.length) {
        var f = node[0];
        if (Array.isArray(f)) out.push({ kind: 'matrix', arr: node });
        else if (f && typeof f === 'object') out.push({ kind: 'list', arr: node });
      }
      for (var i = 0; i < node.length; i++) walk(node[i], depth + 1);
    } else if (typeof node === 'object') {
      var keys = Object.keys(node);
      if (keys.length >= 8) {
        var prim = keys.every(function (k) {
          var v = node[k];
          return v === null || ['string', 'number', 'boolean'].indexOf(typeof v) >= 0;
        });
        if (prim) out.push({ kind: 'objmap', obj: node, keys: keys });
      }
      for (var j = 0; j < keys.length; j++) walk(node[keys[j]], depth + 1);
    }
  }
  walk(root, 0);
  return out;
}

/** 归一化候选结构 → [{row,col,name,raw}] */
function normalizeCandidate(c) {
  var seats = [];

  if (c.kind === 'objmap') {
    var ok = 0;
    c.keys.forEach(function (k) {
      var p = seatKeyParse(k);
      if (p) { ok++; seats.push({ row: p.row, col: p.col, name: k, raw: c.obj[k] }); }
    });
    if (!seats.length || ok / c.keys.length < 0.6) return { seats: [] };
    return { seats: seats };
  }

  if (c.kind === 'matrix') {
    for (var i = 0; i < c.arr.length; i++) {
      var line = c.arr[i];
      for (var j = 0; j < line.length; j++) {
        var cell = line[j];
        if (cell === null || cell === undefined) continue;   // 过道 / 无座位
        if (cell && typeof cell === 'object') {
          var row = firstVal(cell, ROW_KEYS), col = firstVal(cell, COL_KEYS);
          var nm = firstVal(cell, NAME_KEYS);
          if (row === undefined && nm) {
            var pp = seatKeyParse(nm);
            if (pp) { row = pp.row; if (col === undefined) col = pp.col; }
          }
          seats.push({
            row: row !== undefined ? row : i + 1,
            col: col !== undefined ? col : j + 1,
            name: nm || '', raw: firstVal(cell, STAT_KEYS)
          });
        } else {
          seats.push({ row: i + 1, col: j + 1, name: '', raw: cell });
        }
      }
    }
    return { seats: seats };
  }

  // list：对象数组
  var missingRow = 0;
  c.arr.forEach(function (item) {
    if (!item || typeof item !== 'object') return;
    var row = firstVal(item, ROW_KEYS), col = firstVal(item, COL_KEYS);
    var nm = firstVal(item, NAME_KEYS);
    if (row === undefined && nm) {
      var p2 = seatKeyParse(nm);
      if (p2) { row = p2.row; if (col === undefined) col = p2.col; }
    }
    if (row === undefined) missingRow++;
    seats.push({ row: row, col: col, name: nm || '', raw: firstVal(item, STAT_KEYS), _item: item });
  });
  if (!seats.length) return { seats: [] };
  if (missingRow > seats.length * 0.5) return { seats: [] };

  if (missingRow) {   // 行号兜底：再试 x/y 等坐标键
    seats.forEach(function (s) {
      if (s.row === undefined) { var v = firstVal(s._item, ROW_FALLBACK); if (v !== undefined) s.row = v; }
      if (s.col === undefined) { var v2 = firstVal(s._item, COL_FALLBACK); if (v2 !== undefined) s.col = v2; }
    });
  }
  var still = seats.filter(function (s) { return s.row === undefined; }).length;
  if (still > seats.length * 0.5) return { seats: [] };

  var byRow = {};
  seats.forEach(function (s) { if (s.row !== undefined) (byRow[s.row] = byRow[s.row] || []).push(s); });
  Object.keys(byRow).forEach(function (k) {
    byRow[k].forEach(function (s, idx) { if (s.col === undefined) s.col = idx + 1; });
  });
  return { seats: seats.filter(function (s) { return s.row !== undefined && s.col !== undefined; }) };
}

/** 已售取值子集与 sold_count 的最佳匹配（用于区分「已售 / 可售 / 不可用」） */
function bestSoldMatch(seats, soldCount) {
  var counts = {};
  seats.forEach(function (s) { var k = normVal(s.raw); if (k) counts[k] = (counts[k] || 0) + 1; });
  var keys = Object.keys(counts);
  var best = { keys: [], err: Infinity, score: Infinity, size: 0 };
  if (!keys.length) return best;
  var full = keys.length <= 10;
  var total = full ? (1 << keys.length) : keys.length;
  for (var mask = 0; mask < total; mask++) {
    var sum = 0, picked = [], score = 0;
    if (full) {
      for (var i = 0; i < keys.length; i++) {
        if (mask & (1 << i)) { sum += counts[keys[i]]; picked.push(keys[i]); score += soldScore(keys[i]); }
      }
    } else if (mask < keys.length) {   // 取值过多时只试单键
      sum = counts[keys[mask]]; picked = [keys[mask]]; score = soldScore(keys[mask]);
    }
    var err = Math.abs(sum - soldCount);
    if (err < best.err ||
        (err === best.err && (score < best.score || (score === best.score && picked.length < best.size)))) {
      best = { keys: picked, err: err, score: score, size: picked.length };
    }
  }
  return best;
}

function scoreCandidate(seats, kind, seatCount, soldCount) {
  if (seats.length < 6) return 0;
  var withRC = seats.filter(function (s) { return s.row !== undefined && s.col !== undefined; }).length;
  var ratio = withRC / seats.length;
  if (ratio < 0.6) return 0;
  var sc = ratio > 0.9 ? 4 : 2;

  var rows = {};
  seats.forEach(function (s) { rows[s.row] = 1; });
  var rowCount = Object.keys(rows).length;
  if (rowCount >= 3) sc += 1;

  if (seatCount > 0) {
    var diff = Math.abs(seats.length - seatCount);
    if (diff <= Math.max(4, seatCount * 0.05)) sc += 3;
    else if (diff <= seatCount * 0.3) sc += 1;
  }
  if (soldCount > 0) {
    var err = bestSoldMatch(seats, soldCount).err;
    if (err === 0) sc += 2;
    else if (err <= Math.max(2, soldCount * 0.1)) sc += 1;
  }
  var named = seats.filter(function (s) { return s.name && /排|座/.test(s.name); }).length;
  if (named > seats.length * 0.5) sc += 1;
  return sc;
}

/* 本接口的数值语义：-1 = 非座位占位、0 = 可售、1 = 已售 */
var EXPLICIT_STATE = { '-1': 'blocked', '0': 'free', '1': 'sold' };

function applyStates(seats, soldCount, soldKnown) {
  var withRaw = seats.filter(function (s) { return normVal(s.raw) !== ''; }).length;
  if (!withRaw) {
    seats.forEach(function (s) { s.state = 'unknown'; });
    return;
  }

  var counts = {};
  seats.forEach(function (s) { var k = normVal(s.raw); if (k) counts[k] = (counts[k] || 0) + 1; });
  var keys = Object.keys(counts);

  // 取值全部命中已知数值语义时直接按语义着色
  var allExplicit = keys.every(function (k) { return EXPLICIT_STATE.hasOwnProperty(k); });
  if (allExplicit) {
    seats.forEach(function (s) {
      var k = normVal(s.raw);
      s.state = k ? EXPLICIT_STATE[k] : 'unknown';
    });
    return;
  }

  var soldKeys;
  if (soldKnown && soldCount > 0) {
    soldKeys = bestSoldMatch(seats, soldCount).keys;
  } else {
    var sorted = keys.slice().sort(function (a, b) { return soldScore(a) - soldScore(b); });
    soldKeys = (sorted.length && soldScore(sorted[0]) <= 20) ? [sorted[0]] : [];
  }

  var rest = keys.filter(function (k) { return soldKeys.indexOf(k) < 0; });
  // 优先在「可售语义」的取值里选（n/no/false/free/available/empty/0），避开语义未知的取值
  var freeish = rest.filter(function (k) { var sc = soldScore(k); return sc >= 16 && sc < 40; });
  var freePool = (freeish.length ? freeish : rest).slice();
  freePool.sort(function (a, b) { return counts[b] - counts[a]; });   // 数量最多的可售
  var freeKey = freePool.length ? freePool[0] : null;
  var blocked = rest.filter(function (k) { return k !== freeKey; });

  seats.forEach(function (s) {
    var k = normVal(s.raw);
    if (!k) s.state = 'unknown';
    else if (soldKeys.indexOf(k) >= 0) s.state = 'sold';
    else if (k === freeKey) s.state = 'free';
    else if (blocked.indexOf(k) >= 0) s.state = 'blocked';
    else s.state = 'unknown';
  });
}

/** 从接口返回里提取座位明细；识别不出有效座位表时返回 [] */
function extractSeats(root, seatCount, soldCount, soldKnown) {
  var bestSeats = null, bestScore = -1;
  collectCandidates(root).forEach(function (c) {
    var seats = normalizeCandidate(c).seats;
    if (!seats.length) return;
    var sc = scoreCandidate(seats, c.kind, seatCount, soldCount);
    if (sc > bestScore) { bestScore = sc; bestSeats = seats; }
  });
  if (!bestSeats || bestScore < 4) return [];
  applyStates(bestSeats, soldCount, !!soldKnown);
  return bestSeats;
}

/* ---------- 上座率弹窗（点击影片上的入口才查询） ---------- */
var seatRecs = [];          // 列表渲染时的记录索引（对应 .occ-open 的 data-i）
var pendingSeatRec = null;  // 未登录时先记住用户点的场次，登录成功后自动打开

function seatStatusText(text, warn, link) {
  var st = $('seatStatus');
  st.hidden = false;
  st.className = 'seat-status' + (warn ? ' warn' : '');
  st.textContent = text;
  if (link && link.href) {
    var a = document.createElement('a');
    a.className = 'seat-link';
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link.text || '打开官网该片页面';
    if (link.onclick) { a.removeAttribute('target'); a.href = '#'; a.onclick = link.onclick; }
    st.appendChild(document.createElement('br'));
    st.appendChild(a);
  }
}

/** 有座位图时在弹窗顶部显示的连场说明（不是错误，只是信息） */
function seatNoteText(text) {
  var st = $('seatStatus');
  st.hidden = false;
  st.className = 'seat-status note';
  st.textContent = text;
}

function renderSeatRows(seats) {
  var rows = {}, rowKeys = [];
  seats.forEach(function (s) {
    var k = String(s.row);
    if (!rows[k]) { rows[k] = []; rowKeys.push(k); }
    rows[k].push(s);
  });
  var allNum = rowKeys.every(function (k) { return /^\d+$/.test(k); });
  rowKeys.sort(allNum
    ? function (a, b) { return Number(a) - Number(b); }
    : function (a, b) { return String(a).localeCompare(String(b)); });

  function isPlace(s) { return s.state === 'sold' || s.state === 'free' || s.state === 'unknown'; }

  $('seatRows').innerHTML = rowKeys.map(function (k) {
    var list = rows[k].slice().sort(function (a, b) { return a.col - b.col; });
    var label = /^\d+$/.test(k) ? k + '排' : k;

    // 该排里真正有座位的区间（去掉接口两侧的占位留白，按各厅实际座位数排布）
    var placeIdx = [];
    list.forEach(function (s, i) { if (isPlace(s)) placeIdx.push(i); });

    if (!placeIdx.length) {   // 整排都是占位 → 空排 / 过道行
      return '<div class="seat-row seat-row-empty"><span class="row-label">' + esc(label) + '</span>' +
        '<div class="seat-cells"><i class="aisle-line"></i></div>' +
        '<span class="row-label">' + esc(label) + '</span></div>';
    }

    var lo = placeIdx[0], hi = placeIdx[placeIdx.length - 1];
    var cells = '', seq = 0, lastGap = false;
    for (var i = lo; i <= hi; i++) {
      var s = list[i];
      if (isPlace(s)) {
        seq++;
        var tip = s.name || (label + seq + '座');
        cells += '<i class="seat ' + s.state + '" title="' + esc(tip) + '">' + (seq < 100 ? seq : '') + '</i>';
        lastGap = false;
      } else if (!lastGap) {   // 座位之间的不可用位 → 过道
        cells += '<i class="seat-gap"></i>';
        lastGap = true;
      }
    }
    return '<div class="seat-row"><span class="row-label">' + esc(label) + '</span>' +
      '<div class="seat-cells">' + cells + '</div>' +
      '<span class="row-label">' + esc(label) + '</span></div>';
  }).join('');

  $('seatMap').hidden = false;
  $('seatLegend').hidden = false;
  fitSeatMap();
}

/** 座位图自适应：弹窗宽度贴合座位图（小厅小窗、大厅大窗），整排超宽时再整体缩放 */
function fitSeatMap() {
  var mask = $('seatModal'), wrap = $('seatScroll'), rows = $('seatRows');
  if (!mask || !wrap || !rows || mask.hidden) return;
  var box = mask.querySelector('.seat-modal');
  if (!box) return;

  rows.style.zoom = '';
  box.style.width = '';

  var natural = 0;
  Array.prototype.forEach.call(rows.querySelectorAll('.seat-row'), function (r) {
    if (r.offsetWidth > natural) natural = r.offsetWidth;
  });
  if (!natural) return;

  var vw = document.documentElement.clientWidth;
  var maxW = Math.min(1180, vw - 40);
  box.style.width = Math.min(maxW, Math.max(360, natural + 70)) + 'px';

  var avail = wrap.clientWidth - 6;
  if (natural > avail) {
    var k = avail / natural;
    rows.style.zoom = (k < 0.5 ? 0.5 : k).toFixed(3);
  }
}

/** 片段检索命中多个相近条目：列出来让用户点选，不自动采用 */
function renderSeatCandidates(r, cands) {
  var st = $('seatStatus');
  st.hidden = false;
  st.className = 'seat-status cands';
  st.textContent = '';

  var tip = document.createElement('div');
  tip.className = 'seat-cand-tip';
  tip.textContent = '票务系统里没有完全同名的条目，但检索到这几部相近的影片。请确认是哪一部：';
  st.appendChild(tip);

  var box = document.createElement('div');
  box.className = 'seat-cands';
  cands.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'seat-cand';
    b.textContent = c.name + (c.year ? '（' + c.year + '）' : '') + ' · 相近度 ' + Math.round(c.score * 100) + '%';
    b.onclick = function () { chooseCandidate(r, c, box); };
    box.appendChild(b);
  });
  st.appendChild(box);

  var note = document.createElement('div');
  note.className = 'seat-cand-tip';
  note.textContent = '如果都不是，说明票务系统用了完全不同的名字，可到 APP 内搜索购票。';
  st.appendChild(note);
}

/** 用户点选相近条目后，用该条目查本场座位 */
function chooseCandidate(r, cand, box) {
  var btns = box ? box.getElementsByTagName('button') : [];
  for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
  seatStatusText('正在按「' + cand.name + '」查询本场座位…');
  screensFromCandidate(r, cand)
    .then(function (screens) {
      var sc = matchScreen(r, screens);
      if (sc) return fetchSeatOf(sc);
      return verifyAuth().then(function (ok) {
        if (!ok) { var e = new Error('登录已失效'); e.auth = true; throw e; }
        return { nomatch: true, films: 1, alive: true, fuzzyName: cand.name };
      });
    })
    .then(function (res) { showSeatResult(r, res || {}); })
    ['catch'](function (err) {
      if (err && err.auth) {
        closeSeat();
        clearAuth();
        openLogin('登录已失效，请重新登录');
        return;
      }
      showSeatResult(r, { error: (err && err.message) || '网络错误' });
    });
}

/** 影院简称（弹窗副标题与指引文案共用同一套映射） */
function shortCinema(c) {
  if (c === '江南分馆影院') return '江南分馆';
  if (c === '小西天艺术影院') return '小西天';
  if (c === '百子湾艺术影院') return '百子湾';
  return c || '影院';
}

/** APP 观影日历的操作路径（按当前场次动态拼接，不做深链） */
function appCalendarPath(r) {
  var t = String(r.playTime || '');
  var mo = Number(t.slice(5, 7)), day = Number(t.slice(8, 10));
  var name = (r.movieInfo || {}).movieName || '';
  return '资料馆 APP：首页 →「观影日历」→ ' + mo + ' 月 ' + day + ' 日 → ' +
    shortCinema(r.cinemaInfo) + ' → ' + (r.movieHall || '') + ' ' + t.slice(11, 16) +
    '《' + name + '》→ 选座购票。';
}

function showSeatResult(r, res) {
  if (res && res.nomatch) {
    var tm = r.playTime.slice(11, 16);
    var hall = r.movieHall || '';
    if (res.chain) {
      // 连场：上一场（同一张票）也查不到，说明整组连场都还没开售
      var c = res.chain, cm = (c.movieInfo || {}).movieName || '';
      seatStatusText('本场为连场（与 ' + c.playTime.slice(11, 16) + '《' + cm + '》同一张票）。' +
        (res.films
          ? '票务系统里有影片条目，但「' + c.playTime.slice(11, 16) + '」这一场也没有排期，可能尚未开售。'
          : res.alive === false
            ? '票务检索这次整体没有返回结果（可能登录态失效或接口调整），无法判断这两部影片是否存在。'
            : '票务系统的影片库里没有这两部影片的条目，无法取得这组连场的座位图。'),
        true, { text: '去上一场官网页面 →', href: DETAIL_PAGE + ((c.movieInfo || {}).movieId || c.movieId || '') });
      return;
    }
    if (res.candidates && res.candidates.length) {
      renderSeatCandidates(r, res.candidates);
      return;
    }
    if (!res.films) {
      var nm = (r.movieInfo || {}).movieName || '';
      var goApp = { text: '去官网该片页面（含 APP 购票入口）→', href: DETAIL_PAGE + ((r.movieInfo || {}).movieId || r.movieId || '') };
      if (res.alive === false) {
        // 宽泛关键词也查不到东西：票务检索整体不可用，不能归因到影片
        seatStatusText('票务检索这次没有返回任何结果（可能是登录态失效，或票务接口临时调整），' +
          '所以无法判断《' + nm + '》是否在票务系统中——不代表这部影片不存在。',
          true, {
            text: '退出并重新登录再试 →',
            href: '#',
            onclick: function (ev) {
              if (ev && ev.preventDefault) ev.preventDefault();
              closeSeat();
              clearAuth();
              openLogin('登录已失效，请重新登录后再查上座率');
            }
          });
      } else {
        seatStatusText('《' + nm + '》的这场（' + tm + ' ' + hall + '）在放映日历里有排期，' +
          '但票务系统的影片检索入口搜不到这个片名（已尝试原名、去括号版、原文名与片段检索）——' +
          '票务搜索与 APP 的「观影日历」是两套数据，这不代表影片未上架。' +
          '请打开' + appCalendarPath(r), true, goApp);
      }
    } else if (res.fuzzyName) {
      seatStatusText('票务系统里找到了相近条目《' + res.fuzzyName + '》，但该条目下没有本场（' + tm + ' ' + hall + '）的排期，' +
        '可能尚未开售。',
        true, { text: '去官网该片页面（含 APP 购票入口）→', href: DETAIL_PAGE + ((r.movieInfo || {}).movieId || r.movieId || '') });
    } else {
      seatStatusText('影片已在票务系统中，但未查到本场次（' + tm + ' ' + hall + '）的排期，' +
        '可能尚未开售，或该场次只在淘票票 / 线下渠道售票。',
        true, { text: '去官网该片页面（含 APP 购票入口）→', href: DETAIL_PAGE + ((r.movieInfo || {}).movieId || r.movieId || '') });
    }
    return;
  }
  if (res && res.error) {
    seatStatusText('查询失败：' + res.error, true);
    return;
  }
  var hasMap = res && res.seats && res.seats.length;
  if (!res || (!res.seat && !hasMap)) {
    seatStatusText((res && res.chainInfo ? res.chainInfo + ' ' : '') + '该场次暂时没有座位数据（可能尚未开售）。', true);
    return;
  }

  var total = res.seat || (hasMap ? res.seats.length : 0);
  var sold = res.sold || 0;
  var pct = total > 0 ? Math.min(100, Math.round(sold / total * 100)) : 0;

  if (total > 0) occ.cache[recKey(r)] = { seat: total, sold: sold };   // 供列表徽章显示

  var sum = $('seatSummary');
  sum.hidden = false;
  sum.innerHTML =
    '<div class="occ-big"><b>' + pct + '%</b><span>上座率</span></div>' +
    '<div class="occ-bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="occ-nums">已售 <b>' + sold + '</b> 座 ／ 总座位 <b>' + total +
      '</b> 座 · 余票 <b>' + Math.max(0, total - sold) + '</b> 座</div>';

  if (hasMap) {
    renderSeatRows(res.seats);
    if (res.chainInfo) seatNoteText(res.chainInfo);   // 连场说明常驻在座位图上方
    else $('seatStatus').hidden = true;
  } else {
    $('seatMap').hidden = true;
    $('seatLegend').hidden = true;
    seatStatusText((res.chainInfo ? res.chainInfo + ' ' : '') + '该接口未返回座位明细，这里只显示数量统计。', false);
  }
  render();   // 更新列表里该场次的上座率徽章
}

function openSeat(r) {
  if (!auth.token) {
    pendingSeatRec = r;
    openLogin('查询上座率需先登录（使用你的资料馆 APP 账号）');
    return;
  }
  var mi = r.movieInfo || {};
  var isJn = r.cinemaInfo === '江南分馆影院';
  $('seatTitle').textContent = mi.movieName || '上座率';
  $('seatSub').textContent = r.playTime.slice(0, 16) + ' · ' +
    (isJn ? '江南分馆' : (r.cinemaInfo === '小西天艺术影院' ? '小西天' : '百子湾')) +
    ' · ' + (r.movieHall || '');

  $('seatSummary').hidden = true;
  $('seatSummary').innerHTML = '';
  $('seatMap').hidden = true;
  $('seatLegend').hidden = true;
  $('seatRows').innerHTML = '';
  var box = $('seatModal').querySelector('.seat-modal');
  if (box) box.style.width = '';
  seatStatusText('正在查询座位…', false);
  $('seatModal').hidden = false;
  document.body.classList.add('modal-open');

  // 连场：第二场不单独售票，合并节目通常只对应前一场的开始时间
  var prev = chainPrevOf(r, seatRecs);
  var next = chainNextOf(r, seatRecs);

  loadScreens(prev ? [prev, r] : [r])
    .then(function (out) {
      var screens = (out && out.screens) || [];
      var screen = matchScreen(r, screens);
      if (screen) {
        return fetchSeatOf(screen).then(function (res) {
          if (next) {
            res.chainInfo = '本场为连场放映：下一场 ' + next.playTime.slice(11, 16) + '《' +
              ((next.movieInfo || {}).movieName || '') + '》与它连映、同一张票，座位图取自票务系统的这一场。';
          }
          return res;
        });
      }
      // 本场自身无排期时，回退到同厅前一场（合并场次）
      var shared = prev ? matchScreen(prev, screens) : null;
      if (shared) {
        return fetchSeatOf(shared).then(function (res) {
          if (res && !res.error) {
            res.chainInfo = '本场为连场：票务系统没有单独的 ' + r.playTime.slice(11, 16) +
              ' 场次，座位图对应与 ' + prev.playTime.slice(11, 16) + '《' +
              ((prev.movieInfo || {}).movieName || '') + '》连映的合并场次（同一张票、同一批座位）。';
          }
          return res;
        });
      }
      // 查不到场次：先确认登录态，再用宽泛关键词判断票务检索本身是否可用
      return verifyAuth().then(function (ok) {
        if (!ok) {
          var e = new Error('登录已失效');
          e.auth = true;
          throw e;
        }
        var films = (out && out.films) || 0;
        if (films) {
          return { nomatch: true, films: films, tried: (out && out.tried) || [], chain: prev || null };
        }
        // 票务影片检索为空：先用官网排片的 movieId 直接取节目明细
        // （APP 观影日历能看到的场次，票务检索库未必有同名条目，这条链路不经过片名检索）
        return screensFromProgramIds(r).then(function (pidScreens) {
          var byPid = matchScreen(r, pidScreens);
          if (byPid) return fetchSeatOf(byPid);
          return probeSearchAlive().then(function (alive) {
            if (!alive) {
              return { nomatch: true, films: 0, alive: false, tried: (out && out.tried) || [], chain: prev || null };
            }
            // 精确检索全部为空：用片段检索找相近条目，唯一高分才自动采用
            return fuzzyCandidates(r).then(function (cands) {
              var auto = pickAutoCandidate(cands, r);
              if (!auto) {
                return { nomatch: true, films: 0, alive: true, candidates: cands, tried: (out && out.tried) || [], chain: prev || null };
              }
              return screensFromCandidate(r, auto).then(function (screens) {
                var sc = matchScreen(r, screens);
                if (sc) return fetchSeatOf(sc);
                return { nomatch: true, films: 1, alive: true, fuzzyName: auto.name, tried: (out && out.tried) || [], chain: prev || null };
              });
            });
          });
        });
      });
    })
    .then(function (res) { showSeatResult(r, res || { nomatch: true }); })
    ['catch'](function (err) {
      if (err && err.auth) {
        closeSeat();
        clearAuth();
        openLogin('登录已失效，请重新登录');
        return;
      }
      showSeatResult(r, { error: err && err.message ? err.message : '网络错误' });
    });
}

function closeSeat() {
  $('seatModal').hidden = true;
  document.body.classList.remove('modal-open');
}

function renderOccBtn() {
  $('occBtn').hidden = occ.on;
  $('occLogout').hidden = !occ.on;
}

function occBadge(r) {
  if (!occ.on) return '';
  var v = occ.cache[recKey(r)];
  if (!v || !v.seat) return '';
  var pct = Math.round(v.sold / v.seat * 100);
  var cls = pct >= 90 ? ' high' : (pct >= 70 ? ' mid' : '');
  return '<span class="occ-pill' + cls + '" title="已售 ' + v.sold + ' / ' + v.seat + ' 座">上座 ' + pct + '%</span>';
}


/* ---------- 交互 ---------- */
function goMonth(delta) {
  var m = state.month + delta, y = state.year;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  state.year = y; state.month = m;
  // 月份视图下车内日期同步到该月 1 日，避免与当日视图串味
  state.day = y + '-' + pad2(m) + '-01';
  renderMonthLabel();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  load(false);
}

/** 当日视图：前一天 / 后一天 / 回到今天 */
function goDayTo(ds) {
  state.dayFallbackFrom = '';
  state.dayArchiveOnly = false;
  setDay(ds);
  renderMonthLabel();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  load(false);
}

$('prevDay').addEventListener('click', function () { goDayTo(addDays(state.day || todayStr(), -1)); });
$('nextDay').addEventListener('click', function () { goDayTo(addDays(state.day || todayStr(), 1)); });
$('backToday').addEventListener('click', function () { goDayTo(todayStr()); });

$('prevMonth').addEventListener('click', function () { goMonth(-1); });
$('nextMonth').addEventListener('click', function () { goMonth(1); });
$('thisMonth').addEventListener('click', function () {
  var n = cstNow();
  state.year = n.getFullYear(); state.month = n.getMonth() + 1;
  state.day = todayStr();
  renderMonthLabel();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  load(false);
});

$('venueTabs').addEventListener('click', function (e) {
  var btn = e.target.closest('.tab');
  if (!btn) return;
  Array.prototype.forEach.call(this.querySelectorAll('.tab'), function (t) {
    t.classList.toggle('is-active', t === btn);
  });
  state.venue = btn.dataset.venue;
  render();
});

var searchTimer;
$('searchBox').addEventListener('input', function () {
  var v = this.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function () { state.query = v; render(); }, 180);
});

$('refreshBtn').addEventListener('click', function () {
  session.at = 0;
  load(true);
});

/* 查询范围切换：当日排片 / 全部排片 / 按月查看 */
$('scopeSwitch').addEventListener('click', function (e) {
  var btn = e.target.closest('.tab');
  if (!btn || btn.dataset.scope === state.scope) return;
  Array.prototype.forEach.call(this.querySelectorAll('.tab'), function (t) {
    t.classList.toggle('is-active', t === btn);
  });
  state.scope = btn.dataset.scope;
  state.dayFallbackFrom = '';
  state.dayArchiveOnly = false;
  state.anchorFrom = '';
  // 「全部排片」等渲染完成后定位到今天；「按月查看」不滚动，恢复切换前的滚动位置
  state.anchorPending = state.scope === 'all';
  state.keepScrollY = state.scope === 'month' ? (window.pageYOffset || 0) : -1;
  if (state.scope === 'day' && !state.day) setDay(todayStr());
  renderMonthLabel();
  if (state.scope === 'day') window.scrollTo({ top: 0, behavior: 'smooth' });
  load(false);
});

/* ---------- 上座率：登录交互 ---------- */
function openLogin(errMsg) {
  $('loginModal').hidden = false;
  $('loginError').hidden = !errMsg;
  if (errMsg) $('loginError').textContent = errMsg;
  $('loginPassword').value = '';
  setTimeout(function () { $('loginAccount').focus(); }, 30);
}
function closeLogin() {
  $('loginModal').hidden = true;
  $('loginError').hidden = true;
  pendingSeatRec = null;
}

$('occBtn').addEventListener('click', function () { openLogin(); });

$('occLogout').addEventListener('click', function () {
  clearAuth();
});

/* ---------- 上座率弹窗交互 ---------- */
$('dayList').addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('.occ-open') : null;
  if (!btn) return;
  var rec = seatRecs[Number(btn.dataset.i)];
  if (rec) openSeat(rec);
});
/* 海报加载失败时逐级回退：本地缺失 -> 豆瓣 CDN -> 资料馆；全部失败显示占位（error 事件不冒泡，需捕获阶段） */
$('dayList').addEventListener('error', function (e) {
  var t = e.target;
  if (!(t && t.tagName === 'IMG' && t.classList && t.classList.contains('poster'))) return;
  var chain = (t.dataset.fb || '').split('|').filter(Boolean);
  if (chain.length) {
    t.dataset.fb = chain.slice(1).join('|');
    t.src = chain[0];
    return;
  }
  if (!t.dataset.fbd) {
    t.dataset.fbd = '1';
    var ph = document.createElement('div');
    ph.className = 'poster-ph';
    ph.textContent = '暂无海报';
    if (t.parentNode) t.parentNode.replaceChild(ph, t);
  }
}, true);
$('seatClose').addEventListener('click', closeSeat);
window.addEventListener('resize', fitSeatMap);
$('seatModal').addEventListener('click', function (e) {
  if (e.target === this) closeSeat();
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!$('seatModal').hidden) closeSeat();
  else if (!$('planModal').hidden) closePlan();
  else if (!$('loginModal').hidden) closeLogin();
});

$('loginCancel').addEventListener('click', closeLogin);
$('loginModal').addEventListener('click', function (e) {
  if (e.target === this) closeLogin();
});

function submitLogin() {
  var account = $('loginAccount').value.trim();
  var password = $('loginPassword').value;
  if (!account) { openLogin('请填写账号（手机号）'); return; }
  if (!password) { openLogin('请填写密码'); return; }
  var btn = $('loginSubmit');
  btn.disabled = true;
  btn.textContent = '登录中…';
  appLogin(account, password).then(function () {
    btn.disabled = false;
    btn.textContent = '登录';
    var rec = pendingSeatRec;          // 登录前点过的场次
    closeLogin();
    occ.on = true;
    renderOccBtn();
    render();
    if (rec) openSeat(rec);            // 登录成功后直接打开它的座位弹窗
  })['catch'](function (err) {
    btn.disabled = false;
    btn.textContent = '登录';
    $('loginError').hidden = false;
    $('loginError').textContent = err && err.message ? err.message : '登录失败，请稍后重试';
  });
}
$('loginSubmit').addEventListener('click', submitLogin);
$('loginPassword').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') submitLogin();
});

/** 恢复本机保存的登录态 */
(function restoreAuth() {
  var raw = null;
  try { raw = localStorage.getItem(AUTH_KEY); } catch (e) {}
  if (!raw) { renderOccBtn(); return; }
  var saved;
  try { saved = JSON.parse(raw); } catch (e) { return; }
  if (!saved || !saved.token) return;
  auth.token = saved.token;
  auth.account = saved.account || '';
  appGet('user').then(function (j) {
    if (j && j.status === 200 && !authExpired(j)) {
      var d = j.data || {};
      auth.uid = d.uid || d.user_id || d.id || d.userid || '';
      occ.on = true;
      render();
    } else {
      clearAuth();
    }
    renderOccBtn();
  })['catch'](function () {
    // 网络失败时保留 token，按钮照常显示
    renderOccBtn();
  });
})();

/* =========================================================
 * 观影计划
 * 范围：仅江南分馆、仅当月与下月（北京时间），只存本机 localStorage。
 * 与排片数据共用 fetchAmount / fetchDay / mergeArchive / priceOf，
 * 加载走独立缓存，不打断页面当前的查询状态。
 * ========================================================= */
var PLAN_STORE = 'cfa_plan_v1';          // 旧版：单列表（首次启动自动迁移）
var PLAN_STORE_V2 = 'cfa_plan_v2';       // 新版：按月份分档 { v:1, months:{ 'YYYY-MM': { items, updatedAt } } }
var PLAN_CINEMA = '江南分馆影院';
var PLAN_BUDGET = 500;

var plan = {
  months: {},         // 'YYYY-MM' -> { items: [], updatedAt: 毫秒 }
  month: '',          // 当前查看的月份 'YYYY-MM'
  items: [],          // 当前月份的场次（plan.months[month].items 的别名）
  tab: 'add',
  cache: {},          // 'YYYY-MM' -> {amount, days, done}
  candidates: null,   // 已构建的候选场次
  candIndex: {},
  loading: false,
  error: '',
  search: '',
  toastTimer: null
};

function planKeyOf(o) {
  return String(o.t || '') + '|' + String(o.c || '') + '|' + String(o.h || '') + '|' + normName(o.n);
}

/** 场次所属月份（YYYY-MM，按开场时间；北京时间的时间串本身即本地日期） */
function planMonthOf(it) { return String(it.t || '').slice(0, 7); }
function planIsMonthKey(k) { return /^\d{4}-\d{2}$/.test(String(k)); }

function planMonthLabel(k) {
  var y = String(k).slice(0, 4), m = Number(String(k).slice(5, 7));
  // 跨年时带上年份，避免「1 月」分不清是哪一年
  return (y === String(cstNow().getFullYear()) ? m + ' 月' : y + ' 年 ' + m + ' 月');
}
function planUpdatedText(ts) {
  var n = Number(ts) || 0;
  if (!n) return '';
  var d = new Date(n + new Date(n).getTimezoneOffset() * 60000 + 8 * 3600000);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/** 存档快照 -> 兼容 priceOf / 渲染的排片记录 */
function planRecord(it) {
  return {
    playTime: it.t,
    cinemaInfo: it.c,
    movieHall: it.h || '',
    extra: !!it.extra,
    node: Array.isArray(it.node) ? it.node : [],
    price: Number(it.price) || 0,
    priceMax: Number(it.priceMax) || 0,
    priceNote: it.priceNote || '',
    movieInfo: {
      movieName: it.n || '',
      englishName: it.en || '',
      movieTime: it.y || '',
      movieMinute: Number(it.min) || 0,
      note: it.note || '',
      movieId: it.mid || ''
    }
  };
}

/** 排片记录 -> 计划快照（只保留展示与计算需要的字段） */
function planSnapshot(r) {
  var mi = r.movieInfo || {};
  return {
    k: planKeyOf({ t: r.playTime, c: r.cinemaInfo, h: r.movieHall, n: mi.movieName }),
    t: r.playTime,
    c: r.cinemaInfo,
    h: r.movieHall || '',
    n: mi.movieName || '',
    en: mi.englishName || '',
    y: mi.movieTime || '',
    min: Number(mi.movieMinute) || 0,
    note: mi.note || '',
    node: (r.node || []).slice(),
    extra: !!r.extra,
    mid: mi.movieId || r.movieId || '',
    price: Number(r.price) || 0,
    priceMax: Number(r.priceMax) || 0,
    priceNote: r.priceNote || ''
  };
}

/** 存档里的单条记录 -> 规范化的计划项；无效返回 null（不抛错） */
function normalizePlanItem(o) {
  if (!o || !o.t || !o.n) return null;
  var it = {
    t: String(o.t), c: o.c || PLAN_CINEMA, h: o.h || '', n: String(o.n),
    en: o.en || '', y: o.y || '', min: Number(o.min) || 0, note: o.note || '',
    node: Array.isArray(o.node) ? o.node.slice() : [],
    extra: !!o.extra, mid: o.mid || '',
    price: Number(o.price) || 0, priceMax: Number(o.priceMax) || 0, priceNote: o.priceNote || ''
  };
  it.k = planKeyOf(it);
  return it;
}

/** 取某月档（不存在时创建，但不落盘） */
function planArch(mk) {
  if (!plan.months[mk]) plan.months[mk] = { items: [], updatedAt: 0 };
  return plan.months[mk];
}

/** 切换到某个月份视图；plan.items 始终指向该月档的数组 */
function setPlanMonth(mk) {
  plan.month = planIsMonthKey(mk) ? mk : planMonthKeys()[0];
  var arch = plan.months[plan.month];
  plan.items = arch ? arch.items : [];
}

/** 全部月份合计场次（浮动按钮 / 页签角标用） */
function planTotalCount() {
  var n = 0;
  Object.keys(plan.months).forEach(function (k) { n += (plan.months[k].items || []).length; });
  return n;
}

function planHas(k) {
  var keys = Object.keys(plan.months);
  for (var i = 0; i < keys.length; i++) {
    var arr = plan.months[keys[i]].items || [];
    for (var j = 0; j < arr.length; j++) if (arr[j].k === k) return true;
  }
  return false;
}

/** 按稳定 key 精确查找场次所在月份（跨月同名同时刻不会误判；找不到返回 ''） */
function planMonthOfKey(k) {
  var keys = Object.keys(plan.months);
  for (var i = 0; i < keys.length; i++) {
    var arr = plan.months[keys[i]].items || [];
    for (var j = 0; j < arr.length; j++) if (arr[j].k === k) return keys[i];
  }
  return '';
}

/** 旧版单列表 -> 按月分档（只在没有 v2 数据时执行一次，幂等） */
function migrateLegacyPlan() {
  var raw = null;
  try { raw = localStorage.getItem(PLAN_STORE); } catch (e) { return; }
  if (!raw) return;
  var arr = null;
  try { arr = JSON.parse(raw); } catch (e) { return; }
  if (!Array.isArray(arr)) return;
  arr.forEach(function (o) {
    var it = normalizePlanItem(o);
    if (!it) return;
    var mk = planMonthOf(it);
    if (!planIsMonthKey(mk)) return;
    var arch = planArch(mk);
    var exists = false;
    for (var i = 0; i < arch.items.length; i++) if (arch.items[i].k === it.k) { exists = true; break; }
    if (!exists) arch.items.push(it);
  });
  var now = Date.now();
  Object.keys(plan.months).forEach(function (mk) {
    if (!plan.months[mk].updatedAt) plan.months[mk].updatedAt = now;
  });
  try { localStorage.removeItem(PLAN_STORE); } catch (e) {}
  try { localStorage.setItem(PLAN_STORE_V2, JSON.stringify({ v: 1, months: plan.months })); } catch (e) {}
}

function loadPlanStore() {
  plan.months = {};
  var raw = null;
  try { raw = localStorage.getItem(PLAN_STORE_V2); } catch (e) { raw = null; }
  if (raw) {
    // 有 v2 数据就以它为准（即使损坏也不回灌旧列表，避免重复）
    try {
      var obj = JSON.parse(raw);
      if (obj && obj.months && typeof obj.months === 'object') {
        Object.keys(obj.months).forEach(function (mk) {
          if (!planIsMonthKey(mk)) return;
          var mo = obj.months[mk] || {};
          var src = Array.isArray(mo.items) ? mo.items : [];
          var items = [];
          src.forEach(function (o) {
            var it = normalizePlanItem(o);
            if (!it) return;
            var dup = false;
            for (var i = 0; i < items.length; i++) if (items[i].k === it.k) { dup = true; break; }
            if (!dup) items.push(it);
          });
          plan.months[mk] = { items: items, updatedAt: Number(mo.updatedAt) || 0 };
        });
      }
    } catch (e) { plan.months = {}; }
  } else {
    migrateLegacyPlan();
  }
  setPlanMonth(planMonthKeys()[0]);
}

/** 落盘；touched 为本次变更的月份（用于写 updatedAt） */
function savePlanStore(touched) {
  if (touched && plan.months[touched]) plan.months[touched].updatedAt = Date.now();
  try {
    localStorage.setItem(PLAN_STORE_V2, JSON.stringify({ v: 1, months: plan.months }));
  } catch (e) { /* 隐私模式等场景写入失败时静默 */ }
  setPlanMonth(plan.month);
  renderPlanFab();
}

/* ---------- 时间 / 票价 / 冲突计算 ---------- */
function planStartMins(it) { return minsOf(String(it.t)); }

/** 散场分钟数；片长缺失返回 -1（不做瞎猜） */
function planEndMins(it) {
  var d = Number(it.min) || 0;
  return d > 0 ? planStartMins(it) + d : -1;
}

/** 散场时间文本；片长缺失时明确显示未知，绝不出现 NaN */
function planEndText(it) {
  var e = planEndMins(it);
  if (e < 0) return '散场未知';
  var cross = e >= 1440;
  var mm = e % 1440;
  return (cross ? '次日 ' : '') + pad2(Math.floor(mm / 60)) + ':' + pad2(mm % 60);
}

function planPriceOf(it) { return priceOf(planRecord(it)); }

function planPriceText(p) {
  if (!p) return '待定';
  return p.max > p.min ? '¥' + p.min + '–' + p.max : '¥' + p.min;
}

function planSorted() {
  return plan.items.slice().sort(function (a, b) {
    if (a.t === b.t) return String(a.h).localeCompare(String(b.h));
    return a.t < b.t ? -1 : 1;
  });
}

/** 冲突：同一影院、同一天，后一场开场 < 前一场散场（相邻刚好衔接不算） */
function planConflicts(items) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var a = items[i];
    var ea = planEndMins(a);
    if (ea < 0) continue;                      // 片长缺失不参与冲突判断
    for (var j = i + 1; j < items.length; j++) {
      var b = items[j];
      if (b.c !== a.c) continue;
      if (String(a.t).slice(0, 10) !== String(b.t).slice(0, 10)) continue;
      if (planStartMins(b) < ea) out.push([a, b]);
    }
  }
  return out;
}

function planConflictText(pair) {
  var a = pair[0], b = pair[1];
  return mdTextOf(String(a.t).slice(0, 10)) + ' ' + String(a.t).slice(11, 16) +
    '《' + a.n + '》与 ' + String(b.t).slice(11, 16) + '《' + b.n + '》';
}

function planTotals(items) {
  var min = 0, max = 0, unknown = 0;
  items.forEach(function (it) {
    var p = planPriceOf(it);
    if (!p) { unknown++; return; }
    min += p.min;
    max += p.max;
  });
  return { min: min, max: max, unknown: unknown, known: items.length - unknown };
}

function planTotalText(tot) {
  if (!tot.known) return '票价待定';
  return tot.max > tot.min ? '¥' + tot.min + '–' + tot.max : '¥' + tot.min;
}

/* ---------- 范围：北京时间当月 + 下月 ---------- */
function planMonthKeys() {
  var n = cstNow();
  var y = n.getFullYear(), m = n.getMonth() + 1;
  var out = [y + '-' + pad2(m)];
  var m2 = m + 1, y2 = y;
  if (m2 > 12) { m2 = 1; y2++; }
  out.push(y2 + '-' + pad2(m2));
  return out;
}

/** 页面已完整加载的月份直接复用，避免重复请求 */
function planAdoptCache(key) {
  var main = state.cache[key];
  if (!main || !main.done) return null;
  mergeExtras(state.cache);
  plan.cache[key] = { amount: main.amount || {}, days: main.days || {}, done: true };
  return plan.cache[key];
}

/** 按需加载单月明细（独立缓存，不写页面进度条） */
function planLoadMonth(key) {
  if (plan.cache[key] && plan.cache[key].done) return Promise.resolve(true);
  if (planAdoptCache(key)) return Promise.resolve(true);

  var y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7));
  var c = plan.cache[key] || (plan.cache[key] = { amount: {}, days: {}, done: false });
  var archP = loadArchive(key);

  return fetchAmount(y, m).then(function (j) {
    c.amount = parseAmount(j);
    var dim = daysInMonth(y, m), tasks = [];
    for (var d = 1; d <= dim; d++) {
      if ((Number(c.amount[key + '-' + pad2(d)]) || 0) > 0) tasks.push(d);
    }
    if (!tasks.length) return 0;
    return new Promise(function (resolve) {
      var LIMIT = 5, idx = 0, active = 0;
      function next() {
        if (idx >= tasks.length && active === 0) { resolve(0); return; }
        while (active < LIMIT && idx < tasks.length) {
          (function (day) {
            active++;
            fetchDay(y, m, day).then(function (json) {
              c.days[day] = (json && json.data && json.data.records) ? json.data.records : [];
            })['catch'](function () { c.days[day] = c.days[day] || []; })
              .then(function () { active--; next(); });
          })(tasks[idx++]);
        }
      }
      next();
    });
  }).then(function () {
    return archP;
  }).then(function (arch) {
    if (arch && arch.length) mergeArchive(c, arch);
    mergeExtras(plan.cache);
    c.done = true;
    return true;
  })['catch'](function () {
    // 接口不可用时仍尽量用存档兜底
    return archP.then(function (arch) {
      if (arch && arch.length) mergeArchive(c, arch);
      mergeExtras(plan.cache);
      c.done = true;
      return !!(arch && arch.length);
    });
  });
}

/** 候选场次：仅江南分馆、仅当月与下月；含已开场/已放映（渲染时标记，不再过滤） */
function planCandidatesList() {
  if (plan.candidates) return plan.candidates;
  mergeExtras(plan.cache);
  var keys = planMonthKeys(), out = [];
  keys.forEach(function (k) {
    var c = plan.cache[k];
    if (!c) return;
    Object.keys(c.days).forEach(function (d) {
      (c.days[d] || []).forEach(function (r) {
        if (r.cinemaInfo !== PLAN_CINEMA) return;
        if (String(r.playTime).slice(0, 7) !== k) return;
        out.push(r);
      });
    });
  });
  out.sort(function (a, b) {
    if (a.playTime === b.playTime) return String(a.movieHall || '').localeCompare(String(b.movieHall || ''));
    return a.playTime < b.playTime ? -1 : 1;
  });
  plan.candidates = out;
  return out;
}

/* ---------- 渲染 ---------- */
function renderPlanFab() {
  var total = planTotalCount();
  var el = $('planFabCount');
  el.textContent = total;
  el.hidden = !total;
  var eh = $('planFabCountHead');
  if (eh) {
    eh.textContent = total;
    eh.hidden = !total;
  }
}

function renderPlanTabs() {
  Array.prototype.forEach.call($('planTabs').querySelectorAll('.tab'), function (t) {
    t.classList.toggle('is-active', t.dataset.planTab === plan.tab);
  });
  var total = planTotalCount();
  var n = $('planTabCount');
  n.textContent = total;
  n.hidden = !total;
}

/** 月份切换可选范围：当月 + 下月，再并入所有已有场次的月份档 */
function planAvailableMonths() {
  var keys = planMonthKeys(), out = {};
  keys.forEach(function (k) { out[k] = 1; });
  Object.keys(plan.months).forEach(function (k) {
    if ((plan.months[k].items || []).length) out[k] = 1;
  });
  return Object.keys(out).sort();
}

/** 月份切换条：显示每月场次数，当前月高亮 */
function renderPlanMonths() {
  var box = $('planMonths');
  if (!box) return;
  box.innerHTML = planAvailableMonths().map(function (k) {
    var arch = plan.months[k];
    var n = arch ? arch.items.length : 0;
    var on = k === plan.month;
    return '<button type="button" class="plan-mtab' + (on ? ' is-active' : '') + '" role="tab"' +
      ' aria-selected="' + (on ? 'true' : 'false') + '" data-m="' + esc(k) + '">' +
      planMonthLabel(k) + (n ? '<i>' + n + '</i>' : '') + '</button>';
  }).join('');
}

function renderPlanSummary() {
  var el = $('planSummary');
  var items = planSorted();
  if (!items.length) { el.hidden = true; el.innerHTML = ''; return; }
  var conf = planConflicts(items);
  var tot = planTotals(items);
  var html = '';
  if (conf.length) {
    var shown = conf.slice(0, 4).map(planConflictText).join('；');
    html += '<div class="plan-warn"><b>时间冲突</b>：' + esc(shown) +
      (conf.length > 4 ? ' 等 ' + conf.length + ' 组' : '') + '（可保留，请自行取舍）</div>';
  }
  if (tot.max > PLAN_BUDGET) {
    html += '<div class="plan-warn budget"><b>已超出 ' + PLAN_BUDGET + ' 元预算</b>（已选场次票价合计 ' +
      esc(planTotalText(tot)) + (tot.unknown ? '，另有 ' + tot.unknown + ' 场待定' : '') + '）</div>';
  }
  el.innerHTML = html;
  el.hidden = !html;
}

function planDateHead(d, count, halls) {
  var hallTxt = halls && halls.length
    ? '<em class="plan-date-halls">' + esc(halls.join('、')) + '</em>'
    : '';
  return '<div class="plan-date-head"><b>' + mdTextOf(d) + '</b><span>' + WEEK[weekdayOf(d)] + '</span>' +
    (count ? '<em>' + count + ' 场</em>' : '') + hallTxt + '</div>';
}

/** 厅号排序：有数字的按数字升序，无数字厅名排最后（同类再按名称） */
function planHallRank(h) {
  var m = String(h || '').match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

/** 拆出紧跟片名的制式标签（4K / IMAX / 3D 等）与剩余备注（连场、映后交流等） */
function planFormatOf(r) {
  var mi = r.movieInfo || {};
  var FORMAT_WORD = /^(4K|IMAX|3D|HFR|杜比全景声|杜比|ATMOS)$/i;
  var tags = [];
  (r.node || []).forEach(function (x) {
    var t = String(x || '').trim();
    if (t && /4K|IMAX|3D|HFR|杜比|ATMOS|Dolby/i.test(t)) tags.push(t);
  });
  var note = String(mi.note || '').trim();
  if (note) {
    var parts = note.split(/\s*(?:·|｜|\||，|,|；|;)\s*/);
    var lead = [];
    while (parts.length && FORMAT_WORD.test(String(parts[0]).trim())) {
      lead.push(String(parts.shift()).trim());
    }
    if (lead.length) {
      tags = tags.concat(lead);
      note = parts.join(' · ');
    }
  }
  var nameUp = String(mi.movieName || '').toUpperCase();
  tags = tags.filter(function (t, i, arr) {
    return nameUp.indexOf(t.toUpperCase()) < 0 &&
      arr.map(function (x) { return x.toUpperCase(); }).indexOf(t.toUpperCase()) === i;
  });
  return { tags: tags, note: note };
}

function renderPlanCandidates() {
  var box = $('planCandidates');
  var q = normName(plan.search);
  var all = planCandidatesList();
  var list = all.filter(function (r) {
    if (!q) return true;
    var mi = r.movieInfo || {};
    return normName(mi.movieName).indexOf(q) >= 0 || normName(mi.englishName).indexOf(q) >= 0;
  });
  plan.candIndex = {};

  if (!list.length) {
    box.innerHTML = '<div class="plan-empty">' + (all.length
      ? '没有匹配「' + esc(plan.search) + '」的场次。'
      : (plan.loading ? '正在加载当月与下月排片…'
        : '当月与下月暂无可选场次（下月片单可能尚未发布，或均已开场）。')) + '</div>';
    return;
  }

  // 先按日期、日期内再按影厅分组；厅号自然排序，同厅内按开场时间升序
  var groups = [], byDate = {};
  list.forEach(function (r) {
    var d = String(r.playTime).slice(0, 10);
    var g = byDate[d];
    if (!g) { g = byDate[d] = { d: d, halls: [], hallMap: {} }; groups.push(g); }
    var h = String(r.movieHall || '');
    var hg = g.hallMap[h];
    if (!hg) { hg = g.hallMap[h] = { h: h, items: [] }; g.halls.push(hg); }
    hg.items.push(r);
  });
  groups.forEach(function (g) {
    g.halls.sort(function (a, b) {
      var na = planHallRank(a.h), nb = planHallRank(b.h);
      if (na !== nb) return na - nb;
      return a.h.localeCompare(b.h, 'zh');
    });
    g.halls.forEach(function (hg) {
      hg.items.sort(function (a, b) {
        return a.playTime < b.playTime ? -1 : (a.playTime > b.playTime ? 1 : 0);
      });
    });
  });

  box.innerHTML = groups.map(function (g) {
    return '<div class="plan-day">' + planDateHead(g.d) + g.halls.map(function (hg) {
      return '<div class="plan-hall-head" data-h="' + esc(hg.h) + '"><b>' + esc(hg.h || '影厅未知') + '</b><span>' +
        hg.items.length + ' 场</span></div>' +
        hg.items.map(function (r) {
          var mi = r.movieInfo || {};
          var k = planKeyOf({ t: r.playTime, c: r.cinemaInfo, h: r.movieHall, n: mi.movieName });
          plan.candIndex[k] = r;
          var added = planHas(k);
          var p = priceOf(r);
          var end = planEndMins({
            t: r.playTime, min: Number(mi.movieMinute) || 0
          });
          var endTxt = '';
          if (end >= 0) {
            var mm = end % 1440;
            endTxt = (end >= 1440 ? '次日 ' : '') + pad2(Math.floor(mm / 60)) + ':' + pad2(mm % 60);
          }
          var fmt = planFormatOf(r);
          var fmtTags = fmt.tags.map(function (t) {
            return '<span class="fmt-title">' + esc(t) + '</span>';
          }).join('');
          // 已放映的场次保留在列表并弱化显示，但仍可加入计划（补录已看场次）；已选中的仍可取消
          var past = String(r.playTime) < nowStamp();
          var evTag = planEventBadge(r);
          return '<button type="button" class="plan-cand' + (added ? ' is-added' : '') +
            (past ? ' is-past' : '') + '" data-k="' + esc(k) + '"' +
            ' aria-pressed="' + (added ? 'true' : 'false') + '"' +
            ' aria-label="' + (added ? '取消加入' : '加入') + '《' + esc(mi.movieName) + '》' +
            (past ? '（已放映）' : '') + '">' +
            '<span class="pc-when"><b>' + esc(String(r.playTime).slice(11, 16)) + '</b>' +
              (endTxt ? '<i>– ' + esc(endTxt) + '</i>' : '') + '</span>' +
            '<span class="pc-body"><span class="pc-title"><span class="pc-name">《' + esc(mi.movieName) + '》</span>' +
              fmtTags + evTag + (past ? '<span class="pc-past">已放映</span>' : '') + '</span>' +
              (fmt.note ? '<span class="pc-note">' + esc(fmt.note) + '</span>' : '') +
              (r.extra ? '<span class="sr-only">公众号补充场次（淘票票可购票）</span>' : '') + '</span>' +
            '<span class="pc-info">' +
              '<span class="pc-price' + (p ? '' : ' pending') + '">' + esc(planPriceText(p)) + '</span>' +
            '</span>' +
            '<span class="pc-add">' + (added ? '取消' : '加入') + '</span>' +
          '</button>';
        }).join('');
    }).join('') + '</div>';
  }).join('');
}

/* ---------- 特殊活动标注（映前导赏 / 映后交流等） ----------
 * 数据来自 events-2026-11.js（人工核对公众号片单文章后写入），
 * 按「日期 | 时间 | 影厅 | 片名」精确匹配；找不到就不标，不做猜测。
 */
var EVENT_MAP = {};
(function buildEventMap() {
  var info = window.EVENT_INFO;
  if (!info || !info.events) return;
  info.events.forEach(function (ev) {
    EVENT_MAP[ev.date + '|' + ev.time + '|' + ev.hall + '|' + ev.movie] = ev;
  });
})();

function planEventOf(x) {
  var t = String(x.t || x.playTime || '');
  var h = String(x.h || x.movieHall || '');
  var n = String(x.n || (x.movieInfo && x.movieInfo.movieName) || '');
  return EVENT_MAP[t.slice(0, 10) + '|' + t.slice(11, 16) + '|' + h + '|' + n] || null;
}

function planEventBadge(x) {
  var ev = planEventOf(x);
  if (!ev) return '';
  return '<span class="ev-badge" title="' + esc(ev.note || ev.type) + '">' + esc(ev.type) + '</span>';
}

function renderPlanMine() {
  var items = planSorted();
  var tot = planTotals(items);
  var arch = plan.months[plan.month];
  var upd = planUpdatedText(arch ? arch.updatedAt : 0);
  $('planTotal').innerHTML = items.length
    ? '<b>共 ' + items.length + ' 场</b> · 合计 <b class="plan-total-amt">' + esc(planTotalText(tot)) + '</b>' +
      (tot.unknown ? ' · <span class="plan-pending">' + tot.unknown + ' 场待定</span>' : '') +
      (upd ? ' · <span class="plan-updated">更新于 ' + esc(upd) + '</span>' : '')
    : '';
  if (!items.length) {
    $('planList').innerHTML = '<div class="plan-empty">「' + esc(planMonthLabel(plan.month)) +
      '」还没有加入场次。切到「选择场次」挑几场吧。<br>' +
      '<span class="muted">仅江南分馆 · 当月与下月</span></div>';
    return;
  }
  var confKeys = {};
  planConflicts(items).forEach(function (p) { confKeys[p[0].k] = 1; confKeys[p[1].k] = 1; });
  var groups = [], cur = null;
  items.forEach(function (it) {
    var d = String(it.t).slice(0, 10);
    if (!cur || cur.d !== d) { cur = { d: d, items: [] }; groups.push(cur); }
    cur.items.push(it);
  });

  $('planList').innerHTML = groups.map(function (g) {
    // 厅号统一放到日期组头上：同日同厅只显示一个厅名，跨厅按厅号顺序用「、」串联
    var halls = [];
    g.items.forEach(function (it) {
      var h = String(it.h || '').trim() || '未标注影厅';
      if (halls.indexOf(h) < 0) halls.push(h);
    });
    halls.sort(function (a, b) {
      return (planHallRank(a) - planHallRank(b)) || a.localeCompare(b, 'zh');
    });
    return planDateHead(g.d, g.items.length, halls) + g.items.map(function (it) {
      var p = planPriceOf(it);
      var bad = !!confKeys[it.k];
      var endTxt = planEndText(it);
      return '<div class="plan-item' + (bad ? ' conflict' : '') + '">' +
        '<div class="plan-time"><b>' + esc(String(it.t).slice(11, 16)) + '</b>' +
          '<span>– ' + esc(endTxt) + '</span></div>' +
        '<div class="plan-title"><span class="plan-name">《' + esc(it.n) + '》</span>' +
          (String(it.t) < nowStamp() ? '<span class="plan-past">已放映</span>' : '') +
          planEventBadge(it) +
          (bad ? '<span class="plan-flag">时间冲突</span>' : '') + '</div>' +
        '<div class="plan-price' + (p ? '' : ' pending') + '">' + esc(planPriceText(p)) + '</div>' +
        '<button type="button" class="plan-del" data-k="' + esc(it.k) + '" aria-label="移除该场次">&times;</button>' +
      '</div>';
    }).join('');
  }).join('');
}

function renderPlan() {
  renderPlanFab();
  renderPlanTabs();
  renderPlanMonths();
  renderPlanSummary();
  $('planAddPane').hidden = plan.tab !== 'add';
  $('planMinePane').hidden = plan.tab !== 'mine';
  var loadEl = $('planLoad');
  if (plan.loading) {
    loadEl.hidden = false;
    loadEl.textContent = '正在加载当月与下月排片…';
  } else if (plan.error) {
    loadEl.hidden = false;
    loadEl.textContent = plan.error;
  } else {
    loadEl.hidden = true;
  }
  if (plan.tab === 'add') renderPlanCandidates();
  else renderPlanMine();
}

function planToast(msg) {
  var el = $('planToast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(plan.toastTimer);
  plan.toastTimer = setTimeout(function () { el.hidden = true; }, 2800);
}

/* ---------- 导出 PNG（Canvas 自绘，无外部依赖） ---------- */
function exportPlanPng() {
  var items = planSorted();
  if (!items.length) { planToast(planMonthLabel(plan.month) + '计划为空，先加入场次再导出'); return; }
  var conf = planConflicts(items);
  var confKeys = {};
  conf.forEach(function (p) { confKeys[p[0].k] = 1; confKeys[p[1].k] = 1; });
  var tot = planTotals(items);

  var mk = plan.month;
  var rangeText = '仅江南分馆 · ' + mk.slice(0, 4) + ' 年 ' + Number(mk.slice(5, 7)) + ' 月';
  var titleText = Number(mk.slice(5, 7)) + ' 月观影计划';

  var W = 620, S = 2, PAD = 40, FONT = '"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif';
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) { planToast('当前浏览器不支持导出图片'); return; }
  canvas.width = W * S;

  function setFont(size, weight) { ctx.font = (weight || 'normal') + ' ' + size + 'px ' + FONT; }
  function wrap(text, maxW) {
    var lines = [], cur = '';
    for (var i = 0; i < text.length; i++) {
      if (ctx.measureText(cur + text.charAt(i)).width > maxW && cur) {
        lines.push(cur); cur = text.charAt(i);
      } else cur += text.charAt(i);
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fit(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var s = text;
    while (s.length && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  // 摘要与提示行（先量宽度换行，再据此计算画布高度）
  var summary = '共 ' + items.length + ' 场 · 合计 ' + planTotalText(tot) +
    (tot.unknown ? '（' + tot.unknown + ' 场票价待定）' : '');
  setFont(12.5);
  var warnLines = [];
  conf.slice(0, 5).forEach(function (p) { warnLines.push('时间冲突：' + planConflictText(p)); });
  if (conf.length > 5) warnLines.push('另有 ' + (conf.length - 5) + ' 组时间冲突');
  if (tot.max > PLAN_BUDGET) warnLines.push('已超出 ' + PLAN_BUDGET + ' 元预算（已选场次票价合计 ' + planTotalText(tot) + '）');

  var summaryW = W - PAD * 2 - 28;
  var sumLines = wrap(summary, summaryW);
  var warnWrapped = [];
  warnLines.forEach(function (t) { warnWrapped = warnWrapped.concat(wrap(t, summaryW)); });

  var groups = [];
  var cur = null;
  items.forEach(function (it) {
    var d = String(it.t).slice(0, 10);
    if (!cur || cur.d !== d) { cur = { d: d, items: [] }; groups.push(cur); }
    cur.items.push(it);
  });

  // 布局（逻辑坐标，实际按 S 倍输出）
  var top = 6, yTitle = top + 34, ySub = yTitle + 26, yDiv = ySub + 18;
  var boxTop = yDiv + 18, lineH = 20;
  var boxH = 20 + lineH * (sumLines.length + warnWrapped.length);
  var listTop = boxTop + boxH + 18;
  var listH = 0;
  groups.forEach(function (g) { listH += 36 + g.items.length * 28; });
  if (groups.length > 1) listH += (groups.length - 1) * 20;
  var footerTop = listTop + listH + 24;
  var H = footerTop + 44;

  canvas.height = H * S;
  ctx.scale(S, S);

  // 背景与顶部色条
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d4202e';
  ctx.fillRect(0, top - 6, W, 6);

  // 标题
  setFont(28, 'bold');
  ctx.fillStyle = '#22242b';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(titleText, PAD, yTitle);
  setFont(11.5);
  ctx.fillStyle = '#767c8a';
  var genText = '生成于 ' + todayStr();
  ctx.fillText(genText, W - PAD - ctx.measureText(genText).width, yTitle - 2);

  setFont(12.5);
  ctx.fillStyle = '#767c8a';
  ctx.fillText(rangeText, PAD, ySub);

  ctx.strokeStyle = '#e4e6eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, yDiv + 0.5);
  ctx.lineTo(W - PAD, yDiv + 0.5);
  ctx.stroke();

  // 摘要卡片
  ctx.fillStyle = (warnWrapped.length || tot.max > PLAN_BUDGET) ? '#fff7f7' : '#f4f5f7';
  ctx.strokeStyle = (warnWrapped.length || tot.max > PLAN_BUDGET) ? 'rgba(212,32,46,.25)' : '#e4e6eb';
  roundRect(PAD, boxTop, W - PAD * 2, boxH, 10);
  ctx.fill();
  ctx.stroke();

  var ty = boxTop + 26;
  setFont(13, 'bold');
  ctx.fillStyle = '#22242b';
  ctx.fillText(sumLines[0], PAD + 14, ty);
  sumLines.slice(1).forEach(function (l) { ty += lineH; setFont(13); ctx.fillText(l, PAD + 14, ty); });
  setFont(12);
  ctx.fillStyle = '#8a4a09';
  warnWrapped.forEach(function (l) { ty += lineH; ctx.fillText(l, PAD + 14, ty); });

  // 场次清单
  var y = listTop;
  groups.forEach(function (g, gi) {
    if (gi) y += 20;   // 日期分组之间留白，避免组标题贴着上一组最后一行
    ctx.fillStyle = '#d4202e';
    ctx.fillRect(PAD, y - 12, 3, 14);
    setFont(14, 'bold');
    ctx.fillStyle = '#22242b';
    ctx.fillText(mdTextOf(g.d) + ' ' + WEEK[weekdayOf(g.d)], PAD + 10, y);
    y += 30;
    g.items.forEach(function (it) {
      var rowTop = y;
      var bad = !!confKeys[it.k];
      if (bad) {
        ctx.fillStyle = 'rgba(180,83,9,.08)';
        roundRect(PAD - 4, rowTop + 2, W - PAD * 2 + 8, 24, 7);
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.fillRect(PAD - 4, rowTop + 2, 3, 24);
      }
      var base = rowTop + 18;
      var p = planPriceOf(it);
      var timeEnd = planEndText(it);
      setFont(12.5);
      ctx.fillStyle = '#22242b';
      ctx.fillText(it.t.slice(11, 16), PAD + 6, base);
      var tw = ctx.measureText(it.t.slice(11, 16)).width;
      setFont(10.5);
      ctx.fillStyle = '#767c8a';
      ctx.fillText('– ' + timeEnd, PAD + 6 + tw + 4, base);

      setFont(11, 'normal');
      ctx.fillStyle = '#767c8a';
      ctx.fillText(fit(it.h || '影厅未知', 62), PAD + 132, base);

      // 票价固定右对齐；有冲突时把「时间冲突」小标放在票价左侧，两者不重叠
      var ptxt = planPriceText(p);
      setFont(12, 'bold');
      var pw = ctx.measureText(ptxt).width;
      var priceX = W - PAD - pw;
      var confW = 0;
      var confX = priceX;
      if (bad) {
        setFont(9);
        confW = ctx.measureText('时间冲突').width;
        confX = priceX - 10 - confW;
      }

      // 制式标签与主列表同规则：去重，片名本身已含该制式则不重复
      var tags = planFormatOf(planRecord(it)).tags;
      var chipPad = 5, chipGap = 4, chipH = 16;
      setFont(10, 'bold');
      var chipW = tags.map(function (t) { return ctx.measureText(t).width + chipPad * 2; });
      var tagsW = chipW.reduce(function (a, b) { return a + b; }, 0) +
        (tags.length ? (tags.length - 1) * chipGap : 0);

      var nameX = PAD + 196;
      var rightBound = bad ? confX : priceX;
      var nameMax = Math.max(40, rightBound - 12 - nameX - (tagsW ? tagsW + 7 : 0));
      setFont(12.5, 'bold');
      ctx.fillStyle = '#22242b';
      var nameTxt = fit('《' + it.n + '》', nameMax);
      ctx.fillText(nameTxt, nameX, base);
      var nw = ctx.measureText(nameTxt).width;

      // 制式小标签紧跟片名：片名先按剩余宽度截断，标签始终完整显示
      if (tags.length) {
        var cx = nameX + nw + 7;
        var chipTop = base - 12;
        tags.forEach(function (t, i) {
          setFont(10, 'bold');
          roundRect(cx, chipTop, chipW[i], chipH, 4.5);
          ctx.fillStyle = '#e7e9ee';
          ctx.fill();
          ctx.strokeStyle = '#e4e6eb';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#4b5563';
          ctx.textBaseline = 'middle';
          ctx.fillText(t, cx + chipPad, chipTop + chipH / 2);
          ctx.textBaseline = 'alphabetic';
          cx += chipW[i] + chipGap;
        });
      }

      if (bad) {
        setFont(9);
        ctx.fillStyle = '#b45309';
        ctx.fillText('时间冲突', confX, base);
      }

      setFont(12, 'bold');
      ctx.fillStyle = p ? '#b01b26' : '#767c8a';
      ctx.fillText(ptxt, priceX, base);

      y += 28;
    });
    y += 6;
  });

  // 页脚
  ctx.strokeStyle = '#e4e6eb';
  ctx.beginPath();
  ctx.moveTo(PAD, footerTop + 0.5);
  ctx.lineTo(W - PAD, footerTop + 0.5);
  ctx.stroke();
  setFont(10.5);
  ctx.fillStyle = '#9aa0ad';
  ctx.fillText('中国电影资料馆 · 排片查询 · ' + titleText + '（仅江南分馆）', PAD, footerTop + 18);
  ctx.fillText('价格为站内已登记票价，实际以官方购票页为准。', PAD, footerTop + 34);

  try {
    var url = canvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = url;
    a.download = '观影计划_' + mk + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 0);
    planToast('已导出「' + planMonthLabel(mk) + '」：' + W * S + ' × ' + Math.round(H * S) + ' px');
  } catch (e) {
    planToast('导出失败：' + (e && e.message ? e.message : '浏览器不支持'));
  }
}

/* ---------- 交互 ---------- */
function openPlan() {
  $('planModal').hidden = false;
  document.body.classList.add('modal-open');
  // 每次打开先回到当月（默认视图），再看该月是否已有场次决定落在哪个页签
  setPlanMonth(planMonthKeys()[0]);
  plan.tab = planTotalCount() ? 'mine' : 'add';
  renderPlan();
  planLoadAll();
  setTimeout(function () { $('planSearch').focus(); }, 30);
}

function closePlan() {
  $('planModal').hidden = true;
  if ($('seatModal').hidden) document.body.classList.remove('modal-open');
}

function planLoadAll() {
  if (plan.loading) return;
  var keys = planMonthKeys();
  var need = keys.some(function (k) { return !(plan.cache[k] && plan.cache[k].done); });
  if (!need) return;
  plan.loading = true;
  plan.error = '';
  plan.candidates = null;
  renderPlan();
  var failed = 0;
  Promise.all(keys.map(function (k) {
    return planLoadMonth(k).then(function (ok) { if (!ok) failed++; });
  })).then(function () {
    plan.loading = false;
    plan.candidates = null;
    plan.error = failed ? '部分排片加载失败，以下为可用场次（可稍后重试）' : '';
    renderPlan();
  });
}

$('planBtn').addEventListener('click', openPlan);
// 页头入口为移动端新增元素；若页面 HTML 尚未更新（缓存旧版）则跳过，避免中断后续初始化
var planBtnHeadEl = $('planBtnHead');
if (planBtnHeadEl) planBtnHeadEl.addEventListener('click', openPlan);
$('planClose').addEventListener('click', closePlan);
$('planModal').addEventListener('click', function (e) {
  if (e.target === this) closePlan();
});

$('planTabs').addEventListener('click', function (e) {
  var btn = e.target.closest('.tab');
  if (!btn) return;
  plan.tab = btn.dataset.planTab;
  renderPlan();
});

var planMonthsEl = $('planMonths');
if (planMonthsEl) planMonthsEl.addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('.plan-mtab') : null;
  if (!btn) return;
  var mk = btn.getAttribute('data-m');
  if (!planIsMonthKey(mk) || mk === plan.month) return;
  setPlanMonth(mk);
  renderPlan();
});

var planSearchTimer;
$('planSearch').addEventListener('input', function () {
  var v = this.value.trim();
  clearTimeout(planSearchTimer);
  planSearchTimer = setTimeout(function () { plan.search = v; renderPlanCandidates(); }, 160);
});

$('planCandidates').addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('.plan-cand') : null;
  if (!btn) return;
  var k = btn.getAttribute('data-k');
  var r = plan.candIndex[k];
  if (!r) return;

  // 已选：就地取消（按其所属月份精确移除，避免误删另一月的同名同时刻场次）
  var oldMk = planMonthOfKey(k);
  if (oldMk) {
    plan.months[oldMk].items = plan.months[oldMk].items.filter(function (it) { return it.k !== k; });
    savePlanStore(oldMk);
    renderPlan();
    planToast('已取消「' + planMonthLabel(oldMk) + '」：' +
      mdTextOf(String(r.playTime).slice(0, 10)) + ' ' + String(r.playTime).slice(11, 16) +
      '《' + (r.movieInfo || {}).movieName + '》');
    return;
  }

  var snap = planSnapshot(r);
  var mk = planMonthOf(snap);
  if (!planIsMonthKey(mk)) { planToast('该场次缺少有效日期，无法加入计划'); return; }
  planArch(mk).items.push(snap);
  savePlanStore(mk);
  planToast('已加入「' + planMonthLabel(mk) + '」：' + mdTextOf(String(r.playTime).slice(0, 10)) + ' ' +
    String(r.playTime).slice(11, 16) + '《' + (r.movieInfo || {}).movieName + '》');
  renderPlan();
});

$('planList').addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('.plan-del') : null;
  if (!btn) return;
  var k = btn.getAttribute('data-k');
  var mk = plan.month;
  var arch = plan.months[mk];
  if (arch) arch.items = arch.items.filter(function (it) { return it.k !== k; });
  savePlanStore(mk);
  renderPlan();
  planToast('已从「' + planMonthLabel(mk) + '」计划中移除');
});

$('planClear').addEventListener('click', function () {
  var mk = plan.month;
  var n = plan.items.length;
  if (!n) { planToast(planMonthLabel(mk) + '计划已经是空的'); return; }
  var others = Object.keys(plan.months).filter(function (k) {
    return k !== mk && (plan.months[k].items || []).length;
  });
  var msg = '确定清空「' + planMonthLabel(mk) + '」的 ' + n + ' 场观影计划吗？' +
    (others.length ? '\n仅清空本月，' + others.map(planMonthLabel).join('、') + '的计划会保留。' : '');
  if (typeof confirm === 'function' && !confirm(msg)) return;
  planArch(mk).items = [];
  savePlanStore(mk);
  renderPlan();
  planToast('已清空「' + planMonthLabel(mk) + '」观影计划');
});

$('planExport').addEventListener('click', exportPlanPng);

loadPlanStore();
renderPlanFab();

/* ---------- 启动 ---------- */
/* 默认展示「今天」（Asia/Shanghai）；URL 带 ?date=YYYY-MM-DD 时按参数走，
 * 便于分享具体某天的排片；不做本地持久化，刷新后回到今天。 */
(function initDay() {
  var ds = '';
  try {
    ds = (new URLSearchParams(location.search).get('date') || '').trim();
  } catch (e) { ds = ''; }
  setDay(isValidDate(ds) ? ds : todayStr());
})();
renderMonthLabel();
load(false);
