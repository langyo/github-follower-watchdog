<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>Ежечасное наблюдение за подписчиками вашего профиля GitHub — нативно в CI, с записью в git и публикацией на Pages</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

[English](../../../README.md) ·
[简体中文](../../zh-CN/guides/README-github-follower-watchdog.md) ·
[繁體中文](../../zh-TW/guides/README-github-follower-watchdog.md) ·
[日本語](../../ja/guides/README-github-follower-watchdog.md) ·
[한국어](../../ko/guides/README-github-follower-watchdog.md) ·
[Français](../../fr/guides/README-github-follower-watchdog.md) ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
**Русский** ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog — монитор подписчиков без сервера, целиком живущий внутри репозитория. Работает в три движения:

1. **Ежечасная проверка** — крон GitHub Actions запускает скрипт на чистом стандартном Python (без `pip install`, без этапов подготовки), который постранично читает публичный API подписчиков и завершается за секунды.

2. **Дельты записываются в git** — каждый прогон сравнивает свежий список с `data/current.json` и дописывает события подписки и отписки в журнал только на добавление `data/history.jsonl`. Коммит (`🔄 Sync follower snapshot.`) порождают только реальные изменения; спокойный час не пишет ничего вовсе — история git и есть журнал изменений.

3. **Дашборд на Pages** — каждое изменение передеплоит одностраничный дашборд (Vue 3 · TSX · SCSS · vue-i18n, 8 языков, тёмная и светлая темы), показывающий динамику числа подписчиков, хронологию подписок/отписок и текущий список.

Сделайте форк — и он становится **вашим**: наблюдаемый аккаунт определяется владельцем репозитория, унаследованные записи сбрасываются при первом прогоне форка, а тот же workflow автоматически включает и разворачивает GitHub Pages для форка. Архитектура фронтенда, сборочная инфраструктура и правила репозитория адаптированы из [wowsp](https://github.com/langyo/wowsp).

## Быстрый старт

1. Сделайте форк репозитория.
2. Включите **Actions** в своём форке — GitHub по умолчанию отключает workflows в свежих форках (Repository → Actions → «I understand my workflows, go ahead and enable them»).
3. Запустите workflow **Watch** один раз кнопкой **Run workflow** — первый прогон зафиксирует текущих подписчиков как базовую линию и опубликует ваш сайт на Pages.
4. Откройте `https://<вы>.github.io/github-follower-watchdog/` — дальше он обновляется сам каждый час.

Если первый прогон упадёт на шаге *Configure Pages* — GitHub иногда не даёт токену workflow создать сайт — включите его один раз через **Settings → Pages → Source: GitHub Actions** и запустите workflow ещё раз.

Чтобы наблюдать за любым другим публичным аккаунтом, задайте `WATCH_USER` в `.github/workflows/watch.yml`.

## Как это устроено

- `scripts/watchdog.py` — весь сборщик: ограниченная пагинация, атомарные записи, порядок «сначала снимок, потом журнал» (оборванный прогон может потерять одну строку хронологии, но никогда не задублирует события) и железное правило «при любой ошибке API ничего не писать».
- `data/current.json` + `data/history.jsonl` — сами записи; **пишет только CI** (AGENTS.md §5), одно изменение = одна дописанная строка + один коммит.
- `.github/workflows/watch.yml` — ежечасный крон + ручной запуск + push: watchdog → коммит при изменении → сборка сайта → деплой на Pages. Часы без изменений пропускают сборку и завершаются за ~20 с; ветка с изменениями уверенно укладывается в минуту. (GitHub отключает запланированные workflows после 60 дней неактивности репозитория — а коммиты с данными сами по себе активность.)
- `site/` — дашборд. Vite + Vue 3 на TSX (без `.vue` SFC) + SCSS + vue-i18n, по архитектуре website из wowsp. Записи копируются в бандл как публичные ресурсы без изменений и загружаются в рантайме, поэтому изменение только данных никогда не требует пересборки приложения.

## Локальная разработка

```bash
npm --prefix site install   # один раз
just watch                  # один прогон watchdog (цель: владелец origin, или передайте логин)
just dev                    # dev-сервер сайта на :5174
just build                  # проверка типов + production-сборка
just lint-msg               # темы коммитов в master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` локально необязателен — он поднимает лимит API с 60 до 5000 запросов в час.

## Документация

Переведённые README лежат в [`docs/`](../../) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 языков помимо этого). Правила репозитория — для ИИ-агентов и людей-контрибьюторов alike — в [`AGENTS.md`](../../../AGENTS.md).

Исходник: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

## Статус

🎉 **Готов** — ежечасное наблюдение, история в git и дашборд на Pages работают; workflow вдобавок сам включает Pages в свежих форках. Роадмап намеренно короткий: больше языков страницы и режим мгновенных событий на webhook — единственные идеи в списке.
