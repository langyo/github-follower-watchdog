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

나아가 watchdog 는 엄격한 API 한도 안에서 **팔로워 각자의 프로필을 수집**하고(최근 1년 기여 수, 팔로잉/팔로워 비율, 공개 저장소 수, 프로필 완성도, 계정 나이), 대시보드는 그 사실을 설명 가능한 0–100 점수로 바꿔 실제 사람과 대량 팔로우 봇 의심 계정을 구분합니다.

Fork 하면 **당신의 것**이 됩니다: 감시 대상 계정은 저장소 owner에서 자동으로 결정되고, 물려받은 기록은 fork 첫 실행 시 초기화되며, 같은 workflow가 fork의 GitHub Pages를 자동으로 활성화하고 배포합니다.

## 빠른 시작

Fork 후 아래를 따르면 됩니다. 2분 정도 걸립니다.

1. **저장소를 fork** —— 이름은 자유입니다. 이 가이드는 `github-follower-watchdog` 이름을 그대로 유지한다고 가정합니다.

2. **fork 에서 Actions 활성화** —— 브라우저에서 `https://github.com/<you>/github-follower-watchdog/actions` 를 엽니다. GitHub 는 새 fork 의 workflow를 기본적으로 비활성화하므로 **I understand my workflows, go ahead and enable them** 을 클릭합니다.

3. **첫 점검 실행** —— 같은 Actions 페이지 왼쪽 사이드바에서 **Watch** 선택 → **Run workflow** → **Run workflow**. (실제/봇 점수를 더 빨리 채우려면 *Max accounts to enrich* 값을 올리세요.) 첫 실행이 현재 팔로워를 기준선으로 기록하고 사이트를 게시합니다.

4. **대시보드 열기** —— `https://<you>.github.io/github-follower-watchdog/`. 이후 매시간, 데이터가 바뀐 경우에만 자동으로 다시 배포됩니다.

첫 실행이 *Configure Pages* 단계에서 멈춘다면 —— GitHub 가 workflow 토큰의 사이트 생성을 거부하는 경우가 있습니다 —— `https://github.com/<you>/github-follower-watchdog/settings/pages` 를 열어 **Source** 를 **GitHub Actions** 로 설정한 뒤 **Watch** 를 한 번 더 실행하세요.

**점수를 더 빨리 채우기(선택이지만 권장).** Actions 의 `GITHUB_TOKEN` 은 자신의 토큰보다 한도가 빡빡하고, CI 는 매시간 `WATCH_ENRICH_CAP`(기본 40)개 계정만 수집합니다. 팔로워가 적으면 느린 워밍업일 뿐이지만, 천 명을 넘으면 모든 카드에 점수가 채워지기까지 수십 시간의 CI 가 스로틀된 백필 요청에 소모됩니다. 아무것도 활성화하기 전에 먼저 자기 컴퓨터에서 첫 패스를 돌리는 것을 권장합니다:

```bash
git clone https://github.com/<you>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # 자신의 토큰: 매시간 5000회
WATCH_ENRICH_CAP=200 just watch        # "no changes" 가 나올 때까지 반복
```

생성된 `data/` 기록을 브랜치에 커밋해 PR 을 열고 머지하면 —— 다음 매시간 실행이 그 파일을 받아들여 오래된 부분만 새로 고칩니다.

**데이터의 위치.** `data/current.json` 은 최신 명단, `data/history.jsonl` 은 추가 전용 팔로우/언팔로우 로그, `data/accounts.json` 은 점수의 근거가 되는 계정 사실입니다. 셋 모두 CI 만 쓰고 fork 에 커밋됩니다 —— `git log -- data/` 가 완전한 감사 기록입니다. 외부 서비스도 데이터베이스도 없이 git 만 믿으면 됩니다.

**다른 사람 감시하기.** `.github/workflows/watch.yml` 에서 `WATCH_USER` 를 설정하거나(로컬에서는 `just watch <로그인명>`), 공개 계정이면 누구든 감시할 수 있습니다.

