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
 *                 url     微信原文链接（https://mp.weixin.qq.com/s/...）
 *                 summary 可选摘要，仅在能核实原文内容时填写
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
 *   3. 只收录能核实到标题与链接的真实文章，禁止编造；
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
          title: '江南分馆11月片单｜百年辉煌，戏梦重逢',
          date: '2026-10-28',
          url: 'https://mp.weixin.qq.com/s/i7FuuAAv7jPVUjAKAZQKMA',
          summary: '江南分馆 11 月片单，含全月观影日历长图'
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
    subEl.textContent = (acc.desc ? acc.desc + ' · ' : '') + '默认显示近一个月，点击可跳转原文';
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
