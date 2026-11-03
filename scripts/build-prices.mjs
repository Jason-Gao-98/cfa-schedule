#!/usr/bin/env node
/* =========================================================
 * 生成 prices.js（票价静态表）
 *
 * 唯一数据源：scripts/price-ledger.json（逐场人工核对台账）。
 * 本脚本只做「校验 + 归一化 + 生成」，不联网、不猜测：
 * 台账里没登记的场次在输出中就不存在，前端按 unknown 处理（不显示价签）。
 *
 * 输出键（逐级回退，前端与 snapshot.mjs 使用同一套顺序）：
 *   1) 日期|开场时间|影院|影厅|片名   ← 最精确
 *   2) 日期|影院|影厅|片名
 *   3) 日期|影厅|片名
 *   4) 日期|片名                     ← 同名同日多厅时兜底
 * 值：单一票价（数字，元）或 [最低价, 最高价]。
 * 备注（如「会员价」）另存 window.PRICE_NOTES，键同上。
 *
 * 生成结果按 key 排序，同样输入永远得到同样输出（除 meta 的时间戳来源）。
 *
 * 用法：node scripts/build-prices.mjs
 * ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'scripts', 'price-ledger.json');
const OUT = path.join(ROOT, 'prices.js');

const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, '').trim().toLowerCase();

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

function loadLedger() {
  if (!fs.existsSync(LEDGER)) fail('缺少台账文件：' + LEDGER);
  let raw;
  try {
    raw = fs.readFileSync(LEDGER, 'utf8');
  } catch (e) {
    fail('读取台账失败：' + e.message);
  }
  let j;
  try {
    j = JSON.parse(raw.replace(/^\uFEFF/, ''));   // 容忍 Windows 编辑器写入的 BOM
  } catch (e) {
    fail('台账不是合法 JSON：' + e.message);
  }
  if (!Array.isArray(j.entries)) fail('台账缺少 entries 数组');
  return j;
}

/** 'YYYY-MM-DD' 是否为合法日期 */
function isValidDate(ds) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return false;
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 校验单条台账，返回 { keys:[...], value, note } */
function validate(e, i) {
  const at = `entries[${i}]`;
  if (!e || typeof e !== 'object') fail(at + ' 不是对象');
  const date = String(e.date || '').trim();
  const time = String(e.time || '').trim();
  const name = String(e.name || '').trim();
  const cinema = String(e.cinema || '').trim();
  const hall = String(e.hall || '').trim();

  if (!isValidDate(date)) fail(`${at}.date 需要合法日期（YYYY-MM-DD），当前：${JSON.stringify(e.date)}`);
  if (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(`${at}.time 需要 HH:MM，当前：${JSON.stringify(e.time)}`);
  if (!name) fail(at + '.name 不能为空');
  if (!hall && !cinema) fail(at + ' 至少要有 cinema 或 hall，否则无法定位场次');
  if (!String(e.source || '').trim()) fail(at + '.source 不能为空（必须记录可复核的出处）');
  if (!isValidDate(String(e.verifiedAt || '').trim())) fail(at + '.verifiedAt 需要合法日期（核对日期）');

  let value;
  if (Array.isArray(e.prices)) {
    if (e.prices.length !== 2) fail(at + '.prices 需要 [最低价, 最高价]');
    const [lo, hi] = e.prices.map(Number);
    if (!(lo > 0) || !(hi > 0)) fail(at + '.prices 必须都是正数');
    if (lo > hi) fail(at + '.prices 最低价不能大于最高价');
    value = lo === hi ? lo : [lo, hi];
  } else {
    const p = Number(e.price);
    if (!(p > 0)) fail(at + '.price 必须是正数（元），拿不到就不要登记这一条');
    value = p;
  }

  const seg = (arr) => arr.filter(Boolean).join('|');   // 空字段直接跳过（与前端拼接规则一致）
  const nDate = date, nTime = time, nCinema = norm(cinema), nHall = norm(hall), nName = norm(name);
  const keys = [];
  // 最精确键（有开场时间时带上，避免同片同日不同场次串价）
  keys.push(seg([nDate, nTime, nCinema, nHall, nName]));
  keys.push(seg([nDate, nCinema, nHall, nName]));
  keys.push(seg([nDate, nHall, nName]));
  keys.push(seg([nDate, nName]));

  return { keys: [...new Set(keys)], value, note: String(e.note || '').trim() };
}

const ledger = loadLedger();
const entries = ledger.entries.map(validate);

// 收集键 → 值；精确键冲突 = 台账自相矛盾，直接报错；回退键冲突 = 放弃该键
const values = new Map();   // key -> Map(序列化值 -> Set(来源条目序号))
const notes = new Map();    // key -> Set(备注)
const exactConflicts = [];

entries.forEach((en, i) => {
  const ser = JSON.stringify(en.value);
  en.keys.forEach((k, ki) => {
    if (!values.has(k)) values.set(k, new Map());
    const bucket = values.get(k);
    if (!bucket.has(ser)) bucket.set(ser, new Set());
    bucket.get(ser).add(i);
    if (ki === 0) {
      if (bucket.size > 1) exactConflicts.push(k);
    }
    if (en.note) {
      if (!notes.has(k)) notes.set(k, new Set());
      notes.get(k).add(en.note);
    }
  });
});

if (exactConflicts.length) {
  const uniq = [...new Set(exactConflicts)].sort();
  fail('台账存在同一精确场次登记了不同票价：\n  ' + uniq.join('\n  ') + '\n请先人工核对后修正台账。');
}

const table = new Map();
const noteTable = new Map();
for (const [k, bucket] of [...values.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  if (bucket.size > 1) continue;          // 回退键有歧义（同日同名多场不同价）→ 不生成，避免串价
  table.set(k, JSON.parse([...bucket.keys()][0]));
  const ns = notes.get(k);
  if (ns && ns.size === 1) noteTable.set(k, [...ns][0]);
}

const verifiedAts = ledger.entries.map((e) => String(e.verifiedAt || '').trim()).filter(Boolean).sort();
const generatedAt = verifiedAts.length ? verifiedAts[verifiedAts.length - 1] : null;

function dump(map) {
  const keys = [...map.keys()].sort();
  if (!keys.length) return '{}';
  return '{\n' + keys.map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(map.get(k))).join(',\n') + '\n}';
}

const out = [
  '// 自动生成，请勿手工编辑。',
  '// 数据源：scripts/price-ledger.json（逐场人工核对台账）→ node scripts/build-prices.mjs',
  '// 资料馆排片接口不返回票价；这里只收录有可复核来源的场次，未登记的场次 = unknown（前端不显示价签）。',
  '// 键（逐级回退，顺序与 app.js / scripts/snapshot.mjs 一致）：',
  '//   "YYYY-MM-DD|HH:MM|影院|影厅|片名" → "YYYY-MM-DD|影院|影厅|片名" → "YYYY-MM-DD|影厅|片名" → "YYYY-MM-DD|片名"',
  '//   片名/影院/影厅均做归一化：去全部空白 + 小写。',
  '// 值：单一票价（元，数字）或 [最低价, 最高价]。备注另见 window.PRICE_NOTES（键同上）。',
  'window.PRICES = ' + dump(table) + ';',
  'window.PRICE_NOTES = ' + dump(noteTable) + ';',
  'window.PRICE_META = ' + JSON.stringify({ generatedAt, entries: entries.length, keys: table.size }) + ';',
  ''
].join('\n');

fs.writeFileSync(OUT, out, 'utf8');
console.log(`✓ prices.js 已生成：台账 ${entries.length} 条 → 票价键 ${table.size} 个（含备注 ${noteTable.size} 个），generatedAt ${generatedAt || '无'}`);
if (!entries.length) console.log('  台账为空：所有场次均为 unknown，前端不显示价签（这是如实结果，不是 bug）。');
