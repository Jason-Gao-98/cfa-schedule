---
name: poster-update
description: 电影海报（豆瓣海报）增量更新流程。当用户要求更新海报、补充新片单海报、说海报不对/不是豆瓣海报、或重建豆瓣海报映射时使用。不要用于排片数据更新（走 snapshot 流程）或与海报无关的站点改动。
---

# 海报（豆瓣海报）更新流程

目标：新片单补海报全程几分钟内完成。核心靠增量缓存，不重查、不手工改映射表。

## 快速流程（按序执行）

1. **增量重建映射**（约 1 分钟，只有新片名走网络）：
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-douban-map.ps1
   ```
   - `douban-cache.json` 已缓存的片名/条目秒过；只有缓存为空的片名才请求豆瓣 suggest（4s/个）。
   - 脚本扫描 `archive/*.json` 与 `extra-schedule.js` 的全部影片，输出 `douban-map.js` 与下载海报到 `assets/posters/`。
   - **不要手工编辑 `douban-map.js`**（自动生成）；也不要为"保险"全量重查豆瓣，增量缓存已保证正确性。
2. **处理 miss 名单**：日志末尾 `hit=N miss=M`。miss 分两类：
   - 豆瓣真无条目（合集/短片集/特别放映）→ 把片名加进 `scripts\douban-known-misses.json`（UTF-8 JSON 数组），脚本会跳过查询，增量运行保持秒级；前端回退资料馆图或占位，属正常。若日后豆瓣补了条目，从名单移除即可。
   - suggest 没搜到但豆瓣其实有（限流返回空、别名标题）→ 加进覆盖表（下一步）后重跑脚本。
3. **疑难条目加覆盖表** `scripts\douban-overrides.json`：键 `"去空格小写片名|年份"`，值为豆瓣 subject id。新条目必须先核实豆瓣页面 title+year 再填。键值用纯 ASCII `\uXXXX` 转义写入。常见类型：NT 现场、别名译名、特别放映归到本体条目。
4. **核对错配**（抽查即可）：映射选片规则是"年份精确匹配优先，年份不符时仅接受标题完全一致"，正常不会错配。若怀疑错配，对照 douban-cache.json 里的候选 title/year 检查。
5. **发布 GitHub Pages**（项目铁律：改完必须发布并校验线上）：
   - 推送 `douban-map.js`、`douban-cache.json`、新增的 `assets/posters/*.jpg`（用 REST API，PAT 在 `%USERPROFILE%\.local\share\gh-pat.txt`，repo `Jason-Gao-98/cfa-schedule`；PUT 前先 GET sha）。
   - **`assets/posters/1305630.jpg` 永不推送**（曾被内容审核拒收，线上走豆瓣 CDN 回退）。
   - **bump `index.html` 里数据脚本的 `?v=YYYYMMDD` 版本号**，否则用户浏览器缓存旧映射会以为"海报还是不对"。
6. **校验线上**：确认线上 `douban-map.js` 头部 hit/miss 数、抽查海报文件 200、浏览器卡片渲染出竖版豆瓣海报（非横幅剧照）。
7. Trae 站（Site ID `37lp3gvtia0kyg3rut6`，仅自己可见）如需同步，走 deployment skill 重新部署；部署包排除 `1305630.jpg`。

## 海报回退链（前端 app.js posterBlock）

本地 `assets/posters/<豆瓣id>.jpg` → 豆瓣 CDN（map 里的 `p`）→ 资料馆 OSS 图（接口 poster）。
豆瓣返回占位灰图（movie_normal/movie_default）时脚本自动把 `p` 置空，直接用资料馆图。

## 已知坑

- `.ps1` 落盘必须 UTF-8 BOM（PS5.1 读无 BOM 中文会乱码报解析错）；build 脚本本体保持纯 ASCII。
- 豆瓣限流返回空结果时脚本有自适应冷却；空结果缓存会在下次运行自动重查，无需干预。
- 豆瓣条目图（imgN.doubanio.com/view/photo/s_ratio_poster/...）可直接用；不要用 m.douban.com 小图版。
- 新增影片若只在 extra-schedule.js 里（无接口记录），它没有资料馆备用图，miss 时卡片是"暂无海报"，优先找覆盖表条目。
