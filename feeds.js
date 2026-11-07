/* =========================================================
 * 公众号文章清单与入口（feeds.js）
 *
 * 用途：为页头「北京公众号 / 江南公众号」两个入口提供数据，并在弹层中
 *       按公众号分组、按发布日期倒序展示已收录的文章，点击直达微信原文。
 *
 * 展示规则：
 *   - 默认只显示近 30 天（含第 30 天，以页面加载当天为基准）的文章；
 *     更早的文章折叠，通过「显示更早文章（N）」按钮展开；
 *   - 标了 pinned 的文章不受 30 天限制，始终显示并固定排在列表最上方。
 *
 * 字段说明（window.FEEDS.accounts[]）：
 *   id          唯一标识，与页头按钮的 data-feed 对应（勿随意修改）
 *   name        公众号名称，显示在列表标题
 *   short       页签上的简称（留空则用 name），避免窄屏页签换行
 *   desc        一句话说明（如 北京 / 苏州），可留空
 *   searchHint  在微信里搜索该公众号的关键词，用于面板内的「其它查看方式」说明
 *   articles[]  文章列表，每条包含：
 *                 title   文章标题（与原文一致）
 *                 date    发布日期，格式 YYYY-MM-DD（用于排序、近一月过滤与显示）
 *                 url     必须是该公众号的微信原文链接（https://mp.weixin.qq.com/s/...）；
 *                         不接受网易号、搜狐号等第三方转载页，也不猜 token
 *                 summary 可选摘要，仅在能核实原文内容时填写，不写转载来源
 *                 pinned  可选布尔，置顶标记；置顶文章始终显示并排在最前
 *
 * 置顶标记维护：
 *   微信公众号没有可读取置顶状态的接口，站内无法自动判定，必须人工标记。
 *   在公众号主页核对实际置顶文章后，给对应文章加 pinned: true；取消置顶时
 *   删除该字段（或改为 false）。置顶文章之间按日期倒序，同日按清单顺序，
 *   排序稳定；置顶始终排在未置顶文章之前。
 *
 * 维护方式：
 *   1. 新收录一篇文章时，只在对应公众号的 articles 数组追加一条
 *      { title: '标题', date: 'YYYY-MM-DD', url: '原文链接' } 即可；
 *   2. 不需要改 feeds.js 之外的任何代码，页面会自动按日期倒序渲染；
 *   3. 只收录该公众号的微信原文：打开链接后需同时确认标题一致、页面署名为该
 *      公众号、发布日期可确认；三者不满足就不收录，不用转载页顶替、不改写标题、
 *      不猜链接；找不到就留空，数量少也按实际上线；
 *   4. 微信公众号没有可跨域读取的文章列表接口（mp.weixin.qq.com 有反爬与
 *      防盗链，浏览器端 fetch 会被拦截），因此清单必须人工维护，
 *      本站不做实时抓取、也不经过任何第三方抓取服务。
 * ========================================================= */
