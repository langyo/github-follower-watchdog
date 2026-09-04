<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>Vigilancia horaria de los seguidores de tu perfil GitHub — nativa de CI, registrada en git, publicada en Pages</strong></p>

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
**Español** ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog es un monitor de seguidores sin servidor que vive por completo dentro de un repositorio. Funciona en tres movimientos:

1. **Comprobación horaria** — un cron de GitHub Actions ejecuta un script Python de solo biblioteca estándar (sin `pip install`, sin paso de preparación) que recorre la API pública de seguidores por páginas y termina en segundos.

2. **Deltas registrados en git** — cada ejecución compara la lista fresca con `data/current.json` y añade los seguidores ganados y perdidos al registro de solo adición `data/history.jsonl`. Solo los cambios reales producen un commit (`🔄 Sync follower snapshot.`); una hora tranquila no escribe nada: el historial de git *es* el registro de cambios.

3. **Panel publicado en Pages** — cada cambio redespliega un panel de una sola página (Vue 3 · TSX · SCSS · vue-i18n, 8 idiomas, oscuro y claro) que muestra la tendencia del número de seguidores, la cronología de follows/unfollows y la lista actual.

Haz fork y pasa a ser **tuyo**: la cuenta vigilada se deduce del propietario del repositorio, los registros heredados se reinician en la primera ejecución del fork, y el mismo workflow activa y despliega GitHub Pages para el fork automáticamente. La arquitectura del frontend, la infraestructura de build y las convenciones del repositorio están adaptadas de [wowsp](https://github.com/langyo/wowsp).

## Inicio rápido

1. Haz fork del repositorio.
2. Activa **Actions** en tu fork — GitHub desactiva los workflows en forks nuevos por defecto (Repository → Actions → «I understand my workflows, go ahead and enable them»).
3. Dispara una vez el workflow **Watch** con **Run workflow** — esa primera ejecución registra tus seguidores actuales como línea base y publica tu sitio de Pages.
4. Abre `https://<tú>.github.io/github-follower-watchdog/` — a partir de ahí se refresca solo cada hora.

Para vigilar cualquier otra cuenta pública, define `WATCH_USER` en `.github/workflows/watch.yml`.

## Cómo funciona

- `scripts/watchdog.py` — todo el capturador: paginación acotada, escrituras atómicas, orden de instantánea-primero-luego-historial (una ejecución abortada puede perder una línea de la cronología, nunca duplicar eventos), y la regla de oro de «no se escriben datos ante cualquier fallo de la API».
- `data/current.json` + `data/history.jsonl` — los registros; **escritos solo por la CI** (AGENTS.md §5), una adición + un commit por cambio.
- `.github/workflows/watch.yml` — cron horario + manual + push: watchdog → commit si hubo cambios → build del sitio → despliegue en Pages. Las horas sin cambios se saltan el build y terminan en ~20 s; el camino con cambios se queda holgadamente por debajo del minuto. (GitHub desactiva los workflows programados tras 60 días de inactividad del repositorio — los propios commits de datos cuentan como actividad.)
- `site/` — el panel. Vite + Vue 3 en TSX (sin SFC `.vue`) + SCSS + vue-i18n, siguiendo la arquitectura del website de wowsp. Los registros se copian tal cual en el bundle como recursos públicos y se obtienen en tiempo de ejecución, así que un cambio de solo datos jamás requiere reconstruir la aplicación.

## Desarrollo local

```bash
pnpm -C site install   # una vez
just watch             # una ejecución del watchdog (objetivo: owner de origin, o pasa un login)
just dev               # servidor de desarrollo del sitio en :5174
just build             # comprobación de tipos + build de producción
just lint-msg          # sujetos de commits en master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` es opcional en local — sube el límite de la API de 60 a 5000 peticiones por hora.

## Documentación

Los README traducidos viven en [`docs/`](../../) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 idiomas además de este). Las reglas del repositorio, para agentes IA y contribuyentes humanos por igual, están en [`AGENTS.md`](../../../AGENTS.md).

Fuente: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

## Estado

🎉 **Listo** — la vigilancia horaria, el historial registrado en git y el panel de Pages están en marcha; el workflow además activa Pages en forks nuevos. La hoja de ruta es deliberadamente corta: más idiomas para la página y un modo instantáneo basado en webhooks son las únicas ideas en la lista.
