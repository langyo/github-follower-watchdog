<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>Surveillance horaire des abonnés de votre profil GitHub — native CI, consignée dans git, publiée sur Pages</strong></p>

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
**Français** ·
[Español](../../es/guides/README-github-follower-watchdog.md) ·
[Русский](../../ru/guides/README-github-follower-watchdog.md) ·
[العربية](../../ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog est un moniteur d'abonnés sans serveur qui vit entièrement dans un dépôt. Il fonctionne en trois temps :

1. **Vérification horaire** — un cron GitHub Actions exécute un script Python entièrement en bibliothèque standard (pas de `pip install`, pas d'étape de préparation) qui parcourt l'API publique des abonnés par pages et termine en quelques secondes.

2. **Deltas consignés dans git** — chaque exécution compare la liste fraîche à `data/current.json` et ajoute les abonnements et désabonnements au journal en ajout seul `data/history.jsonl`. Seules les variations réelles produisent un commit (`🔄 Sync follower snapshot.`) ; une heure calme n'écrit rien du tout — l'historique git *est* le journal des changements.

3. **Tableau de bord publié sur Pages** — chaque variation redéploie un tableau de bord monopage (Vue 3 · TSX · SCSS · vue-i18n, 8 langues, sombre et clair) montrant la tendance du nombre d'abonnés, la chronologie des abonnements/désabonnements et la liste actuelle.

Forkez-le et il devient **à vous** : le compte surveillé est déduit du propriétaire du dépôt, les enregistrements hérités sont réinitialisés à la première exécution du fork, et le même workflow active et déploie GitHub Pages pour le fork automatiquement. L'architecture du frontend, l'infrastructure de build et les conventions du dépôt sont adaptées de [wowsp](https://github.com/langyo/wowsp).

## Démarrage rapide

1. Forkez le dépôt.
2. Activez **Actions** sur votre fork — GitHub désactive les workflows des forks récents par défaut (Repository → Actions → « I understand my workflows, go ahead and enable them »).
3. Déclenchez une fois le workflow **Watch** via **Run workflow** — cette première exécution enregistre vos abonnés actuels comme référence et publie votre site Pages.
4. Ouvrez `https://<vous>.github.io/github-follower-watchdog/` — ensuite, il se rafraîchit tout seul toutes les heures.

Pour surveiller n'importe quel autre compte public, définissez `WATCH_USER` dans `.github/workflows/watch.yml`.

## Comment ça marche

- `scripts/watchdog.py` — tout le récupérateur : pagination bornée, écritures atomiques, ordre instantané-puis-historique (une exécution interrompue peut perdre une ligne de chronologie, jamais dupliquer d'événements), et la règle absolue « aucune donnée écrite en cas d'échec API ».
- `data/current.json` + `data/history.jsonl` — les enregistrements ; **écrits par la CI uniquement** (AGENTS.md §5), un ajout + un commit par variation.
- `.github/workflows/watch.yml` — cron horaire + manuel + push : watchdog → commit si modification → build du site → déploiement Pages. Les heures sans modification sautent le build et se terminent en ~20 s ; le chemin avec modification reste bien sous la minute. (GitHub désactive les workflows planifiés après 60 jours d'inactivité du dépôt — les commits de données comptent eux-mêmes comme activité.)
- `site/` — le tableau de bord. Vite + Vue 3 en TSX (pas de SFC `.vue`) + SCSS + vue-i18n, d'après l'architecture du site wowsp. Les enregistrements sont copiés tels quels dans le bundle comme ressources publiques et récupérés à l'exécution, donc une modification de données seule n'exige jamais un rebuild de l'application.

## Développement local

```bash
pnpm -C site install   # une fois
just watch             # une exécution du watchdog (cible : owner de origin, ou passez un login)
just dev               # serveur de dev du site sur :5174
just build             # vérification de types + build de production
just lint-msg          # sujets de commits sur master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` est facultatif en local — il fait passer la limite d'appels API de 60 à 5000 par heure.

## Documentation

Les README traduits vivent sous [`docs/`](../../) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 langues en plus de celle-ci). Les règles du dépôt, pour les agents IA comme pour les contributeurs humains, sont dans [`AGENTS.md`](../../../AGENTS.md).

Source : [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

## Statut

🎉 **Prêt** — la surveillance horaire, l'historique consigné dans git et le tableau de bord Pages sont en ligne ; le workflow active aussi Pages sur les forks récents. La feuille de route reste volontairement courte : plus de langues pour la page, et un mode instantané par webhook, sont les deux seules idées au programme.