## 동작 방식

- `scripts/watchdog.py` —— 가져오기의 전부: 상한 있는 페이징, 원자적 쓰기, 스냅샷 먼저·히스토리 나중의 순서(크래시가 나도 타임라인 한 줄만 잃고 이벤트가 중복되지는 않음), 그리고 어떤 API 실패에도 "아무것도 쓰지 않는" 철칙. 두 번째 단계는 베스트 에포트 프로필 수집입니다: 매번의 실행에서 최대 `WATCH_ENRICH_CAP`(기본 40, 상한 200)개 계정을 REST 사용자 엔드포인트와 1회의 배치 GraphQL 쿼리로 가져오고, 사실이 바뀐 경우에만 기록합니다.
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` —— 기록 그 자체. **CI 만 씁니다**(AGENTS.md §5).
- `.github/workflows/watch.yml` —— 매시간 cron + 수동 + push: watchdog → 변화가 있으면 커밋 → 사이트 빌드 → Pages 배포. 변화가 없는 시간대는 빌드를 건너뛰어 약 20초, 변화가 있는 경로도 1분 정도입니다.(GitHub 는 저장소가 60일간 비활동이면 스케줄 작업을 비활성화합니다 —— 데이터 커밋 자체가 활동입니다.)
- `site/` —— 대시보드. Vite + Vue 3 TSX(`.vue` SFC 없음)+ SCSS + vue-i18n, 8개 언어. 기록은 공개 에셋으로 그대로 번들에 복사되어 런타임에 가져오므로, 데이터만 바뀌면 앱을 다시 빌드할 필요가 없습니다. 점수 계산은 전부 브라우저 쪽(`site/src/data/scoring.ts`)에서 이루어집니다.

## 점수 모델

점수는 의도적으로 설명 가능하게 설계되었습니다 —— 실제 사람의 전형적인 신호로 가산하고, 봇의 전형적인 형태에 곱셈 페널티를 적용합니다:

| 신호 | 배점 |
| --- | --- |
| 팔로잉/팔로워 균형(팔로잉 0, 또는 비율 ≤ 2) | 최대 +25 |
| 최근 1년 기여 수(GraphQL) | 최대 +30 |
| 공개 저장소 수 | 최대 +15 |
| 프로필 완성도(이름·소개·회사·위치·블로그) | 최대 +10 |
| 계정 나이 | 최대 +15 |
| 대량 팔로우 형태(팔로잉 ≥ 500 이고 팔로워 < 50) | × 0.5 |
| 빈 계정 형태(기여 0 이고 저장소 0) | × 0.6 |

대시보드에서 **실제**(≥ 60), **불확실**(30–59), **봇 의심**(< 30) 세 그룹으로 필터링할 수 있습니다. 프로필은 무작위로 조금씩 새로 고쳐지며(매시간 약 40개 계정), API 한도를 넘지 않으면서 최신 상태를 유지합니다.

## 로컬 개발

```bash
npm --prefix site install   # 최초 1회
just watch                  # watchdog 1회 실행(대상: origin owner, 또는 로그인명 전달)
just dev                    # 사이트 개발 서버 :5174
just build                  # 타입 검사 + 프로덕션 빌드
just lint-msg               # master..HEAD 커밋 제목 검사(AGENTS.md §1)
```

팔로워 목록 조회만이라면 `GITHUB_TOKEN`은 선택 사항이지만, 계정 프로필 수집(＝점수)은 토큰이 있을 때만 동작합니다 —— `export GITHUB_TOKEN=$(gh auth token)`.

## 문서

각 언어의 README 는 [`docs/`](../../)에 있습니다(`docs/<lang>/guides/README-github-follower-watchdog.md`, 영어 외 8개 언어). AI 에이전트와 사람 기여자 모두를 위한 저장소 규약은 [`AGENTS.md`](../../../AGENTS.md)를 참고하세요.

소스: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).
