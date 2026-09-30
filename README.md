# 雪山图志 · The Snow Atlas

一个可在 GitHub Pages 使用的中国雪山、山岳人文与徒步资料网页。当前精选 **20 组雪山、19 条路线与行走记录**，覆盖四川、云南、西藏、青海、新疆。不是全国雪山的穷尽名录。

- 按地区、关键词、内容类型筛选；按山峰高度排序。
- 雪山详情包含位置、地理、历史、地方文化与来源。
- 成熟路线提供交通、行程节点、装备清单；个人与历史记录保留日期、证据和准入边界。
- 本机收藏与装备勾选，不需要账号，不上传个人记录。
- 真实摄影，附摄影者、原作与授权链接。照片保存在本站，不依赖外站热链。

## 分支与部署

- `main`：源码、结构化内容、摄影展示资产、构建与检查脚本。
- `gh-pages`：**仅编译后的静态产物**；自动发布时保持独立提交历史。
- 推送 `main` 后，GitHub Actions 检查资料并构建 `dist/`，将完全相同的产物写入 `gh-pages`，然后用 GitHub 官方 Pages Actions 发布。Pages 的 Source 设为 **GitHub Actions**；没有把源码目录作为网站公开根目录。

预期站点地址：<https://collapsar11.github.io/snow-mountain-atlas/>

## 本地运行

需要 Node.js 20.11 或更新版本。构建和数据检查无运行时第三方依赖。

```sh
npm test
npm run build
npm run preview
```

预览地址：<http://127.0.0.1:4173>。`dist/` 已被 `.gitignore` 排除，不提交到 `main`。

浏览器回归检查为开发用可选依赖：

```sh
npm ci
npx playwright install chromium
npm run check:browser
```

## 内容与照片

- `src/data/catalog.json`：实际发布的雪山、路线、资料来源。
- `scripts/curate-catalog.py`：本次人工整理数据的可复现生成脚本；修改内容后运行它再构建，或直接编辑 JSON 并同步生成器。
- `src/data/photos.json`：逐张照片的摄影者、原始文件链接与开放许可。
- `public/images/`：已压缩展示图片，原许可继续适用。
- `research/`：检索条件、照片选用记录与地点核对记录。
- `src/app.js`、`src/styles.css`、`src/index.html`：界面源码。

资料核对日期为 2026-10-01，并不构成实时开放确认。保护地公告优先于旧游记；没有伪造 GPX、实时天气或准入许可。页面中的里程、海拔、时长分别标注来源及估算边界；主峰高度不等于徒步最高点。

图库没有 AI 合成图片，按 Commons 原文件的 CC BY / CC BY-SA / CC0 / 公有领域条件保留署名。网页中的图片缩放压缩、按卡片裁切。部分路线使用明确标注的所在山域实景，而不是宣称照片就是某个路段；原游记的现场相册通过外链阅读，不擅自转载。

按照用户的存储要求，采集时下载缓存位于 `/Volumes/H/snow-mountain-atlas/image-cache`，不写入仓库。网页的小体积展示图片留在本项目。重新采集工具 `scripts/fetch-images.py` 是维护辅助工具，不属于运行或构建必需步骤。

## 许可

网站原创代码采用 MIT，见 `LICENSE`。图片授权逐张列于 `src/data/photos.json` 和网页“关于图志”，不纳入代码 MIT 授权。第三方资料只作有限摘要并链接原文；原内容权利归原作者。
