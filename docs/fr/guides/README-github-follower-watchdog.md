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

Au-dessus de la liste brute, le watchdog **établit le profil de chaque abonné dans des budgets de rate-limit stricts** (volume de contributions, équilibre abonnements/abonnés, dépôts publics, complétude du profil, âge du compte) et le tableau de bord convertit ces faits en un score transparent de 0 à 100 qui sépare les humains probables des bots suspects de suivi de masse.

Forkez-le et il devient **à vous** : le compte surveillé est déduit du propriétaire du dépôt, les enregistrements hérités sont réinitialisés à la première exécution du fork, et le même workflow active et déploie GitHub Pages pour le fork automatiquement.

## Démarrage rapide

Tout ce qui suit prend environ deux minutes après le fork.

1. **Forkez le dépôt** — le nom est libre ; la suite suppose que vous avez gardé `github-follower-watchdog`.

2. **Activez Actions sur votre fork** — ouvrez `https://github.com/<vous>/github-follower-watchdog/actions` dans un navigateur. GitHub désactive les workflows des forks récents par défaut ; cliquez sur **I understand my workflows, go ahead and enable them**.

3. **Lancez la première vérification** — toujours sur cette page Actions, choisissez **Watch** dans la barre latérale → **Run workflow** → **Run workflow**. (Vous pouvez augmenter *Max accounts to enrich* ici si vous voulez que les scores remplissent plus vite.) Cette première exécution enregistre vos abonnés actuels comme référence et publie votre site.

4. **Ouvrez votre tableau de bord** — `https://<vous>.github.io/github-follower-watchdog/`. Ensuite, il se met à jour tout seul chaque heure, quand quelque chose a changé.

Si la première exécution s'arrête à l'étape *Configure Pages* — GitHub refuse parfois que le token du workflow crée le site — ouvrez `https://github.com/<vous>/github-follower-watchdog/settings/pages`, réglez **Source → GitHub Actions**, et relancez **Watch**.

**Remplir les scores plus vite (facultatif mais recommandé).** Le token des Actions vit sous des rate limits plus stricts que le vôtre, et la CI n'enrichit au plus que `WATCH_ENRICH_CAP` (défaut 40) comptes par exécution horaire. Avec une petite liste, c'est une simple montée en régime — avec un millier d'abonnés, cela signifie ~25 heures de runs CI qui broient des requêtes de backfill bridées avant que chaque carte porte un score. Faites la première passe sur votre propre machine, avant même d'activer quoi que ce soit :

```bash
git clone https://github.com/<vous>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # votre propre token : 5000 req/heure
WATCH_ENRICH_CAP=200 just watch        # relancez jusqu'à voir « no changes »
```

Commituez ensuite les relevés `data/` produits sur une branche, ouvrez une PR et fusionnez-la — la prochaine exécution horaire adopte le fichier et ne rafraîchit que ce qui a vieilli.

**Où vivent les données.** `data/current.json` est la liste à jour, `data/history.jsonl` le journal en ajout seul des abonnements/désabonnements, et `data/accounts.json` les faits par compte derrière les scores. Tout trois sont écrits par la CI seule et committés dans votre fork — `git log -- data/` est la piste d'audit complète : aucun service externe, aucune base de données, rien d'autre à confiance que git.

**Surveiller quelqu'un d'autre.** Définissez `WATCH_USER` dans `.github/workflows/watch.yml` (ou passez le compte en argument à `just watch <login>` localement) pour surveiller n'importe quel compte public à la place du vôtre.

## Comment ça marche

- `scripts/watchdog.py` — tout le récupérateur : pagination bornée, écritures atomiques, ordre instantané-puis-historique (une exécution interrompue peut perdre une ligne de chronologie, jamais dupliquer d'événements), et la règle absolue « aucune donnée écrite en cas d'échec API » pour l'instantané. Une seconde phase best-effort enrichit jusqu'à `WATCH_ENRICH_CAP` (défaut 40, max 200) comptes par exécution via l'endpoint REST utilisateur plus une requête GraphQL groupée, et n'écrit que si un fait a réellement changé.
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` — les enregistrements ; **écrits par la CI uniquement** (AGENTS.md §5).
- `.github/workflows/watch.yml` — cron horaire + manuel + push : watchdog → commit si modification → build du site → déploiement Pages. Les heures sans modification sautent le build et se terminent en ~20 s ; le chemin avec modification reste autour d'une minute. (GitHub désactive les workflows planifiés après 60 jours d'inactivité du dépôt — les commits de données comptent eux-mêmes comme activité.)
- `site/` — le tableau de bord. Vite + Vue 3 en TSX (pas de SFC `.vue`) + SCSS + vue-i18n, 8 langues. Les enregistrements sont copiés tels quels dans le bundle comme ressources publiques et récupérés à l'exécution, donc une modification de données seule n'exige jamais un rebuild de l'application ; le score est calculé intégralement côté navigateur dans `site/src/data/scoring.ts`.

## Le modèle de score

Le score est volontairement explicable — des points s'additionnent pour les signaux humains classiques, puis deux pénalités multiplient à la baisse les formes de bots classiques :

| Signal | Points |
| --- | --- |
| Équilibre abonnements/abonnés (0 abonnement, ou ratio ≤ 2) | jusqu'à +25 |
| Contributions sur la dernière année (GraphQL) | jusqu'à +30 |
| Dépôts publics | jusqu'à +15 |
| Complétude du profil (nom, bio, société, lieu, blog) | jusqu'à +10 |
| Âge du compte | jusqu'à +15 |
| Forme « suivi de masse » (abonnements ≥ 500, abonnés < 50) | × 0.5 |
| Forme « compte vide » (aucune contribution, aucun dépôt) | × 0.6 |

Les groupes **Réels** (≥ 60), **Incertains** (30–59) et **Suspects** (< 30) sont filtrables sur le tableau de bord. Les profils se rafraîchissent progressivement (un échantillon aléatoire, ~40 comptes par heure) sans jamais toucher un rate limit.

## Développement local

```bash
npm --prefix site install   # une fois
just watch                  # une exécution du watchdog (cible : owner de origin, ou passez un login)
just dev                    # serveur de dev du site sur :5174
just build                  # vérification de types + build de production
just lint-msg               # sujets de commits sur master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` est facultatif pour un simple relevé d'abonnés, mais l'enrichissement des comptes (les scores) ne tourne qu'avec un token dans l'environnement — `export GITHUB_TOKEN=$(gh auth token)`.

## Documentation

Les README traduits vivent sous [`docs/`](../../) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 langues en plus de celle-ci). Les règles du dépôt, pour les agents IA comme pour les contributeurs humains, sont dans [`AGENTS.md`](../../../AGENTS.md).

Source : [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).
