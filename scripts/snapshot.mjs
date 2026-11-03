#!/usr/bin/env node
/* =========================================================
 * 排片快照脚本（由 GitHub Actions 每日定时调用）
 *
 * 拉取指定月份（默认：当月 + 下月）的全部场次，合并站内手工
 * 补充场次（extra-schedule.js），写入 archive/YYYY-MM.json。
 *
 * 背景：资料馆官方接口会把已放映的场次逐渐剔除，历史排片无法
 * 回查，因此每天把当月/下月的完整排片存档到仓库，网站端在
 * 「按月查看」时用它补全已放映的场次。
 *
 * 重要：每次运行都与既有存档取并集（键：playTime|cinema|hall），
 * 只增不减——接口对已放映日期返回 0 条是正常现象，若直接用接口
 * 结果整体覆盖存档，每天跑一次就会把昨天的排片删光。
 *
 * 内容无变化时不改写文件（generatedAt 保持不变），
 * 避免每日产生无意义的提交。
 *
 * 用法：node scripts/snapshot.mjs [YYYY-MM ...]
 *      不传参数时默认快照「当月 + 下月」（时区 Asia/Shanghai）。
 * ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.guoyingjiaying.cn/api/web';
const OUT_DIR = path.join(ROOT, 'archive');
const PAD = (n) => (n < 10 ? '0' : '') + n;
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let token = '';

async function post(p, data) {
  const body = new URLSearchParams(Object.entries(data).map(([k, v]) => [k, String(v)])).toString();
  const r = await fetch(API + '/' + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return r.json();
}

async function ensureToken() {
  const j = await post('getkey', { t: Date.now() });
  if (!j?.data?.token) throw new Error('获取 token 失败：' + JSON.stringify(j).slice(0, 200));
  token = j.data.token;
}

async function fetchDay(y, m, d) {
  const call = async () => {
    const t = Date.now();
    const sg = md5(y + PAD(m) + PAD(d) + t + token);
    return post('arrangementPage', { year: y, month: PAD(m), day: PAD(d), cinema: 'all', t, signer: sg });
  };
  let j = await call();
  if (j?.status !== 200) { await ensureToken(); j = await call(); }   // token 失效重试一次
  return (j?.data?.records) || [];
}

/** 票价静态表（prices.js 由 scripts/price-ledger.json 生成，未登记 = unknown） */
let PRICE_MAP = {};
let PRICE_NOTES = {};
function loadPrices() {
  globalThis.window = {};
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, 'prices.js'), 'utf8'));
  PRICE_MAP = globalThis.window.PRICES || {};
  PRICE_NOTES = globalThis.window.PRICE_NOTES || {};
}
function normName(s) { return String(s ?? '').replace(/\s+/g, '').trim().toLowerCase(); }
const seg = (arr) => arr.filter(Boolean).join('|');

/**
 * 查某场次票价。键逐级回退（与 app.js / build-prices.mjs 完全一致）：
 *   日期|时间|影院|影厅|片名 → 日期|影院|影厅|片名 → 日期|影厅|片名 → 日期|片名
 * 返回 null 表示 unknown（不猜价）。
 */
function priceOf(date, time, cinema, hall, name) {
  const nn = normName(name);
  if (!date || !nn) return null;
  const cand = [
    [date, time, normName(cinema), normName(hall), nn],
    [date, normName(cinema), normName(hall), nn],
    [date, normName(hall), nn],
    [date, nn]
  ];
  for (const parts of cand) {
    const k = seg(parts);
    const v = PRICE_MAP[k];
    if (v == null) continue;
    const fields = Array.isArray(v)
      ? { price: Number(v[0]), priceMax: Number(v[1]) }
      : { price: Number(v) };
    if (!(fields.price > 0)) continue;
    const note = PRICE_NOTES[k];
    if (note) fields.priceNote = note;
    return fields;
  }
  return null;
}

