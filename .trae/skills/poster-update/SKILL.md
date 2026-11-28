---
name: poster-update
description: 电影海报（豆瓣海报）增量更新流程。当用户要求更新海报、补充新片单海报、说海报不对/不是豆瓣海报、海报显示成宽幅横图/没变、或重建豆瓣海报映射时使用。不要用于排片数据更新（走 snapshot 流程）或与海报无关的站点改动。
---

# 海报（豆瓣海报）更新流程

目标：新片单补海报全程几分钟内完成。核心靠增量缓存，不重查、不手工改映射表。

## 快速流程（按序执行）

1. **增量重建映射**（新片名 4s/个走网络，其余秒过）：
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-douban-map.ps1
   ```
   - 脚本单次运行分两阶段：Phase A 豆瓣 suggest 解析片名、Phase B 补评分/海报。没有 -FirstRun/阈值轮次之类参数（只有 `-Force`）。
   - `douban-cache.json` 已缓存的片名秒过；**suggest 返回空的片名不缓存，下次运行自动重试**——所以一轮没捞回的可直接再跑。
   - 脚本扫描 `archive/*.json` 与 `extra-schedule.js` 的全部影片，输出 `douban-map.js` 并下载海报到 `assets/posters/<豆瓣id>.jpg`。
   - **不要手工编辑 `douban-map.js`**（自动生成）；也不要为"保险"全量重查豆瓣，增量缓存已保证正确性。
2. **处理 miss 名单**：日志末尾 `hit=N miss=M`。miss 分三类：
   - 豆瓣真无条目（合集/短片集/特别放映）→ 加进 `scripts\douban-known-misses.json`，脚本跳过查询保持秒级；前端回退资料馆图+豆瓣搜索链接，属正常。若日后豆瓣补了条目，从名单移除即可。
   - **suggest 返回空 ≠ 豆瓣无条目**（限流/短查询常返回空）→ 稍后重跑脚本重试；顽固空结果（如《地下》《垂帘听政》）可手动调 suggest 接口拿到 id 钉进覆盖表，不要放弃。
   - 别名/片名带后缀（`4K`、`加长版`、`特别放映`）查不到本体条目 → 覆盖表归到本体（下一步）。
3. **疑难条目加覆盖表** `scripts\douban-overrides.json`：键 `"去空格小写片名|年份"`，值为豆瓣 subject id（必须来自豆瓣 suggest/条目页核实，不得猜测）。写入规则（血泪教训）：
   - 键值保持纯 ASCII `\uXXXX` 转义（单反斜杠 `\u300a`，不是 `\\u300a`）；
   - **必须落成 .js 文件用 node 执行转义写入**，禁止 PowerShell 双引号里内联 `node -e`（PS 会吞反斜杠 → 键变成字面文本 → 全部 override 静默失配、miss 激增且日志无报错）；
   - 写完做一次 JSON 解析 round-trip 校验（读回来按键查值得到正确条目）。
4. **核对错配**（抽查即可）：映射选片规则是"年份精确匹配优先，年份不符时仅接受标题完全一致"，正常不会错配。若怀疑错配，对照 douban-cache.json 里的候选 title/year 检查。
5. **发布 GitHub Pages**（项目铁律：改完必须发布并校验线上）：
   - 推送 `douban-map.js`、`douban-cache.json`、`scripts\douban-overrides.json`、`scripts\douban-known-misses.json`、新增的 `assets/posters/*.jpg`（REST API，PAT 在 `%USERPROFILE%\.local\share\gh-pat.txt`，repo `Jason-Gao-98/cfa-schedule`；PUT 前先 GET sha）。
   - **`assets/posters/1305630.jpg` 永不推送**（曾被内容审核拒收，线上走豆瓣 CDN 回退）。
   - **版本号 bump 缺一不可**（防缓存，见下方已知坑）：
     1. `app.js` posterBlock 里海报路径 `assets/posters/<id>.jpg?v=YYYYMMDD`；
     2. `index.html` 里 `douban-map.js?v=` 和 `app.js?v=`。
6. **校验线上**：线上 `douban-map.js` 头部 hit/miss 数、抽查海报文件 200、**浏览器截图确认卡片渲染出竖版豆瓣海报**。注意：只查 `img.src` 会误报（回退链会把 src 换掉/换显示图），必须看实际渲染效果。
7. Trae 站（Site ID `37lp3gvtia0kyg3rut6`，仅自己可见）如需同步，走 deployment skill 重新部署；部署包排除 `1305630.jpg`。

## 海报回退链（前端 app.js posterBlock）

本地 `assets/posters/<豆瓣id>.jpg?v=版本号` → 豆瓣 CDN（map 里的 `p`，浏览器常被防盗链拦）→ 资料馆 OSS 图（接口 poster）。
**识别兜底触发的特征：海报位置是宽幅横图 + 上下留灰边（信箱模式）**——那就是资料馆横幅，说明本地副本没加载出来（多半是 404 被浏览器缓存），不是映射没修好。
豆瓣返回占位灰图（movie_normal/movie_default）时脚本自动把 `p` 置空，直接用资料馆图。

## 已知坑

- **海报 URL 必须带 `?v=` 版本号**：不带版本号时浏览器会缓存"404 不存在"——新增海报后用户仍拿到缓存 404、走兜底链看到资料馆横幅，误以为"海报没修好"。每次增删海报后 bump 一次 app.js 里的 `?v=`。
- **覆盖表转义写入**：见步骤 3，内联 node 写 `\u` 转义会被 PS 吞反斜杠，必须用 .js 文件 + round-trip 校验。
- `.ps1` 落盘必须 UTF-8 BOM（PS5.1 读无 BOM 中文会乱码报解析错）；build 脚本本体保持纯 ASCII。
- 豆瓣限流返回空结果时脚本有自适应冷却；**空结果不缓存、重跑自动重查**，但长片单一轮跑不完属正常，多跑一两轮或隔几分钟再跑。
- 豆瓣条目图（imgN.doubanio.com/view/photo/s_ratio_poster/...）可直接用；不要用 m.douban.com 小图版。
- 新增影片若只在 extra-schedule.js 里（无接口记录），它没有资料馆备用图，miss 时卡片是"暂无海报"，优先找覆盖表条目。
