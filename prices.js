// 自动生成，请勿手工编辑。
// 数据源：scripts/price-ledger.json（逐场人工核对台账）→ node scripts/build-prices.mjs
// 资料馆排片接口不返回票价；这里只收录有可复核来源的场次，未登记的场次 = unknown（前端不显示价签）。
// 键（逐级回退，顺序与 app.js / scripts/snapshot.mjs 一致）：
//   "YYYY-MM-DD|HH:MM|影院|影厅|片名" → "YYYY-MM-DD|影院|影厅|片名" → "YYYY-MM-DD|影厅|片名" → "YYYY-MM-DD|片名"
//   片名/影院/影厅均做归一化：去全部空白 + 小写。
// 值：单一票价（元，数字）或 [最低价, 最高价]。备注另见 window.PRICE_NOTES（键同上）。
window.PRICES = {};
window.PRICE_NOTES = {};
window.PRICE_META = {"generatedAt":null,"entries":0,"keys":0};