/** 存档里已有票价：取价格字段（兼容旧存档） */
function archivedPrice(r) {
  if (!r || !(Number(r.price) > 0)) return null;
  const fields = { price: Number(r.price) };
  if (Number(r.priceMax) > 0) fields.priceMax = Number(r.priceMax);
  if (r.priceNote) fields.priceNote = r.priceNote;
  return fields;
}

/** 归一化接口记录 → 存档结构 */
function norm(r) {
  const mi = r.movieInfo || {};
  const playTime = r.playTime || '';
  const p = priceOf(playTime.slice(0, 10), playTime.slice(11, 16), r.cinemaInfo || '', r.movieHall || '', mi.movieName || '');
  return {
    playTime: r.playTime,
    cinema: r.cinemaInfo,
    hall: r.movieHall || '',
    name: mi.movieName || '',
    en: mi.englishName || '',
    year: mi.movieTime || '',
    min: Number(mi.movieMinute) || 0,
    formats: r.node || [],
    movieId: mi.movieId || r.movieId || '',
    poster: mi.pictureBig || '',
    ...(p || {}),
    ...(r.extra ? { extra: true, note: mi.note || '' } : {})
  };
}

/** 站内手工补充场次（extra-schedule.js 里 window.EXTRA_SCHEDULE） */
function loadExtras() {
  globalThis.window = {};
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, 'extra-schedule.js'), 'utf8'));
  return globalThis.window.EXTRA_SCHEDULE || [];
}

/** 把补充场次并入某天的接口记录（同日同片名或同开始时间则跳过，仅比对江南） */
function mergeExtrasInto(dayRecords, monthKey) {
  let added = 0;
  for (const e of loadExtras()) {
    if (e.d.slice(0, 7) !== monthKey) continue;
    const day = Number(e.d.slice(8, 10));
    const recs = dayRecords.get(day) || [];
    const name = String(e.title || '').toLowerCase();
    const stamp = e.d + ' ' + e.t;
    const dup = recs.some((r) => {
      if (r.cinemaInfo !== '江南分馆影院') return false;
      const mi = r.movieInfo || {};
      return String(mi.movieName || '').toLowerCase() === name || r.playTime.slice(0, 16) === stamp;
    });
    if (dup) continue;
    recs.push({
      extra: true,
      cinemaInfo: '江南分馆影院',
      movieHall: e.hall,
      playTime: stamp + ':00',
      node: [],
      movieInfo: { movieName: e.title, movieTime: e.year, movieMinute: e.min, note: e.note || '' }
    });
    dayRecords.set(day, recs);
    added++;
  }
  return added;
}