window.FEEDS = {
  accounts: [
    {
      id: 'beijing',
      name: '中国电影资料馆',
      short: '北京',
      desc: '北京 · 服务号',
      searchHint: '中国电影资料馆',
      articles: [
        {
          title: '放映预告 | 冬日渐近，11月片单热烈呈现！',
          date: '2026-10-27',
          url: 'https://mp.weixin.qq.com/s/LwUN3fxv3QZYPIEjkeRPhg',
          summary: '11 月片单，含小西天、百子湾艺术影院全月排片长图'
        },
        {
          title: '默片的万千气象：法国百代经典影片回顾展双城联映',
          date: '2026-10-24',
          url: 'https://mp.weixin.qq.com/s/OLw0_rXMfTtlsLnRyt3ZeQ',
          summary: '法国百代经典默片回顾展，北京、苏州双城联映'
        },
        {
          title: '致敬经典·国际修复电影展 | 贝克街的侦探遇见茂瑙的日出',
          date: '2026-10-24',
          url: 'https://mp.weixin.qq.com/s/CA_BPbhqJXeYyDmeWyRn-g',
          summary: '致敬经典·国际修复电影展专题文章'
        },
        {
          title: '嘉宾招募｜修复时光，邀你共赴光影之约——致敬经典·修复电影论坛嘉宾招募',
          date: '2026-10-19',
          url: 'https://mp.weixin.qq.com/s/su9j0ILXhMefO4lYNeYknA',
          summary: '致敬经典·修复电影论坛嘉宾招募'
        },
        {
          title: '金秋九月，艺术影院30周年片单精彩呈现',
          date: '2026-08-26',
          url: 'https://mp.weixin.qq.com/s/lJ0recj0pi79nFultUdy8g',
          summary: '艺术影院开放30周年，9月片单'
        }
      ]
    },
    {
      id: 'jiangnan',
      name: '中国电影资料馆江南分馆',
      short: '江南分馆',
      desc: '苏州 · 江南分馆',
      searchHint: '中国电影资料馆江南分馆',
      articles: [
        {
          title: '影人对话｜甄珍、林文淇：修复的不只是影像，更是银幕上的女性芳华',
          date: '2026-11-06',
          url: 'https://mp.weixin.qq.com/s/pG_XZ0Ujq2HPBqi9iIpI6Q',
          summary: '影人对话｜甄珍、林文淇谈修复与银幕女性'
        },
        {
          title: '影人对话｜林文淇：棋局终了，忠魂不散',
          date: '2026-11-05',
          url: 'https://mp.weixin.qq.com/s/cEz1C_kauZIIOCtaxbkxnw',
          summary: '影人对话｜林文淇'
        },
        {
          title: '柏林电影节入围影片《上海女儿》 即将登陆江南分馆',
          date: '2026-11-04',
          url: 'https://mp.weixin.qq.com/s/sxk1XYzDTqMad-8iCPLekA',
          summary: '《上海女儿》江南分馆放映预告'
        },
        {
          title: '世界音像遗产日 | 珍贵馆藏《光辉灿烂》京苏再现',
          date: '2026-10-30',
          url: 'https://mp.weixin.qq.com/s/EZo5g4lT_Y0W4zSoNMlufw',
          summary: '世界音像遗产日，馆藏《光辉灿烂》京苏再现'
        },
        {
          title: '江南分馆11月片单｜百年辉煌，戏梦重逢',
          date: '2026-10-28',
          url: 'https://mp.weixin.qq.com/s/i7FuuAAv7jPVUjAKAZQKMA',
          summary: '江南分馆 11 月片单，含全月观影日历长图'
        },
        {
          title: '影人对话｜戴锦华：残破庭院里的时代与人心',
          date: '2026-10-27',
          url: 'https://mp.weixin.qq.com/s/F0W8Nph4n2iqj2lN1glFJg',
          summary: '影人对话｜戴锦华谈“庭院里的女人”'
        },
        {
          title: '致敬经典·国际修复电影展 | 贝克街的侦探遇见茂瑙的日出',
          date: '2026-10-25',
          url: 'https://mp.weixin.qq.com/s/0p0m199pB3EFpAdB-AJTKA',
          summary: '致敬经典·国际修复电影展专题文章'
        },
        {
          title: '老电影新亮相，成为影院里的“新鲜事”',
          date: '2026-10-21',
          url: 'https://mp.weixin.qq.com/s/veNKPKIR1U5C7UAowiBYFQ',
          summary: '老电影新亮相，成为影院里的“新鲜事”'
        },
        {
          title: '心有千千结，终有重逢时——甄珍来苏州了！',
          date: '2026-10-20',
          url: 'https://mp.weixin.qq.com/s/enGZU_EukAi4U8DQ6g758w',
          summary: '甄珍来苏州，江南分馆映后交流'
        },
        {
          title: '江南分馆10月片单｜时空穿越，戏梦江南',
          date: '2026-09-22',
          url: 'https://mp.weixin.qq.com/s/hZDmG8wFdVYozh2E9DCAnw',
          summary: '江南分馆10月片单'
        },
        {
          title: '10月特别策划 | 庭院里的女人：景观与女性',
          date: '2026-09-21',
          url: 'https://mp.weixin.qq.com/s/rHVAwOBZN588jIteipIIKw',
          summary: '10月特别策划“庭院里的女人：景观与女性”'
        },
        {
          title: '映后交流｜《燃烧吧！爸爸》：一场轻盈灵动的告别仪式',
          date: '2026-09-19',
          url: 'https://mp.weixin.qq.com/s/b3YwoeEYvTwSGZGa7_O_Lg',
          summary: '《燃烧吧！爸爸》映后交流'
        }
      ]
    }
  ]
};

