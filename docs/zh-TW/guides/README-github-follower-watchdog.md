<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>為你的 GitHub 主頁提供每小時一次的關注者巡檢 —— 原生 CI、git 留痕、Pages 發布</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

[English](../../../README.md) ·
[简体中文](../../zh-CN/guides/README-github-follower-watchdog.md) ·
**繁體中文** ·
[日本語](../../ja/guides/README-github-follower-watchdog.md) ·
[한국어](../../ko/guides/README-github-follower-watchdog.md) ·
[Français](../../fr/guides/README-github-follower-watchdog.md) ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog 是一個完全活在倉庫裡的零伺服器關注者監視器，分三步運轉：

1. **每小時巡檢** —— GitHub Actions 排程任務執行一個純標準庫的 Python 腳本（無需 `pip install`、無需環境準備），分頁拉取公開的關注者 API，幾秒內完成。

2. **增量記錄進 git** —— 每次執行將最新清單與 `data/current.json` 做差集，把新增關注 / 取消關注事件附加到只增不改的 `data/history.jsonl`。只有真實變動才會產生一條提交（`🔄 Sync follower snapshot.`）；風平浪靜的小時什麼都不寫 —— git 歷史本身就是變更日誌。

3. **Pages 發布儀表板** —— 每次變動自動重新部署單頁儀表板（Vue 3 · TSX · SCSS · vue-i18n，8 種語言，深淺雙主題），展示關注數趨勢、關注/取關時間軸與目前名單。

在原始清單之上，watchdog 會在嚴格的 API 限額預算內**為每位關注者建立資料畫像**（貢獻量、關注/粉絲比、公開儲存庫數、資料完整度、帳號年齡），儀表板把這些事實換算成一個透明可解釋的 0–100 分，用來區分真人關注與疑似批量關注機器人。

Fork 之後它就**屬於你**：被監看帳號從倉庫 owner 自動解析，繼承的記錄在 fork 首次執行時重置，同一個 workflow 還會為 fork 自動開啟並部署 GitHub Pages。

## 快速開始

Fork 之後照做，全程約兩分鐘。

1. **Fork 本倉庫** —— 名字隨意；下文假設你保留了 `github-follower-watchdog`。

2. **在 fork 上啟用 Actions** —— 瀏覽器開啟 `https://github.com/<你>/github-follower-watchdog/actions`。GitHub 預設關閉新 fork 的 workflow，點擊 **I understand my workflows, go ahead and enable them**。

3. **跑第一次巡檢** —— 還是在這個 Actions 頁面，左側選 **Watch** → **Run workflow** → **Run workflow**。（想更快填滿真人/機器人評分，可以把這裡的 *Max accounts to enrich* 調大。）首次執行會把目前關注者記錄為基線，並發布你的站台。

4. **開啟你的儀表板** —— `https://<你>.github.io/github-follower-watchdog/`。此後每小時自動重新整理（僅在資料有變化時重新部署）。

如果首次執行在 *Configure Pages* 一步停下 —— GitHub 偶爾會拒絕讓 workflow 權杖建立站台 —— 開啟 `https://github.com/<你>/github-follower-watchdog/settings/pages`，把 **Source** 設為 **GitHub Actions**，再跑一次 **Watch** 即可。

**資料存在哪裡。** `data/current.json` 是最新名單，`data/history.jsonl` 是只增不改的關注/取關日誌，`data/accounts.json` 存放評分背後的帳號事實。三者都只由 CI 寫入並提交到你的 fork —— `git log -- data/` 就是完整的審計線：沒有外部服務、沒有資料庫，只需要信任 git。

**監看別人。** 在 `.github/workflows/watch.yml` 裡設定 `WATCH_USER`（或在本地 `just watch <登入名>` 傳參），即可監看任意公開帳號。

## 工作原理

- `scripts/watchdog.py` —— 抓取器的全部：有界分頁、原子寫入、先寫快照後寫歷史的順序（崩潰最多丟一條時間軸，絕不重複事件），以及任何 API 失敗都「不寫任何資料」的鐵律。第二階段為盡力而為的資料富集：每次執行最多處理 `WATCH_ENRICH_CAP`（預設 40，上限 200）個帳號，走 REST 使用者介面加一次批次 GraphQL 查詢，只有事實變化才落盤。
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` —— 記錄本體；**只由 CI 寫入**（AGENTS.md §5）。
- `.github/workflows/watch.yml` —— 每小時 cron + 手動 + push：watchdog → 有變動則提交 → 建構站點 → 部署 Pages。無變動的小時跳過建構，~20 秒收工；有變動的路徑約一分鐘。（GitHub 會在倉庫 60 天無活動後停用排程任務 —— 資料提交本身就是活動。）
- `site/` —— 儀表板。Vite + Vue 3 TSX（無 `.vue` SFC）+ SCSS + vue-i18n，8 種語言。記錄以公共資源形式原樣拷貝進建構產物、由頁面執行時拉取，純資料變動永遠不需要重新建構應用；評分完全在瀏覽器端計算（`site/src/data/scoring.ts`）。

## 評分模型

評分刻意做到可解釋 —— 先按經典真人訊號加分，再對經典機器人形態做乘法懲罰：

| 訊號 | 分值 |
| --- | --- |
| 關注/粉絲平衡（0 關注，或比例 ≤ 2） | 至多 +25 |
| 近一年貢獻數（GraphQL） | 至多 +30 |
| 公開儲存庫數 | 至多 +15 |
| 資料完整度（名字、簡介、公司、位置、部落格） | 至多 +10 |
| 帳號年齡 | 至多 +15 |
| 批次關注形態（關注 ≥ 500 且粉絲 < 50） | × 0.5 |
| 空殼形態（無貢獻且無儲存庫） | × 0.6 |

儀表板可按 **真人**（≥ 60）、**存疑**（30–59）、**疑似機器人**（< 30）三組篩選。資料按隨機抽樣逐步重新整理（每小時約 40 個帳號），畫像持續保鮮又絕不觸碰限額。

## 本地開發

```bash
npm --prefix site install   # 首次
just watch                  # 跑一次 watchdog（目標：origin owner，或直接傳登入名）
just dev                    # 站點開發伺服器 :5174
just build                  # 類型檢查 + 生產建構
just lint-msg               # 校驗 master..HEAD 的 commit 標題（AGENTS.md §1）
```

單純查關注者清單時 `GITHUB_TOKEN` 可選，但帳號富集（也就是評分）只在環境裡有 token 時才會執行 —— `export GITHUB_TOKEN=$(gh auth token)`。

## 文件

各語言 README 位於 [`docs/`](../../)（`docs/<lang>/guides/README-github-follower-watchdog.md`，除英文外共 8 種）。面向 AI agent 與人類貢獻者的倉庫規則見 [`AGENTS.md`](../../../AGENTS.md)。

原始碼：[langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog)。