async function snapshotMonth(monthKey) {
  loadPrices();
  const [y, m] = monthKey.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const dayRecords = new Map();

  let idx = 0, active = 0;
  const LIMIT = 5;
  await new Promise((resolve) => {
    const next = () => {
      if (idx >= dim && active === 0) { resolve(); return; }
      while (active < LIMIT && idx < dim) {
        const d = ++idx;
        active++;
        fetchDay(String(y), m, d)
          .then((recs) => { if (recs.length) dayRecords.set(d, recs); })
          ['catch']((err) => console.error(`  ${monthKey}-${PAD(d)} 拉取失败：${err.message}`))
          .then(() => { active--; next(); });
      }
    };
    next();
  });

  const extraAdded = mergeExtrasInto(dayRecords, monthKey);

  const fetched = [];
  for (const [day, recs] of dayRecords) {
    for (const r of recs) fetched.push(norm(r));
  }

  const outFile = path.join(OUT_DIR, monthKey + '.json');
  const recKey = (r) => r.playTime + '|' + r.cinema + '|' + (r.hall || '');

  // 与既有存档取并集：接口返回 0 条（日期已过/已剔除）时保留历史记录
  let oldRecords = [];
  if (fs.existsSync(outFile)) {
    try { oldRecords = JSON.parse(fs.readFileSync(outFile, 'utf8')).records || []; } catch { /* 旧文件损坏则重建 */ }
  }
  const fetchedKeys = new Set(fetched.map(recKey));
  const oldByKey = new Map();
  for (const r of oldRecords) if (r && r.playTime) oldByKey.set(recKey(r), r);
  const merged = new Map();
  for (const r of oldRecords) if (r && r.playTime) merged.set(recKey(r), r);
  for (const r of fetched) {
    const prev = merged.get(recKey(r));
    // 已有正式场次记录时不被公众号补充（extra）记录覆盖，正式数据字段更全
    if (!prev || !(prev.extra && !r.extra)) merged.set(recKey(r), r);
  }
  const retained = oldRecords.filter((r) => r && r.playTime && !fetchedKeys.has(recKey(r))).length;

  /* 票价合并（只增不减）：
   *  a) 本次接口抓到的场次带价 → 用新价覆盖旧价（调价以最新抓取为准，旧 priceMax/priceNote 不残留）；
   *  b) 本次没抓到价（或场次已下架、只剩旧记录）→ 先按当前 prices.js 台账取最新价；
   *  c) 台账也查不到 → 继承存档里的旧价，绝不清空（拿不到 ≠ 不要了）。 */
  let priceInherited = 0, priceBackfilled = 0, priceUpdated = 0;
  for (const [k, r] of merged) {
    const isFresh = fetchedKeys.has(k);
    const prev = archivedPrice(oldByKey.get(k));   // 旧存档里的票价（接口不返回、只能靠存档保留）
    if (isFresh && Number(r.price) > 0) {
      if (!(Number(r.priceMax) > 0)) delete r.priceMax;   // 新价是单一票价时，不带旧的区间上界
      continue;
    }
    const fromLedger = priceOf(r.playTime.slice(0, 10), r.playTime.slice(11, 16), r.cinema || '', r.hall || '', r.name || '');
    if (fromLedger) {
      const differs = !!prev && (prev.price !== fromLedger.price || (prev.priceMax || 0) !== (fromLedger.priceMax || 0));
      if (!prev || differs) {
        delete r.priceMax;
        delete r.priceNote;
      }
      Object.assign(r, fromLedger);
      if (!prev) priceBackfilled++;
      else if (differs) priceUpdated++;
      continue;
    }
    if (prev) {
      Object.assign(r, prev);   // 台账查不到 → 沿用存档价，绝不清空
      priceInherited++;
    }
  }

  const records = Array.from(merged.values());
  records.sort((a, b) => (a.playTime === b.playTime ? String(a.hall).localeCompare(b.hall) : a.playTime.localeCompare(b.playTime)));

  const next = { month: monthKey, count: records.length, records };

  let changed = oldRecords.length > 0 ? JSON.stringify(oldRecords) !== JSON.stringify(records) : true;
  if (changed) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    next.generatedAt = new Date().toISOString();
    fs.writeFileSync(outFile, JSON.stringify(next, null, 1) + '\n', 'utf8');
  }
  console.log(`${monthKey}: ${records.length} 场（含手工补充 ${extraAdded} 场${retained ? `，保留已下架历史 ${retained} 场` : ''}）${changed ? '，已更新' : '，无变化'}`);
  const priced = records.filter((r) => Number(r.price) > 0).length;
  console.log(`  票价覆盖：${priced}/${records.length} 场有价（${(records.length - priced)} 场 unknown）` +
    `${priceInherited ? `，沿用存档价 ${priceInherited} 场` : ''}${priceBackfilled ? `，新回填 ${priceBackfilled} 场` : ''}${priceUpdated ? `，按台账更新 ${priceUpdated} 场` : ''}`);
  return changed;
}

const shToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date()); // YYYY-MM-DD
let months = process.argv.slice(2);
if (!months.length) {
  const cy = Number(shToday.slice(0, 4)), cm = Number(shToday.slice(5, 7));
  months = [`${cy}-${PAD(cm)}`, cm === 12 ? `${cy + 1}-01` : `${cy}-${PAD(cm + 1)}`];
}

ensureToken()
  .then(() => months.reduce((p, k) => p.then(() => snapshotMonth(k)), Promise.resolve()))
  ['catch']((err) => { console.error('快照失败：', err); process.exit(1); });
