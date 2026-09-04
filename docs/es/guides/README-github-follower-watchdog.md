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

Sobre la lista en crudo, el watchdog **perfila a cada seguidor dentro de presupuestos estrictos de rate limit** (volumen de contribuciones, equilibrio siguiendo/seguidores, repos públicos, completitud del perfil, antigüedad de la cuenta) y el panel convierte esos hechos en una puntuación transparente de 0 a 100 que separa a los humanos probables de los bots sospechosos de seguimiento masivo.

Haz fork y pasa a ser **tuyo**: la cuenta vigilada se deduce del propietario del repositorio, los registros heredados se reinician en la primera ejecución del fork, y el mismo workflow activa y despliega GitHub Pages para el fork automáticamente.

## Inicio rápido

Todo lo que sigue lleva unos dos minutos tras el fork.

1. **Haz fork del repositorio** — el nombre es libre; esta guía asume que conservaste `github-follower-watchdog`.

2. **Activa Actions en tu fork** — abre `https://github.com/<tú>/github-follower-watchdog/actions` en un navegador. GitHub desactiva los workflows en forks nuevos por defecto; pulsa **I understand my workflows, go ahead and enable them**.

3. **Lanza la primera comprobación** — en esa misma página de Actions, elige **Watch** en la barra lateral → **Run workflow** → **Run workflow**. (Puedes subir *Max accounts to enrich* aquí si quieres que las puntuaciones se completen antes.) Esa primera ejecución registra tus seguidores actuales como línea base y publica tu sitio.

4. **Abre tu panel** — `https://<tú>.github.io/github-follower-watchdog/`. A partir de ahí se refresca solo cada hora, cuando algo cambió.

Si la primera ejecución se detiene en el paso *Configure Pages* — GitHub a veces rechaza que el token del workflow cree el sitio — abre `https://github.com/<tú>/github-follower-watchdog/settings/pages`, pon **Source → GitHub Actions** y ejecuta **Watch** otra vez.

**Llenar las puntuaciones más rápido (opcional pero recomendado).** El token de Actions vive bajo límites más estrictos que el tuyo, y la CI enriquece como máximo `WATCH_ENRICH_CAP` (por defecto 40) cuentas por ejecución horaria. Con una lista pequeña es un calentamiento suave — con un millar de seguidores son unas 25 horas de runs de CI moliendo peticiones de relleno estranguladas antes de que cada tarjeta lleve una puntuación. Haz la primera pasada en tu propia máquina, incluso antes de activar nada:

```bash
git clone https://github.com/<tú>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # tu propio token: 5000 peticiones/hora
WATCH_ENRICH_CAP=200 just watch        # repite hasta que diga «no changes»
```

Luego confirma los registros `data/` producidos en una rama, abre una PR y fusiónala — la siguiente ejecución horaria adopta el archivo y solo refresca lo que envejeció.

**Dónde viven los datos.** `data/current.json` es la lista al día, `data/history.jsonl` el registro de solo adición de follows/unfollows, y `data/accounts.json` los hechos por cuenta tras las puntuaciones. Los tres los escribe solo la CI y se confirman en tu fork — `git log -- data/` es la pista de auditoría completa: sin servicios externos, sin base de datos, nada que creer más que git.

**Vigilar a otro.** Define `WATCH_USER` en `.github/workflows/watch.yml` (o pasa la cuenta como argumento a `just watch <login>` en local) para vigilar cualquier cuenta pública en lugar de la tuya.

## Cómo funciona

- `scripts/watchdog.py` — todo el capturador: paginación acotada, escrituras atómicas, orden de instantánea-primero-luego-historial (una ejecución abortada puede perder una línea de la cronología, nunca duplicar eventos), y la regla de oro de «no se escriben datos ante cualquier fallo de la API» para la instantánea. Una segunda fase de mejor esfuerzo enriquece hasta `WATCH_ENRICH_CAP` (por defecto 40, máximo 200) cuentas por ejecución vía el endpoint REST de usuario más una consulta GraphQL agrupada, y solo escribe si algún hecho cambió de verdad.
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` — los registros; **escritos solo por la CI** (AGENTS.md §5).
- `.github/workflows/watch.yml` — cron horario + manual + push: watchdog → commit si hubo cambios → build del sitio → despliegue en Pages. Las horas sin cambios se saltan el build y terminan en ~20 s; el camino con cambios ronda el minuto. (GitHub desactiva los workflows programados tras 60 días de inactividad del repositorio — los propios commits de datos cuentan como actividad.)
- `site/` — el panel. Vite + Vue 3 en TSX (sin SFC `.vue`) + SCSS + vue-i18n, 8 idiomas. Los registros se copian tal cual en el bundle como recursos públicos y se obtienen en tiempo de ejecución, así que un cambio de solo datos jamás requiere reconstruir la aplicación; la puntuación se calcula íntegramente en el navegador en `site/src/data/scoring.ts`.

## El modelo de puntuación

La puntuación es deliberadamente explicable — los puntos se suman por las señales humanas clásicas y dos penalizaciones multiplican a la baja las formas clásicas de bot:

| Señal | Puntos |
| --- | --- |
| Equilibrio siguiendo/seguidores (0 siguiendo, o ratio ≤ 2) | hasta +25 |
| Contribuciones del último año (GraphQL) | hasta +30 |
| Repos públicos | hasta +15 |
| Completitud del perfil (nombre, bio, empresa, ubicación, blog) | hasta +10 |
| Antigüedad de la cuenta | hasta +15 |
| Forma «seguimiento masivo» (siguiendo ≥ 500, seguidores < 50) | × 0.5 |
| Forma «cuenta vacía» (sin contribuciones y sin repos) | × 0.6 |

Los grupos **Reales** (≥ 60), **Dudosos** (30–59) y **Sospechosos** (< 30) se pueden filtrar en el panel. Los perfiles se refrescan poco a poco (una muestra aleatoria, ~40 cuentas por hora) sin tocar jamás un rate limit.

## Desarrollo local

```bash
npm --prefix site install   # una vez
just watch                  # una ejecución del watchdog (objetivo: owner de origin, o pasa un login)
just dev                    # servidor de desarrollo del sitio en :5174
just build                  # comprobación de tipos + build de producción
just lint-msg               # sujetos de commits en master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` es opcional para una simple lectura de seguidores, pero el enriquecimiento de cuentas (las puntuaciones) solo corre con un token en el entorno — `export GITHUB_TOKEN=$(gh auth token)`.

## Documentación

Los README traducidos viven en [`docs/`](../../) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 idiomas además de este). Las reglas del repositorio, para agentes IA y contribuyentes humanos por igual, están en [`AGENTS.md`](../../../AGENTS.md).

Fuente: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).
