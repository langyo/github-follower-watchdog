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

Fork 之後它就**屬於你**：被監看帳號從倉庫 owner 自動解析，繼承的記錄在 fork 首次執行時重置，同一個 workflow 還會為 fork 自動開啟並部署 GitHub Pages。前端架構、建構設施與倉庫規範改編自 [wowsp](https://github.com/langyo/wowsp)。

## 快速開始

1. Fork 本倉庫。
2. 在你的 fork 上啟用 **Actions** —— GitHub 預設關閉新 fork 的 workflow（倉庫 → Actions → "I understand my workflows, go ahead and enable them"）。
3. 透過 **Run workflow** 手動觸發一次 **Watch** workflow —— 首次執行會把你目前的關注者記錄為基線，並發布你的 Pages 站台。
4. 開啟 `https://<你>.github.io/github-follower-watchdog/` —— 此後它每小時自動重新整理。

如果首次執行在 *Configure Pages* 一步失敗 —— GitHub 偶爾會拒絕讓 workflow 權杖建立站台 —— 只需在 **Settings → Pages → Source: GitHub Actions** 手動啟用一次，再重新執行 workflow 即可。

想監看其他公開帳號，在 `.github/workflows/watch.yml` 裡設定 `WATCH_USER` 即可。

## 工作原理

- `scripts/watchdog.py` —— 抓取器的全部：有界分頁、原子寫入、先寫快照後寫歷史的順序（崩潰最多丟一條時間軸，絕不重複事件），以及任何 API 失敗都「不寫任何資料」的鐵律。
- `data/current.json` + `data/history.jsonl` —— 記錄本體；**只由 CI 寫入**（AGENTS.md §5），每次變動 = 一次附加 + 一次提交。
- `.github/workflows/watch.yml` —— 每小時 cron + 手動 + push：watchdog → 有變動則提交 → 建構站點 → 部署 Pages。無變動的小時跳過建構，~20 秒收工；有變動的路徑也穩穩控制在一分鐘內。（GitHub 會在倉庫 60 天無活動後停用排程任務 —— 資料提交本身就是活動。）
- `site/` —— 儀表板。Vite + Vue 3 TSX（無 `.vue` SFC）+ SCSS + vue-i18n，沿用 wowsp website 架構。記錄以公共資源形式原樣拷貝進建構產物、由頁面執行時拉取，因此純資料變動永遠不需要重新建構應用。

## 本地開發

```bash
npm --prefix site install   # 首次
just watch                  # 跑一次 watchdog（目標：origin owner，或直接傳登入名）
just dev                    # 站點開發伺服器 :5174
just build                  # 類型檢查 + 生產建構
just lint-msg               # 校驗 master..HEAD 的 commit 標題（AGENTS.md §1）
```

本地 `GITHUB_TOKEN` 可選 —— 它把 API 限額從每小時 60 次提升到 5000 次。

## 文件

各語言 README 位於 [`docs/`](../../)（`docs/<lang>/guides/README-github-follower-watchdog.md`，除英文外共 8 種）。面向 AI agent 與人類貢獻者的倉庫規則見 [`AGENTS.md`](../../../AGENTS.md)。

原始碼：[langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog)。

## 狀態

🎉 **就緒** —— 每小時巡檢、git 留痕歷史與 Pages 儀表板均已上線；workflow 還會為新的 fork 自動開啟 Pages。路線圖刻意保持簡短：更多頁面語言、以及基於 webhook 的即時模式，是清單上僅有的兩個想法。
