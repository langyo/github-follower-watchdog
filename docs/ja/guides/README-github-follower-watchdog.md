<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>GitHub プロフィールのフォロワーを毎時間チェック —— CI ネイティブ、git 記録、Pages 公開</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

[English](../../../README.md) ·
[简体中文](../../zh-CN/guides/README-github-follower-watchdog.md) ·
[繁體中文](../../zh-TW/guides/README-github-follower-watchdog.md) ·
**日本語** ·
[한국어](../../ko/guides/README-github-follower-watchdog.md) ·
[Français](../../fr/guides/README-github-follower-watchdog.md) ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog は、リポジトリの中だけで完結するサーバーレスのフォロワー監視ツールです。3 つの動きで構成されます：

1. **毎時チェック** —— GitHub Actions の定期実行が、標準ライブラリだけの Python スクリプト（`pip install` 不要、セットアップ不要）を走らせ、公開フォロワー API をページングして数秒で完了します。

2. **差分を git に記録** —— 毎回の実行は最新リストと `data/current.json` を差分比較し、フォロー／フォロー解除のイベントを追記専用の `data/history.jsonl` に書き足します。実際の変動だけがコミット（`🔄 Sync follower snapshot.`）を生み、変化のない時間帯は何も書きません —— git 履歴こそが変更ログです。

3. **Pages で公開されるダッシュボード** —— 変動のたびに単一ページのダッシュボード（Vue 3 · TSX · SCSS · vue-i18n、8 言語、ダーク＆ライト）が再デプロイされ、フォロワー数の推移、フォロー／解除のタイムライン、現在の名簿を表示します。

Fork すれば**あなたのもの**になります：監視対象アカウントはリポジトリの owner から自動解決され、引き継いだ記録は fork 初回実行時にリセットされ、同じ workflow が fork の GitHub Pages を自動で有効化してデプロイします。フロントエンド構成、ビルド基盤、リポジトリ規約は [wowsp](https://github.com/langyo/wowsp) から転用しました。

## クイックスタート

1. このリポジトリを fork します。
2. fork で **Actions** を有効化します —— GitHub は新しい fork の workflow をデフォルトで無効にします（Repository → Actions → "I understand my workflows, go ahead and enable them"）。
3. **Run workflow** から **Watch** workflow を一度実行します —— 初回実行が現在のフォロワーをベースラインとして記録し、Pages サイトを公開します。
4. `https://<あなた>.github.io/github-follower-watchdog/` を開きます —— 以後、毎時間自動で更新されます。

自分以外の公開アカウントを監視したい場合は、`.github/workflows/watch.yml` の `WATCH_USER` を設定してください。

## 仕組み

- `scripts/watchdog.py` —— 取得部のすべて：上限付きページング、アトミック書き込み、スナップショット→履歴の書き込み順（クラッシュしてもタイムライン 1 行を失うだけで、イベントが重複することはありません）、そして API 失敗時は一切書き込まない鉄則。
- `data/current.json` + `data/history.jsonl` —— 記録の実体。**CI のみが書き込みます**（AGENTS.md §5）。変動 1 回 = 追記 1 回 + コミット 1 回。
- `.github/workflows/watch.yml` —— 毎時 cron + 手動 + push：watchdog → 変化があればコミット → サイトをビルド → Pages へデプロイ。変化のない時間帯はビルドをスキップして約 20 秒、変化があっても 1 分以内に収まります。（GitHub はリポジトリが 60 日間非アクティブだと定期実行を無効化します —— データコミット自体がアクティビティになります。）
- `site/` —— ダッシュボード。Vite + Vue 3 TSX（`.vue` SFC なし）+ SCSS + vue-i18n、wowsp website と同じ構成。記録はそのまま公開アセットとしてバンドルにコピーされ実行時に取得されるため、データだけの変更にアプリの再ビルドは不要です。

## ローカル開発

```bash
pnpm -C site install   # 初回のみ
just watch             # watchdog を 1 回実行（対象: origin owner、またはログイン名を指定）
just dev               # サイトの開発サーバー :5174
just build             # 型チェック + 本番ビルド
just lint-msg          # master..HEAD のコミットタイトルを検証（AGENTS.md §1）
```

ローカルの `GITHUB_TOKEN` は任意です —— API レート制限を毎時 60 回から 5000 回へ引き上げます。

## ドキュメント

各言語の README は [`docs/`](../../) にあります（`docs/<lang>/guides/README-github-follower-watchdog.md`、英語のほか 8 言語）。AI エージェントと人間の貢献者共通のリポジトリ規約は [`AGENTS.md`](../../../AGENTS.md) にあります。

ソース: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog)。

## 状態

🎉 **稼働中** —— 毎時チェック、git 記録、Pages ダッシュボードがすべて稼働中。workflow は新しい fork でも Pages を自動有効化します。ロードマップは意図して短く：ページの言語追加と、webhook ベースの即時モードだけがリストに載っています。
