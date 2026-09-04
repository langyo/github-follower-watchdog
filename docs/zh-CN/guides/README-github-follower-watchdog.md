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

在原始列表之上，watchdog 会在严格的 API 限额预算内**为每位关注者建立资料画像**（贡献量、关注/粉丝比、公开仓库数、资料完整度、账号年龄），仪表盘把这些事实换算成一个透明可解释的 0–100 分，用来区分真人关注与疑似批量关注机器人。

Fork 之后它就**属于你**：被监看账号从仓库 owner 自动解析，继承的记录在 fork 首次运行时重置，同一个 workflow 还会为 fork 自动开启并部署 GitHub Pages。

## 快速开始

Fork 之后照做，全程约两分钟。

1. **Fork 本仓库** —— 名字随意；下文假设你保留了 `github-follower-watchdog`。

2. **在 fork 上启用 Actions** —— 浏览器打开 `https://github.com/<你>/github-follower-watchdog/actions`。GitHub 默认关闭新 fork 的 workflow，点击 **I understand my workflows, go ahead and enable them**。

3. **跑第一次巡检** —— 还是在这个 Actions 页面，左侧选 **Watch** → **Run workflow** → **Run workflow**。（想更快填满真人/机器人评分，可以把这里的 *Max accounts to enrich* 调大。）首次运行会把当前关注者记录为基线，并发布你的站点。

4. **打开你的仪表盘** —— `https://<你>.github.io/github-follower-watchdog/`。此后每小时自动刷新（仅在数据有变化时重新部署）。

如果首次运行在 *Configure Pages* 一步停下 —— GitHub 偶尔会拒绝让 workflow 令牌创建站点 —— 打开 `https://github.com/<你>/github-follower-watchdog/settings/pages`，把 **Source** 设为 **GitHub Actions**，再跑一次 **Watch** 即可。

**更快填满评分（可选但推荐）。** Actions 的 `GITHUB_TOKEN` 限额比你自己的 token 紧得多，而且 CI 每小时最多只富集 `WATCH_ENRICH_CAP`（默认 40）个账号 —— 关注者不多时只是缓慢预热；关注者上千时，这意味着几十个小时的 CI 都在节流请求里磨回填，评分卡片才能全部点亮。建议直接在本机先跑第一遍，哪怕 fork 后什么都还没启用：

```bash
git clone https://github.com/<你>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # 你自己的 token：每小时 5000 次
WATCH_ENRICH_CAP=200 just watch        # 重复运行直到输出 "no changes"
```

然后把生成的 `data/` 记录提交到分支、开 PR 并合并 —— 下一个整点巡检会直接采用该文件，只刷新过期部分。

**调整巡检节奏（节约 CI 额度）。** cron 每小时照常触发，但决定每次实际跑多少的旋钮都是普通的仓库变量 —— 在 **Settings → Secrets and variables → Actions → Variables**（`vars.*`）里设置一次即可，无需改 workflow：

| 变量 | 默认 | 含义 |
| --- | --- | --- |
| `WATCH_INTERVAL_HOURS` | `1` | 两次定时巡检的最小间隔小时数。设为 `6` 时，中间的小时会在几秒内退出 —— 不调 API、不写记录、不构建部署。手动 **Run workflow** 永远立即执行。 |
| `WATCH_ENRICH_CAP` | `40` | 每次运行最多富集的账号数（上限 200；Run workflow 的输入优先）。 |
| `WATCH_ENRICH_STALE_DAYS` | `30` | 关注者资料多少天后刷新。 |
| `WATCH_USER` | fork owner | 改为监看其他公开账号。 |

例如 `WATCH_INTERVAL_HOURS=6` 能砍掉约 83% 的定时 API 流量，而趋势、时间线和评分每天仍刷新四次。

**数据存在哪里。** `data/current.json` 是最新名单，`data/history.jsonl` 是只增不改的关注/取关日志，`data/accounts.json` 存放评分背后的账号事实。三者都只由 CI 写入并提交到你的 fork —— `git log -- data/` 就是完整的审计线：没有外部服务、没有数据库，只需要信任 git。

**监看别人。** 在 `.github/workflows/watch.yml` 里设置 `WATCH_USER`（或在本地 `just watch <登录名>` 传参），即可监看任意公开账号。

## 工作原理

- `scripts/watchdog.py` —— 抓取器的全部：有界分页、原子写入、先写快照后写历史的顺序（崩溃最多丢一条时间线，绝不重复事件），以及任何 API 失败都"不写任何数据"的铁律。第二阶段为尽力而为的资料富集：每次运行最多处理 `WATCH_ENRICH_CAP`（默认 40，上限 200）个账号，走 REST 用户接口加一次批量 GraphQL 查询，只有事实变化才落盘。富集碰到 API 失败会自行停止，剩余账号在下次运行续扫；全新 fork 先记录名单，下一次运行才开始评分。
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` —— 记录本体；**只由 CI 写入**（AGENTS.md §5）。
- `.github/workflows/watch.yml` —— 每小时 cron + 手动 + push：watchdog → 有变化则提交 → 构建站点 → 部署 Pages。无变化的小时跳过构建，~20 秒收工；有变化的路径约一分钟。（GitHub 会在仓库 60 天无活动后停用定时任务 —— 数据提交本身就是活动。）
- `site/` —— 仪表盘。Vite + Vue 3 TSX（无 `.vue` SFC）+ SCSS + vue-i18n，8 种语言。记录以公共资源形式原样拷贝进构建产物、由页面运行时拉取，纯数据变动永远不需要重新构建应用；评分完全在浏览器端计算（`site/src/data/scoring.ts`）。

## 评分模型

评分刻意做到可解释 —— 先按经典真人信号加分，再对经典机器人形态做乘法惩罚：

| 信号 | 分值 |
| --- | --- |
| 关注/粉丝平衡（0 关注，或比例 ≤ 2） | 至多 +25 |
| 近一年贡献数（GraphQL） | 至多 +30 |
| 公开仓库数 | 至多 +15 |
| 资料完整度（名字、简介、公司、位置、博客） | 至多 +10 |
| 账号年龄 | 至多 +15 |
| 批量关注形态（关注 ≥ 500 且粉丝 < 50） | × 0.5 |
| 空壳形态（无贡献且无仓库） | × 0.6 |

仪表盘可按 **真人**（≥ 60）、**存疑**（30–59）、**疑似机器人**（< 30）三组筛选。资料按随机抽样逐步刷新（每小时约 40 个账号），画像持续保鲜又绝不触碰限额。

## 本地开发

```bash
npm --prefix site install   # 首次
just watch                  # 跑一次 watchdog（目标：origin owner，或直接传登录名）
just dev                    # 站点开发服务器 :5174
just build                  # 类型检查 + 生产构建
just lint-msg               # 校验 master..HEAD 的 commit 标题（AGENTS.md §1）
```

单纯查关注者列表时 `GITHUB_TOKEN` 可选，但账号富集（也就是评分）只在环境里有 token 时才会运行 —— `export GITHUB_TOKEN=$(gh auth token)`。

## 文档

各语言 README 位于 [`docs/`](../../)（`docs/<lang>/guides/README-github-follower-watchdog.md`，除英文外共 8 种）。面向 AI agent 与人类贡献者的仓库规则见 [`AGENTS.md`](../../../AGENTS.md)。

源码：[langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog)。
