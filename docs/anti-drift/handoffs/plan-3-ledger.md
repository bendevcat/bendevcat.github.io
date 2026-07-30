# Plan 3 — Scope Ledger

Last updated: 2026-07-31 (pré-flight)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Collection `projects` + schéma Zod (page bundles) — `astro build` valide le schéma **ET** ≥ 2 fiches réelles chargées | In progress | T-A1 (schéma + helpers + tests) puis T-A2 (fiches réelles). Le schéma est repris **verbatim** de la spec de design §3.2 — pas de champ `draft` pour les projets. |
| R2 | `/projets` rend une grille de cartes (titre, desc, statut, stack) — la page rend ≥ 2 cartes affichant ces 4 champs | Pending | T-B1. Carte = **variante** de `ArticleCard.astro` (spec §6.2), pas un nouveau design system. |
| R3 | Filtre par statut et par stack — choisir un statut → **seules** les fiches de ce statut restent visibles (idem pour une techno) | Pending | T-B2. JS vanilla progressif (spec §6.1), aucun framework. Prédicat pur testé unitairement + vérification par comptage dans le navigateur. |
| R4 | `/projets/<slug>` rend la fiche (corps + repo + démo) — corps rendu **ET** liens `repoUrl`/`demoUrl` présents quand définis | Pending | T-B3. |
| R5 | Relation bidirectionnelle `blog ↔ projects` résolue — liens cliquables, **aucun `undefined`** | Pending | Trois tâches : T-A2 (données des deux côtés), T-B3 (projet → articles), T-B4 (article → projets). `relatedProjects` existe déjà dans le schéma blog depuis le Plan 1 (`src/content.config.ts:20`) mais n'a jamais été rendu. |
| R6 | Projets éditables via le CMS — collection ajoutée au `config.yml` → créer un projet via `/admin` produit un fichier conforme au schéma | Pending | T-C1 (config + garde-fou de test) puis **T-C2, geste utilisateur** : un agent ne peut ni fournir le PAT ni actionner le sélecteur de dossier natif (établi au Plan 2). |
| R7 | Cartes/fiches en direction dark editorial-dev, responsive 375px — visuel cohérent avec le blog **ET** pas de scroll horizontal à 375px | Pending | Contrôle 375px + dark/light dans T-B1, T-B2, T-B3 et T-B4 (pas de tâche dédiée : chaque tâche livrant du gabarit le vérifie). |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers |
|---|---|---|
| A1 | A | R1 (collection `projects`, schéma Zod, helpers d'ordre + tests) |
| A2 | A | R1 (≥ 2 fiches réelles), R5 (données des deux sens) |
| B1 | B | R2 (grille + carte), R7 |
| B2 | B | R3 (filtre statut/stack), R7 |
| B3 | B | R4 (fiche + repo/démo), R5 (projet → articles), R7 |
| B4 | B | R5 (article → projets), R7 · **+ addition n°1** (lien de nav « Projets ») |
| C1 | C | R6 (collection CMS + garde-fou de test) · **+ addition n°2** (`relatedProjects` mappé côté blog) |
| C2 | C | R6 (création réelle via `/admin` — **action utilisateur**) |
| Z1 | Z | Audit `/anti-drift-planning:verify 3` (couverture R1–R7) |

## Additions au-delà de la lettre de la spec (à ratifier au gate de pré-flight)

Aucune n'est exigée par un critère R. Elles sont listées ici pour être approuvées ou coupées **explicitement**, jamais glissées en silence.

1. **Lien de nav « Projets » activé** (T-B4) — `src/components/Header.astro` le rend aujourd'hui non cliquable. Sans cette activation, `/projets` n'est atteignable qu'en tapant l'URL.
2. **`relatedProjects` mappé dans la collection `blog` du CMS** (T-C1) — champ explicitement différé par le Plan 2 (« collection `projects` = Plan 3 », omission approuvée). Sans lui, le sens article → projets reste éditable uniquement à la main.

## Updates log

(Append a one-liner each time the ledger is updated, with the new status and the commit SHA.)

- 2026-07-31 — **Ledger seeded (pré-flight)** — 7 lignes `Pending`. Branche `plan-3-vitrine-projets` créée depuis `main` (`9793f6b`, Plan 2 vérifié PASS). Plan d'implémentation écrit (`docs/anti-drift/plans/2026-07-19-plan-3-vitrine-projets.md`), log de déviations créé. **En attente de validation utilisateur avant T-A1**, avec deux questions ouvertes : les données réelles des ≥ 2 fiches projets (que le plan ne peut pas inventer) et les deux additions ci-dessus.
- 2026-07-31 — **GATE DE PRÉ-FLIGHT — plan validé par l'utilisateur.** Réponses explicites transcrites : (1) « Validé, démarre T-A1 » ; (2) **addition n°1 approuvée** — le lien de nav « Projets » sera activé en T-B4 ; (3) **addition n°2 approuvée** — `relatedProjects` sera mappé dans la collection `blog` du CMS en T-C1 ; (4) fiches retenues pour T-A2 : **`bendevcat.github.io`** (ce site) et **`awesome-french-tech-rss-feeds`**. Les deux additions étant ratifiées **avant** exécution, ce ne sont pas des déviations.
- 2026-07-31 — T-A1 (collection `projects` + schéma Zod + helpers d'ordre + tests) → **In progress** — R1 In progress.
- 2026-07-31 — T-A1 → **Done** — commit `d3978aa`. `src/content.config.ts` gagne `PROJECT_STATUSES` et la collection `projects` (schéma **verbatim** de la spec de design §3.2, sans champ `draft`) ; `src/lib/projects.ts` (`sortProjects`, `collectStacks`, `getSortedProjects`) ; `src/lib/projects.test.ts` (7 tests). **Vérifié indépendamment par le contrôleur** : `vitest` **22/22** (15 préexistants + 7), `astro check` **0 error / 0 warning** (30 hints, contre 14 au Plan 2 — hints uniquement, aucun n'est bloquant), `astro build` **8 pages**. **Revue de tâche : spec ✅ / qualité Approved**, 0 Critical, 0 Important, **1 Minor déféré** (le commentaire JSDoc de `sortProjects` affirme que `localeCompare('fr')` « ignore casse et accents » — le relecteur a vérifié en Node que c'est faux : ce sont des critères de départage secondaires. Sans conséquence fonctionnelle ; à corriger au passage d'une tâche ultérieure ou à la revue finale). Le relecteur a confronté le schéma à la **spec de design elle-même**, pas au brief. **R1 reste In progress** : sa clause « ≥ 2 fiches réelles chargées » exige T-A2. Constat honnête reporté par l'implémenteur : le build émet `[WARN] [glob-loader] No files found matching …` tant que la collection est vide — attendu, disparaît en T-A2.
- 2026-07-31 — **Plan amendé AVANT exécution de T-A2** (donc pas une déviation — précédent Plan 2, version du CDN Sveltia amendée au gate). Le gabarit à trous de T-A2 est remplacé par les **deux fiches exactes**, chaque valeur étant un fait vérifié : (1) `site-bencat` — ce dépôt, `created_at` 2026-07-30, stack lue dans `package.json`, `https://bendevcat.github.io/` répond 200 (Plan 2), statut `wip` et article lié « Bienvenue dans mon foutoir ! » **choisis par l'utilisateur** ; (2) `resumexyz` — API GitHub : créé le 2017-02-01, dernier push 2017-02-05, stack HTML/CSS/PHP/JavaScript **citée par son propre README**, statut `archivé`. **Aucun `demoUrl` pour `resumexyz` : `benoitcatillon.xyz` ne résout plus** (vérifié, pas de réponse DNS) — mettre le lien aurait été un lien mort. Le 2ᵉ choix de l'utilisateur pour cette fiche est `resumexyz`, en remplacement de `awesome-french-tech-rss-feeds`, dont le dépôt s'est révélé **vide** (README de 31 octets contenant le seul titre) : rédiger une fiche dessus aurait exigé d'inventer.
- 2026-07-31 — T-A2 (≥ 2 fiches réelles + relations bidirectionnelles) → **In progress** — R1 et R5 In progress.
- 2026-07-31 — **CORRECTION de l'entrée ci-dessous (écrite dans `1625b29`), qui était FAUSSE.** Elle affirmait « T-A2 bloquée, **rien de commité** » et « la fiche `site-bencat` n'est pas créée non plus ». **Faits établis sur `git log` :** le subagent T-A2 avait **déjà commité `7edc67e`** — `src/content/projects/site-bencat/index.md`, `src/content/projects/resumexyz/index.md` et la ligne `relatedProjects: [site-bencat]` sur l'article « Bienvenue dans mon foutoir ! » — **avant** que l'interruption de l'utilisateur ne prenne effet. `7edc67e` est le **parent direct** de `1625b29`, le commit qui affirmait le contraire. L'erreur a été **relevée par le relecteur de T-C1**, qui l'a établie sur `git log` / `git show` / `git merge-base`, et non sur mes affirmations — c'est le contrôleur qui a écrit un état non vérifié. **Cause :** j'ai décrit l'arbre de mémoire au lieu de lire `git log` après une interruption. **Règle pour la suite du plan : lire `git log` avant d'écrire dans le ledger ce que le dépôt contient — une interruption arrête le dialogue, pas le travail déjà commité.** D01 a été corrigée en conséquence.
- 2026-07-31 — **État réel de T-A2 : partiellement livrée** (`7edc67e`). Livré et conservé : la fiche `site-bencat` (faits vérifiés : dépôt créé le 2026-07-30, stack lue dans `package.json`, `https://bendevcat.github.io/` en 200) **et la relation bidirectionnelle** (`relatedPosts: [bienvenue-dans-mon-foutoir]` côté projet, `relatedProjects: [site-bencat]` côté article). Retiré sur décision explicite de l'utilisateur : la fiche `resumexyz` (**déviation D02**, loggée avant exécution). **Il manque donc la 2ᵉ fiche réelle** exigée par R1 (« ≥ 2 fiches réelles chargées ») : elle viendra d'un projet que l'utilisateur doit d'abord publier. **R1 et R5 restent In progress ; T-B1 → T-B4 restent bloquées** (leurs critères exigent ≥ 2 cartes rendues).
- 2026-07-31 — ~~**T-A2 BLOQUÉE côté utilisateur, rien de commité.**~~ *(entrée fausse, conservée pour la traçabilité — voir la correction ci-dessus)* L'utilisateur retire `resumexyz` du périmètre : « je vais voir pour push quelques projets locaux pour avoir de vrais exemples ». La 2ᵉ fiche exigée par R1 dépend donc d'un push que seul lui peut faire. **La fiche `site-bencat` n'est pas créée non plus** : T-A2 livre les deux fiches et la relation d'un seul tenant, la découper serait un second écart pour rien. **T-B1 → T-B4 sont bloquées avec elle** (leurs critères se vérifient sur des cartes et des fiches rendues). **Déviation D01 loggée** (`pending-user`, réversibilité `cheap`) avant exécution : T-C1 passe devant, c'est la seule tâche du plan indépendante de tout contenu. L'amendement du plan pour `resumexyz` (commit `3b52fa0`) devient caduc et sera réécrit avec les vrais projets avant que T-A2 reprenne.
- 2026-07-31 — T-C1 (collection `projects` dans le `config.yml` Sveltia + garde-fou de test) → **In progress** — R6 In progress.
- 2026-07-31 — **Constat de pré-flight, hors périmètre du Plan 3** : le tag `milestone-plan-2` et la version `v0.2.0` **n'existent pas** (`git tag -l` → `milestone-plan-1`, `plan-2-b2-evidence`, `v0.1.0`). La Phase Z du Plan 2 a bien rendu un verdict PASS (`9793f6b`), mais le ship — script de release + tag — était noté comme une action utilisateur distincte de l'audit et n'a pas été faite. La spec du Plan 3 dit « off `main` @ `milestone-plan-2` » : la branche part donc du commit **que ce tag devrait désigner**. Aucun impact sur l'exécution du Plan 3 ; à trancher par l'utilisateur (poser le tag rétroactivement ou l'assumer manquant).
