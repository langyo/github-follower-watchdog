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

さらに watchdog は、厳格なレート制限バジェットの中で**フォロワー一人ひとりのプロファイルを収集**し（昨年の貢献数、フォロー比率、公開リポジトリ数、プロフィール充実度、アカウント年齢）、ダッシュボードがその事実を解釈可能な 0–100 のスコアに変換します。これで実在の人物と、大量フォローを狙う疑わしいボットを区別できます。

Fork すれば**あなたのもの**になります：監視対象アカウントはリポジトリの owner から自動解決され、引き継いだ記録は fork 初回実行時にリセットされ、同じ workflow が fork の GitHub Pages を自動で有効化してデプロイします。

## クイックスタート

Fork の後は以下の通りです。所要は 2 分ほどです。

1. **リポジトリを fork** —— 名前は何でも構いません。このガイドでは `github-follower-watchdog` をそのまま使う前提で書いています。

2. **fork で Actions を有効化** —— ブラウザで `https://github.com/<あなた>/github-follower-watchdog/actions` を開きます。GitHub は新しい fork の workflow をデフォルトで無効にするので、**I understand my workflows, go ahead and enable them** をクリックします。

3. **最初のチェックを実行** —— 同じ Actions ページの左サイドバーで **Watch** を選び → **Run workflow** → **Run workflow**。（実在/ボットのスコアを早く埋めたい場合は *Max accounts to enrich* を大きくしてください。）初回実行が現在のフォロワーをベースラインとして記録し、サイトを公開します。

4. **ダッシュボードを開く** —— `https://<あなた>.github.io/github-follower-watchdog/`。以後、変化があった時間帯だけ毎時間自動で更新されます。

もし初回実行が *Configure Pages* で止まったら —— GitHub が workflow トークンによるサイト作成を拒むことがあります —— `https://github.com/<あなた>/github-follower-watchdog/settings/pages` を開いて **Source** を **GitHub Actions** に設定し、**Watch** をもう一度実行してください。

**スコアを速く埋める（任意ですが推奨）。** Actions の `GITHUB_TOKEN` は自分のトークンより厳しいレート制限下にあり、CI は毎時 `WATCH_ENRICH_CAP`（既定 40）アカウントしか収集できません。フォロワーが少なければ穏やかなウォームアップですが、千人を超えると、スコアが全部埋まるまで何十時間もの CI がスロットルされたリクエストのバックフィルに費やされます。何も有効化する前に、まず自分のマシンで初回分を済ませるのがおすすめです：

```bash
git clone https://github.com/<あなた>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # 自分のトークン: 毎時 5000 リクエスト
WATCH_ENRICH_CAP=200 just watch        # "no changes" と出るまで繰り返す
```

生成された `data/` の記録をブランチにコミットして PR を出してマージすれば —— 次の毎時実行からそのファイルを取り込み、古くなった部分だけを更新します。

**データの場所。** `data/current.json` が最新の名簿、`data/history.jsonl` が追記専用のフォロー／解除ログ、`data/accounts.json` がスコアの元になるアカウント事実です。すべて CI のみが書き込み、fork にコミットされます —— `git log -- data/` が完全な監査証跡です。外部サービスもデータベースもなく、信じるのは git だけです。

**他人を監視する。** `.github/workflows/watch.yml` の `WATCH_USER` を設定するか（ローカルなら `just watch <ログイン名>`）、任意の公開アカウントを監視できます。

## 仕組み

- `scripts/watchdog.py` —— 取得部のすべて：上限付きページング、アトミック書き込み、スナップショット→履歴の書き込み順（クラッシュしてもタイムライン 1 行を失うだけで、イベントが重複することはありません）、そして API 失敗時は一切書き込まない鉄則。第 2 段階はベストエフォートのプロファイル収集です：毎回の実行で最大 `WATCH_ENRICH_CAP`（既定 40、上限 200）アカウントを REST ユーザーエンドポイントと 1 回のバッチ GraphQL クエリで取得し、事実が変わったときだけ書き込みます。
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` —— 記録の実体。**CI のみが書き込みます**（AGENTS.md §5）。
- `.github/workflows/watch.yml` —— 毎時 cron + 手動 + push：watchdog → 変化があればコミット → サイトをビルド → Pages へデプロイ。変化のない時間帯はビルドをスキップして約 20 秒、変化があっても 1 分ほどです。（GitHub はリポジトリが 60 日間非アクティブだと定期実行を無効化します —— データコミット自体がアクティビティになります。）
- `site/` —— ダッシュボード。Vite + Vue 3 TSX（`.vue` SFC なし）+ SCSS + vue-i18n、8 言語。記録はそのまま公開アセットとしてバンドルにコピーされ実行時に取得されるため、データだけの変更にアプリの再ビルドは不要です。スコア計算はすべてブラウザ側（`site/src/data/scoring.ts`）です。

## スコアモデル

スコアは意図して説明可能に設計されています —— 実在人物の典型的シグナルで加算し、ボットの典型的形状で乗算的に減点します：

| シグナル | 配点 |
| --- | --- |
| フォロー比率のバランス（フォロー 0、または比率 ≤ 2） | 最大 +25 |
| 昨年の貢献数（GraphQL） | 最大 +30 |
| 公開リポジトリ数 | 最大 +15 |
| プロフィール充実度（名前・自己紹介・会社・場所・ブログ） | 最大 +10 |
| アカウント年齢 | 最大 +15 |
| 大量フォロー型（フォロー ≥ 500 かつフォロワー < 50） | × 0.5 |
| 空アカウント型（貢献 0 かつリポジトリ 0） | × 0.6 |

ダッシュボードでは **実在**（≥ 60）、**要確認**（30–59）、**ボット疑い**（< 30）の 3 グループで絞り込めます。プロファイルはランダムに少しずつ更新され（毎時約 40 アカウント）、レート制限に一切触れずに最新状態を保ちます。

## ローカル開発

```bash
npm --prefix site install   # 初回のみ
just watch                  # watchdog を 1 回実行（対象: origin owner、またはログイン名を指定）
just dev                    # サイトの開発サーバー :5174
just build                  # 型チェック + 本番ビルド
just lint-msg               # master..HEAD のコミットタイトルを検証（AGENTS.md §1）
```

フォロワー一覧の取得だけなら `GITHUB_TOKEN` は任意ですが、アカウントのプロファイル収集（＝スコア）はトークンがあるときだけ動きます —— `export GITHUB_TOKEN=$(gh auth token)`。

## ドキュメント

各言語の README は [`docs/`](../../) にあります（`docs/<lang>/guides/README-github-follower-watchdog.md`、英語のほか 8 言語）。AI エージェントと人間の貢献者共通のリポジトリ規約は [`AGENTS.md`](../../../AGENTS.md) にあります。

ソース: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog)。
