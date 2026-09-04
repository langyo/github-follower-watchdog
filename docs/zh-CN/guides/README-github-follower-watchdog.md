<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>为你的 GitHub 主页提供每小时一次的关注者巡检 —— 原生 CI、git 留痕、Pages 发布</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

[English](../../../README.md) ·
**简体中文** ·
[繁體中文](../../zh-TW/guides/README-github-follower-watchdog.md) ·
[日本語](../../ja/guides/README-github-follower-watchdog.md) ·
[한국어](../../ko/guides/README-github-follower-watchdog.md) ·
[Français](../../fr/guides/README-github-follower-watchdog.md) ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog 是一个完全活在仓库里的零服务器关注者监视器，分三步运转：

1. **每小时巡检** —— GitHub Actions 定时任务运行一个纯标准库的 Python 脚本（无需 `pip install`、无需环境准备），分页拉取公开的关注者 API，几秒内完成。

2. **增量记录进 git** —— 每次运行将最新列表与 `data/current.json` 做差集，把新增关注 / 取消关注事件追加到只增不改的 `data/history.jsonl`。只有真实变动才会产生一条提交（`🔄 Sync follower snapshot.`）；风平浪静的小时什么都不写 —— git 历史本身就是变更日志。

3. **Pages 发布仪表盘** —— 每次变动自动重新部署单页仪表盘（Vue 3 · TSX · SCSS · vue-i18n，8 种语言，深浅双主题），展示关注数趋势、关注/取关时间线和当前名单。

Fork 之后它就**属于你**：被监看账号从仓库 owner 自动解析，继承的记录在 fork 首次运行时重置，同一个 workflow 还会为 fork 自动开启并部署 GitHub Pages。前端架构、构建设施与仓库规范改编自 [wowsp](https://github.com/langyo/wowsp)。

## 快速开始

1. Fork 本仓库。
2. 在你的 fork 上启用 **Actions** —— GitHub 默认关闭新 fork 的 workflow（仓库 → Actions → "I understand my workflows, go ahead and enable them"）。
3. 通过 **Run workflow** 手动触发一次 **Watch** workflow —— 首次运行会把你当前的关注者记录为基线，并发布你的 Pages 站点。
4. 打开 `https://<你>.github.io/github-follower-watchdog/` —— 此后它每小时自动刷新。

想监看其他公开账号，在 `.github/workflows/watch.yml` 里设置 `WATCH_USER` 即可。

## 工作原理

- `scripts/watchdog.py` —— 抓取器的全部：有界分页、原子写入、先写快照后写历史的顺序（崩溃最多丢一条时间线，绝不重复事件），以及任何 API 失败都"不写任何数据"的铁律。
- `data/current.json` + `data/history.jsonl` —— 记录本体；**只由 CI 写入**（AGENTS.md §5），每次变动 = 一次追加 + 一次提交。
- `.github/workflows/watch.yml` —— 每小时 cron + 手动 + push：watchdog → 有变化则提交 → 构建站点 → 部署 Pages。无变化的小时跳过构建，~20 秒收工；有变化的路径也稳稳控制在一分钟内。（GitHub 会在仓库 60 天无活动后停用定时任务 —— 数据提交本身就是活动。）
- `site/` —— 仪表盘。Vite + Vue 3 TSX（无 `.vue` SFC）+ SCSS + vue-i18n，沿用 wowsp website 架构。记录以公共资源形式原样拷贝进构建产物、由页面运行时拉取，因此纯数据变动永远不需要重新构建应用。

## 本地开发

```bash
pnpm -C site install   # 首次
just watch             # 跑一次 watchdog（目标：origin owner，或直接传登录名）
just dev               # 站点开发服务器 :5174
just build             # 类型检查 + 生产构建
just lint-msg          # 校验 master..HEAD 的 commit 标题（AGENTS.md §1）
```

本地 `GITHUB_TOKEN` 可选 —— 它把 API 限额从每小时 60 次提升到 5000 次。

## 文档

各语言 README 位于 [`docs/`](../../)（`docs/<lang>/guides/README-github-follower-watchdog.md`，除英文外共 8 种）。面向 AI agent 与人类贡献者的仓库规则见 [`AGENTS.md`](../../../AGENTS.md)。

源码：[langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog)。

## 状态

🎉 **就绪** —— 每小时巡检、git 留痕历史与 Pages 仪表盘均已上线；workflow 还会为新的 fork 自动开启 Pages。路线图刻意保持简短：更多页面语言、以及基于 webhook 的即时模式，是清单上仅有的两个想法。