/* ---------- 弹层交互（入口按钮在 index.html 中静态挂载） ---------- */
(function () {
  var modal = document.getElementById('feedsModal');
  var tabsEl = document.getElementById('feedsTabs');
  var listEl = document.getElementById('feedsList');
  var subEl = document.getElementById('feedsSub');
  var titleEl = document.getElementById('feedsTitle');
  var hintEl = document.getElementById('feedsHint');
  var toolbarEl = document.getElementById('feedsToolbar');
  var closeBtn = document.getElementById('feedsClose');
  if (!modal || !tabsEl || !listEl || !closeBtn) return;

  var data = (window.FEEDS && Array.isArray(window.FEEDS.accounts)) ? window.FEEDS.accounts : [];
  var current = data.length ? data[0].id : '';
  var lastTrigger = null;
  var showAll = false;       // false=只看近一月；true=展开全部
  var RECENT_DAYS = 30;      // 近一月窗口，含第 30 天

  // 以页面加载当天（本地日期）为基准，往前推 30 天得到窗口起点
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var cutoff = new Date(today.getTime());
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

  function parseDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(str || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function isRecent(dateStr) {
    var d = parseDate(dateStr);
    return !!d && d.getTime() >= cutoff.getTime();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function accountById(id) {
    for (var i = 0; i < data.length; i++) {
      if (data[i].id === id) return data[i];
    }
    return null;
  }

  function sortedArticles(acc) {
    var list = (acc && Array.isArray(acc.articles)) ? acc.articles.slice() : [];
    // 置顶优先；组内按日期倒序，同日保持清单顺序（稳定排序）
    list = list.map(function (it, i) { return { item: it, i: i }; });
    list.sort(function (a, b) {
      var pa = a.item.pinned === true;
      var pb = b.item.pinned === true;
      if (pa !== pb) return pa ? -1 : 1;
      var byDate = String(b.item.date || '').localeCompare(String(a.item.date || ''));
      if (byDate) return byDate;
      return a.i - b.i;
    });
    return list.map(function (x) { return x.item; });
  }

  // 拆分：置顶 / 近一月（不含置顶） / 更早（不含置顶）
  function partition(acc) {
    var pinned = [], recent = [], older = [];
    sortedArticles(acc).forEach(function (it) {
      if (it.pinned === true) pinned.push(it);
      else if (isRecent(it.date)) recent.push(it);
      else older.push(it);
    });
    return { pinned: pinned, recent: recent, older: older };
  }

  // 该号清单中最新的发布日期，用于在面板上显示清单新鲜度
  function latestDate(acc) {
    var d = '';
    var list = (acc && Array.isArray(acc.articles)) ? acc.articles : [];
    for (var i = 0; i < list.length; i++) {
      var s = String(list[i].date || '');
      if (s && s > d) d = s;
    }
    return d;
  }

  function renderTabs() {
    tabsEl.innerHTML = data.map(function (acc) {
      var n = sortedArticles(acc).length;
      return '<button type="button" class="feeds-tab' + (acc.id === current ? ' is-active' : '') + '"' +
        ' role="tab" aria-selected="' + (acc.id === current ? 'true' : 'false') + '"' +
        ' aria-label="' + esc(acc.name) + '，' + n + ' 篇文章"' +
        ' data-feed-tab="' + esc(acc.id) + '">' + esc(acc.short || acc.name) +
        '<span class="feeds-count">' + n + '</span></button>';
    }).join('');
  }

  function renderToolbar(hiddenCount) {
    if (!toolbarEl) return;
    if (!hiddenCount) {
      toolbarEl.hidden = true;
      toolbarEl.innerHTML = '';
      return;
    }
    toolbarEl.hidden = false;
    toolbarEl.innerHTML = '<button type="button" class="feeds-toggle" id="feedsToggle" aria-expanded="' +
      (showAll ? 'true' : 'false') + '">' +
      (showAll ? '收起更早文章（' + hiddenCount + '）' : '显示更早文章（' + hiddenCount + '）') +
      '</button>';
  }

  function renderList() {
    var acc = accountById(current);
    if (!acc) {
      renderToolbar(0);
      subEl.textContent = '暂无可展示的公众号。';
      listEl.innerHTML = '<div class="feeds-empty">暂未收录公众号文章。</div>';
      return;
    }
    titleEl.textContent = acc.name + ' · 文章';
    var latest = latestDate(acc);
    subEl.textContent = (acc.desc ? acc.desc + ' · ' : '') + '默认显示近一个月，更早文章可展开查看' +
      (latest ? ' · 清单最近收录 ' + latest : '');
    if (hintEl) {
      hintEl.textContent = acc.searchHint ? '（微信内搜索「' + acc.searchHint + '」）' : '';
    }
    tabsEl.setAttribute('aria-label', '公众号选择');

    var all = sortedArticles(acc);
    if (!all.length) {
      renderToolbar(0);
      listEl.innerHTML = '<div class="feeds-empty">该公众号暂未收录文章，后续会人工补充。</div>';
      return;
    }

    var part = partition(acc);
    var hiddenCount = part.older.length;
    renderToolbar(hiddenCount);

    // 默认视图：置顶文章（不受时间限制）+ 近一月文章；展开后追加更早文章
    var items = showAll
      ? part.pinned.concat(part.recent, part.older)
      : part.pinned.concat(part.recent);

    if (!items.length) {
      listEl.innerHTML = '<div class="feeds-empty">近一个月内暂无新文章，可点击上方「显示更早文章（' +
        hiddenCount + '）」查看更早收录。</div>';
      return;
    }

    listEl.innerHTML = items.map(function (it) {
      return '<a class="feed-item" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="feed-date">' + esc(it.date || '') + '</span>' +
        '<span class="feed-title">' +
        (it.pinned === true ? '<span class="feed-pin">置顶</span>' : '') +
        esc(it.title) +
        (it.summary ? '<span class="feed-summary">' + esc(it.summary) + '</span>' : '') +
        '</span>' +
        '<span class="feed-go">原文 ↗</span></a>';
    }).join('');
  }

  function render() {
    renderTabs();
    renderList();
  }

  function otherModalOpen() {
    return ['planModal', 'seatModal', 'loginModal'].some(function (id) {
      var el = document.getElementById(id);
      return el && !el.hidden;
    });
  }

  function setTab(id) {
    if (!accountById(id)) return;
    current = id;
    showAll = false; // 切换公众号回到默认的近一月视图
    render();
  }

  function open(id, trigger) {
    lastTrigger = trigger || null;
    current = accountById(id) ? id : (data.length ? data[0].id : '');
    showAll = false; // 每次打开都从近一月视图开始
    render();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    // 面板打开于吸顶头之上（z-index 高于页头与浮动按钮），小日历随 modal-open 隐藏
    setTimeout(function () {
      var target = modal.querySelector('.feeds-tab.is-active') || closeBtn;
      if (target) target.focus();
    }, 30);
  }

  function close() {
    modal.hidden = true;
    if (lastTrigger && typeof lastTrigger.focus === 'function' && document.contains(lastTrigger)) {
      lastTrigger.focus();
    } else {
      var navBtn = document.querySelector('.feeds-btn[data-feed="' + current + '"]');
      if (navBtn) navBtn.focus();
    }
    if (!otherModalOpen()) document.body.classList.remove('modal-open');
    lastTrigger = null;
  }

  document.querySelectorAll('.feeds-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      open(btn.getAttribute('data-feed'), btn);
    });
  });

  tabsEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-feed-tab]') : null;
    if (!btn) return;
    setTab(btn.getAttribute('data-feed-tab'));
  });

  if (toolbarEl) {
    toolbarEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.feeds-toggle') : null;
      if (!btn) return;
      showAll = !showAll;
      renderList();
      // 重新渲染后按钮被替换，焦点落回新的展开/收起按钮
      var next = document.getElementById('feedsToggle');
      if (next) next.focus();
    });
  }

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });

  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // 轻量焦点约束：Tab 在面板内循环，避免焦点跑到遮罩下方
    var nodes = modal.querySelectorAll('a[href], button:not([disabled])');
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();
