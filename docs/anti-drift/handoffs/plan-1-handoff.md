# Plan 1 — Handoff (fin de session d'exécution)

**Date:** 2026-07-19 06:27 · **Branche:** `plan-1-socle-blog-deploye` · **État:** **prêt à ship, en attente de l'utilisateur**

Ce n'est pas un échec : le bootstrap anti-drift définit « prêt à ship, décisions en attente » comme l'**état de succès** quand l'utilisateur est indisponible. Tout le code du Plan 1 est écrit, revu (per-tâche + revue finale de branche), corrigé et vérifié. Il reste **deux catégories d'action qui n'appartiennent qu'à toi**, puis la Phase Z.

## 1. Où on en est — 8/9 critères Done

| Critère | État | Preuve |
|---|---|---|
| R2 home (hero + grille) | ✅ Done | smoke contrôleur (`c32fa53`) |
| R3 article (TOC + copie + bannière IA) | ✅ Done | smoke (`db9440c`+fix `1cf11ae`) : TOC 50 liens, 42 blocs code mono, copie=code seul, bannière |
| R4 `/blog` (tous publiés, anté-chrono, pas de draft) | ✅ Done | smoke : 6 cartes (`3f1d8af`) |
| R5 toggle thème persistant | ✅ Done | smoke 4/4 (`2c9a2ad`) |
| R6 migration 6 articles + images | ✅ Done | `getPublishedPosts()`=6, images rendues (`6576f8e`) |
| R7 `/rss.xml` | ✅ Done | 6 items bien formés (`cae31c2`) |
| R8 design system (tokens+3 polices+mono) | ✅ Done | smoke (`37709c6`+`2c9a2ad`) |
| R9 responsive 375px | ✅ Done | smoke 8 pages = 375 (`29ad133`) |
| **R1 déploiement** | ⏳ **BLOQUÉ (toi)** | workflow écrit (`e4b42a8`, Node 22 `744d4a6`) ; **création repo + push + Pages = tes actions** |

Tests: `vitest` 1/1 · `astro check` 0 err/0 warn · `astro build` 8 pages. Revue finale de branche (opus) : après fixes, code **sain, prêt à ship (en attente déploiement)**.

## 2. TON ACTION #1 — Déploiement (débloque R1)

Le workflow `.github/workflows/deploy.yml` est prêt (build en Node 22, `withastro/action` + `deploy-pages`). Il te reste (côté GitHub, compte **bendevcat**) :

1. **Créer le repo `bendevcat.github.io`** — ⚠️ **le nom EXACT compte** : le site est un *user-site* sans `base`, les assets sont en chemins racine (`/_astro/…`). Si le repo s'appelle autrement (ex. `astro-bencatdev`), GitHub sert sous `/astro-bencatdev/` et **tout 404** alors que le workflow passe au vert (finding I1 de la revue).
2. `git remote add origin git@github.com:bendevcat/bendevcat.github.io.git` puis `git push -u origin plan-1-socle-blog-deploye:main` (ou merge la branche dans `main` d'abord — cf. §4).
3. **Settings → Pages → Source = GitHub Actions**.
4. Vérifier R1 : le run Actions finit **vert** ; `curl -sI https://bendevcat.github.io` → `200` ; `curl -s https://bendevcat.github.io/rss.xml` → RSS.

## 3. TON ACTION #2 — Ratifier les 6 déviations (`plan-1-deviations.md`)

Toutes en `pending-user` (le seul statut qu'un agent écrit). La Phase Z **refuse de ship** tant qu'il en reste une non tranchée. Résumé (détail complet dans le log) :

| # | Sujet | Réversibilité | Décision attendue |
|---|---|---|---|
| **D01** | Drapeau `--typescript strict` retiré du scaffold (CLI Astro l'a supprimé ; strict TS obtenu quand même) | cheap | ratifier (aucun impact) |
| **D02** | `.gitignore` du repo conservé (protège `.superpowers/`) au lieu de celui du template | cheap | ratifier ou demander la version template |
| **D03** | **3 articles sans cover** (docker, linux, vpn) — covers Unsplash distantes non téléchargées (règle sécurité) | cheap | **(a)** m'autoriser à télécharger+co-localiser · **(b)** re-couvrir via CMS Plan 2 · **(c)** laisser sans |
| **D04** | `@astrojs/markdown-remark` installé (Astro 7 : rehype exige de réactiver le pipeline unified) | cheap | ratifier ou revenir au moteur natif Astro 7 |
| **D05** | Route article filtre les drafts (`getPublishedPosts` au lieu de `getCollection`) — corrige une incohérence du plan vs R4/R6 | cheap | ratifier |
| **D06** | Workflow : **Node 22 épinglé** (Astro 7 exige ≥22, sinon 1er deploy échoue) + `concurrency` Pages | cheap | ratifier (le pin Node est requis pour R1) |

**La seule décision à vrai enjeu est D03** (les 3 covers). Les autres sont des ratifications de conséquences techniques d'Astro v7 / de corrections d'incohérences.

## 4. Puis — Phase Z (le gate de ship, NON lancé cette session)

Quand #2 et #3 sont faits :
- Lancer **`/anti-drift-planning:verify 1`** — audit canonique (couverture R1–R9, tests, walkthrough user-story, revue déviations = 0 `pending-user`). C'est le **seul** chemin vers le ship + le tag `milestone-plan-1` (= `v0.1.0`).
- Sur PASS → il émet l'étape suivante (bootstrap du Plan 2 — CMS Sveltia).
- Pour régénérer un prompt de reprise : **`/anti-drift-planning:resume 1`**.

## 5. Notes (non bloquantes)

- **Astro résolu en v7.1.1** (la contrainte dit « v5+ » → conforme). Trois conséquences v7 rencontrées et gérées : `z` deprecated (hints), pipeline markdown (D04), Node 22 CI (D06).
- **Favicon** : le stock Astro s'affiche en placeholder ; ton vrai favicon/logo est une décision design §6 (plus tard).
- **Autres Minor** consignés (hors-scope Plan 1) : 2 descriptions à re-tutoyer (docker/linux — éditables au CMS Plan 2), images source lourdes (~6 Mo ; le build sert du `.webp` optimisé), tab-order nav <640px (pertinent quand Projets/Prompts/Skills s'activeront aux Plans 3-4), pas de meta OG/canonical ni `/404` (non requis Plan 1). Liste complète : scratchpad `minor-findings.md` (éphémère) — reportée ici pour mémoire.
- **`main` vs branche** : tout est sur `plan-1-socle-blog-deploye`. Le workflow se déclenche sur push vers `main`. Choix : merger la branche dans `main` puis push, ou push la branche vers `main` du repo distant. (Le tag `milestone-plan-1` viendra de la Phase Z, pas avant.)
