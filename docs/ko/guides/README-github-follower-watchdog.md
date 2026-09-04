<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>GitHub 프로필의 팔로워를 매시간 점검 —— CI 네이티브, git 기록, Pages 게시</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

[English](../../../README.md) ·
[简体中文](../../zh-CN/guides/README-github-follower-watchdog.md) ·
[繁體中文](../../zh-TW/guides/README-github-follower-watchdog.md) ·
[日本語](../../ja/guides/README-github-follower-watchdog.md) ·
**한국어** ·
[Français](../../fr/guides/README-github-follower-watchdog.md) ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog는 저장소 안에서만 완전히 돌아가는 서버 없는 팔로워 감시 도구입니다. 세 가지 동작으로 구성됩니다:

1. **매시간 점검** —— GitHub Actions 스케줄 작업이 표준 라이브러리만 사용하는 Python 스크립트(`pip install` 불필요, 셋업 단계 없음)를 실행해 공개 팔로워 API를 페이징으로 조회하고 몇 초 만에 끝냅니다.

2. **git 에 증분 기록** —— 매번의 실행은 최신 목록과 `data/current.json`을 비교하고, 팔로우/언팔로우 이벤트를 추가 전용 로그 `data/history.jsonl`에 덧붙입니다. 실제 변동이 있을 때만 커밋(`🔄 Sync follower snapshot.`)이 생기고, 조용한 시간에는 아무것도 쓰지 않습니다 —— git 히스토리 그 자체가 변경 로그입니다.

3. **Pages 로 게시되는 대시보드** —— 변동이 있을 때마다 단일 페이지 대시보드(Vue 3 · TSX · SCSS · vue-i18n, 8개 언어, 다크 & 라이트)가 재배포되어 팔로워 수 추이, 팔로우/언팔로우 타임라인, 현재 명단을 보여줍니다.

Fork 하면 **당신의 것**이 됩니다: 감시 대상 계정은 저장소 owner에서 자동으로 결정되고, 물려받은 기록은 fork 첫 실행 시 초기화되며, 같은 workflow가 fork의 GitHub Pages를 자동으로 활성화하고 배포합니다. 프런트엔드 구조, 빌드 기반, 저장소 규약은 [wowsp](https://github.com/langyo/wowsp)에서 가져왔습니다.

## 빠른 시작

1. 이 저장소를 fork 합니다.
2. fork 에서 **Actions** 를 활성화합니다 —— GitHub 는 새 fork 의 workflow를 기본적으로 비활성화합니다(Repository → Actions → "I understand my workflows, go ahead and enable them").
3. **Run workflow** 로 **Watch** workflow를 한 번 실행합니다 —— 첫 실행이 현재 팔로워를 기준선으로 기록하고 Pages 사이트를 게시합니다.
4. `https://<you>.github.io/github-follower-watchdog/` 를 엽니다 —— 이후 매시간 자동으로 새로고침됩니다.

자신 이외의 공개 계정을 감시하려면 `.github/workflows/watch.yml`에서 `WATCH_USER`를 설정하세요.

## 동작 방식

- `scripts/watchdog.py` —— 가져오기의 전부: 상한 있는 페이징, 원자적 쓰기, 스냅샷 먼저·히스토리 나중의 순서(크래시가 나도 타임라인 한 줄만 잃고 이벤트가 중복되지는 않음), 그리고 어떤 API 실패에도 "아무것도 쓰지 않는" 철칙.
- `data/current.json` + `data/history.jsonl` —— 기록 그 자체. **CI 만 씁니다**(AGENTS.md §5). 변동 1회 = 추가 1회 + 커밋 1회.
- `.github/workflows/watch.yml` —— 매시간 cron + 수동 + push: watchdog → 변화가 있으면 커밋 → 사이트 빌드 → Pages 배포. 변화가 없는 시간대는 빌드를 건너뛰어 약 20초, 변화가 있는 경로도 1분 이내입니다.(GitHub 는 저장소가 60일간 비활동이면 스케줄 작업을 비활성화합니다 —— 데이터 커밋 자체가 활동입니다.)
- `site/` —— 대시보드. Vite + Vue 3 TSX(`.vue` SFC 없음)+ SCSS + vue-i18n, wowsp website 와 같은 구조. 기록은 공개 에셋으로 그대로 번들에 복사되어 런타임에 가져오므로, 데이터만 바뀌면 앱을 다시 빌드할 필요가 없습니다.

## 로컬 개발

```bash
pnpm -C site install   # 최초 1회
just watch             # watchdog 1회 실행(대상: origin owner, 또는 로그인명 전달)
just dev               # 사이트 개발 서버 :5174
just build             # 타입 검사 + 프로덕션 빌드
just lint-msg          # master..HEAD 커밋 제목 검사(AGENTS.md §1)
```

로컬의 `GITHUB_TOKEN`은 선택 사항입니다 —— API 한도를 매시간 60회에서 5000회로 올려줍니다.

## 문서

각 언어의 README 는 [`docs/`](../../)에 있습니다(`docs/<lang>/guides/README-github-follower-watchdog.md`, 영어 외 8개 언어). AI 에이전트와 사람 기여자 모두를 위한 저장소 규약은 [`AGENTS.md`](../../../AGENTS.md)를 참고하세요.

소스: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

## 상태

🎉 **가동 중** —— 매시간 점검, git 기록, Pages 대시보드가 모두 가동 중이며, workflow는 새 fork 에서도 Pages를 자동 활성화합니다. 로드맵은 의도적으로 짧게: 페이지 언어 추가와 webhook 기반 즉시 모드만이 목록에 있습니다.
