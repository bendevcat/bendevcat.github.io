# Plan 5 — Scope Ledger

Last updated: 2026-09-04 (pré-flight)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Recherche Pagefind sur tout le site via ⌘K — ⌘K ouvre la recherche **ET** taper un terme renvoie des résultats issus des **4** collections **ET** cliquer mène à la bonne page | **Done** — `faa1d0f` | T-A1 (index) puis T-A2 (modal). Terme de preuve : `git`, présent dans les 4 collections (mesuré sur les sources : blog 5, projets 2, prompts 2, skills 2). Les 3 clauses se vérifient séparément — le clic sur **chacun** des 4 groupes, pas sur un seul. |
| R2 | `/tags` liste tous les tags utilisés — chaque tag présent dans ≥ 1 collection, avec son compte | In progress | T-B1. Vérification **par comptage** des liens rendus, pas à l'œil. Clé = slug (`Sécurité` et `securite` = une seule page) ; libellé = première graphie rencontrée. |
| R3 | `/tags/<tag>` agrège cross-collection — un tag partagé liste les entrées **blog + projets + prompts + skills** ensemble | Pending | T-B2, précédée du retag décidé au gate. **Réserve de données levée** : l'utilisateur a choisi d'ajouter `claude-code` là où c'est factuellement vrai, et la 4ᵉ patte (blog) existe — `bienvenue-dans-mon-foutoir` écrit lui-même « ce blog a été créé from-scratch avec Claude Code sur Sonnet 4.5 » (`src/content/blog/bienvenue-dans-mon-foutoir/index.md:50`) et n'a aujourd'hui aucun tag. Cible : blog `bienvenue-dans-mon-foutoir` · projets `site-bencat` · prompts (2, déjà tagués) · skills `anti-drift-planning` (déjà) + `superpowers`. |
| R4 | Filtres catégorie/tag actifs sur `/blog` — cliquer une puce → **uniquement** les articles correspondants | Pending | T-B3. Barre de puces catégorie + tag **et** puce de carte cliquable (lien étiré). Vérification **par comptage dans les deux sens** (filtrer puis « toutes »). Non-régression home à contrôler : `ArticleCard` y est aussi utilisée. |
| R5 | `/a-propos` rendu — la page affiche la bio (**contenu réel fourni**) | Pending | T-C2. **Arbitrage du gate : la page est composée à partir des textes que l'utilisateur a déjà écrits lui-même** — l'article `bienvenue-dans-mon-foutoir` (parcours, le pourquoi du blog) et `src/components/Hero.astro` (identité). **Zéro phrase inventée** ; relecture de l'utilisateur avant le commit. |
| R6 | `/transparence-ia` explique les 3 niveaux — `none`/`partial`/`full` **ET** leur signalétique (couleurs des bannières) | Pending | T-C1. La page **rend les 3 bannières réelles** via `AiBanner`, source unique `AI_USAGE_META` : la couleur montrée ne peut pas diverger de l'explication. |
| R7 | `/404` custom — une URL inexistante affiche une 404 stylée | Pending | T-C3. `dist/404.html` servi automatiquement par GitHub Pages et `astro preview`. Consigner le **code HTTP** observé (404, pas 200). |
| R8 | Index Pagefind généré au build **ET** déployé — `astro build` produit l'index **ET** la recherche fonctionne sur github.io | In progress | T-A1 (moitié build, prouvée localement + test de garde sur `package.json`) et **T-D1 (moitié prod, action utilisateur)**. **Arbitrage du gate : la question de publication est reportée à la fin du plan.** Tout est livré et prouvé localement (`astro preview` sert le vrai build) ; R8 restera `In progress` jusqu'à la décision de publier, et la question sera reposée avec l'état exact au moment de la Phase Z. |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers | Status |
|---|---|---|---|
| A1 | A | R8 (moitié build : dépendance, script, portée de l'index, test de garde), R1 (index disponible) | **Done** — `199adf4` |
| A2 | A | R1 (modal ⌘K, groupement par collection, clic → page) | **Done** — `faa1d0f` |
| B1 | B | R2 (`src/lib/tags.ts` + `/tags`) | In progress |
| B2 | B | R3 (`/tags/<tag>` agrégation) | Pending |
| B3 | B | R4 (barre de puces + puce de carte) · **+ addition n°3** (lien vers `/tags`) · **+ addition n°4** (puce de carte cliquable) | Pending |
| C1 | C | R6 (`/transparence-ia`) · **+ addition n°2** (lien depuis `AiBanner`) | Pending |
| C2 | C | R5 (`/a-propos`) · **+ addition n°1** (nav « À propos » activée) — **dépend d'un contenu utilisateur** | Pending |
| C3 | C | R7 (`/404`) | Pending |
| D1 | D | R8 (moitié prod — **action utilisateur**) | Pending |
| Z1 | Z | Audit `/anti-drift-planning:verify 5` (couverture R1–R8) | Pending |

## Additions au-delà de la lettre de la spec — **ratifiées au gate de pré-flight (2026-09-04)**

Aucune n'est exigée par un critère R. **Les 4 sont approuvées** par l'utilisateur au gate, option « J'approuve les 4 additions ».

1. **Lien de nav « À propos » activé** (T-C2) — `src/components/Header.astro:17` le rend aujourd'hui non cliquable (« Bientôt disponible »). Sans cela, `/a-propos` n'est atteignable qu'en tapant l'URL. Même addition, même justification qu'aux Plans 3 (« Projets ») et 4 (« Prompts »/« Skills »).
2. **Lien « en savoir plus » de `AiBanner` vers `/transparence-ia`** (T-C1) — R6 exige que la page explique, pas qu'on y accède. Sans ce lien, la page n'est atteignable depuis **aucune** surface : elle n'est pas dans la nav (design §4).
3. **Lien « tous les tags » de `/blog` vers `/tags`** (T-B3) — même raison : `/tags` n'est dans aucune nav.
4. **Puce catégorie de `ArticleCard` rendue cliquable** (T-B3) — la carte passe en `<article class="relative">` avec un **lien étiré** sur le titre et la puce en `<button>` au-dessus. La carte reste cliquable **en entier** ; ce qui change est qu'un clic **sur la puce** filtre au lieu d'ouvrir l'article. Touche une carte livrée au Plan 1 et utilisée aussi sur la home.

## Décisions d'implémentation tranchées par le plan (spec muette — ratification au gate)

- **Lecture de R4** : le critère s'intitule « filtres catégorie/tag actifs sur `/blog` », la user story dit « les puces … deviennent cliquables ». Le plan satisfait les deux : barre de puces catégorie + tag **et** puce de carte cliquable. Les tags **ne sont pas** ajoutés aux cartes (cela redessinerait une carte livrée au Plan 1 sans qu'un critère l'exige).
- **Portée de l'index Pagefind** : seules les pages de détail des 4 collections portent `data-pagefind-body` → **13 pages indexées sur 18 buildées**. Conséquence assumée : `/a-propos`, `/transparence-ia`, les index et `/tags` ne remontent pas dans la recherche.
- **Collection déduite de l'URL** (`src/lib/search.ts`) plutôt que d'un `data-pagefind-meta` : règle pure, testable sans build, un seul endroit à corriger.
- **Normalisation des tags** : slug = minuscules, sans accents, non-alphanumériques → tirets. Libellé affiché = première graphie rencontrée (ordre blog → projets → prompts → skills), donc build reproductible.
- **Ordres** : `/tags` par compte décroissant puis libellé A→Z ; entrées d'un tag groupées par collection, chaque groupe conservant l'ordre canonique de sa collection (composition des helpers testés, jamais de re-tri à la main).
- **Moteur de filtrage non modifié** : `facetFilters.ts` et `facet-filters.ts` (Plan 4, livrés et vérifiés) restent intacts ; les puces de carte sont relayées vers la barre par un script séparé (`src/scripts/blog-filters.ts`).
- **Dégradation en dev** : `dist/pagefind/` n'existe pas sous `astro dev` → le modal s'ouvre et affiche « index indisponible — lancez `npm run build` », au lieu d'échouer en silence.
- **Pas de `public/CNAME`, pas de changement de `site` ni de `base`** : le domaine custom est explicitement hors périmètre (spec §5).
- **`.github/workflows/deploy.yml` non modifié** : `withastro/action@v3` lance `npm run build` par défaut (vérifié dans `action.yml` de l'action : `"${{ inputs.build-cmd || '$PACKAGE_MANAGER run build' }}"`), donc enchaîner Pagefind dans le script suffit pour que la CI produise l'index.

## Décisions rendues au gate de pré-flight (2026-09-04)

Les quatre questions ouvertes du pré-flight ont été tranchées par l'utilisateur avant la première tâche.

1. **Additions n°1 à n°4 : approuvées.** Option choisie : « J'approuve les 4 additions ».
2. **R3 — tag transverse : « J'ajoute `claude-code` où c'est vrai ».** L'option présentée annonçait 3 collections sur 4, le blog restant découvert. **Constat postérieur à la décision, qui la renforce** : `src/content/blog/bienvenue-dans-mon-foutoir/index.md:50` contient la phrase de l'utilisateur « ce blog a été créé from-scratch avec Claude Code sur Sonnet 4.5 », et cet article n'a aucun tag. Le taguer `claude-code` est donc factuellement vrai et sourcé — **les 4 collections sont couvertes** et R3 devient pleinement démontrable. Aucune étiquette n'est posée là où elle serait fausse.
3. **R5 — bio : « Compose depuis mes textes existants ».** Sources autorisées : l'article `bienvenue-dans-mon-foutoir` et `src/components/Hero.astro`. Relecture de l'utilisateur avant le commit de T-C2.
4. **R8 — publication : « On en reparle à la fin ».** Rien n'est poussé. La question sera reposée avec l'état exact au moment de la Phase Z.

## Updates log

- **2026-09-04 — pré-flight.** Branche `plan-5-recherche-et-pages` créée depuis `plan-4-librairies-prompts-skills` (base vérifiée : elle porte bien la spec du Plan 5, et son arbre est identique à `main` — même `tree 80fcc88`). Plan d'implémentation écrit depuis la spec et l'état réel du dépôt. Ledger et journal de déviations créés. Base mesurée : `vitest` **93/93 (9 fichiers)** · `astro check` **0 error / 0 warning** · `astro build` **18 pages**. Aucune tâche démarrée : le plan attend la validation de l'utilisateur.
- **2026-09-04 — gate de pré-flight.** Les 4 décisions ci-dessus rendues par l'utilisateur. Les 4 additions sont `approved`. Aucune déviation ouverte. Exécution autorisée à partir de T-A1.
- **2026-09-04 — T-A1 démarrée.** `plan defect: 7 erreurs du texte du plan (comptes de tests périmés en A2/B1/B2, renvoi vers un Step inexistant en B2, intervalle de diacritiques en caractères combinants littéraux en B1, vérification appuyée sur un nom de fichier interne de Pagefind en A1) — corrigées dans ad2cd1e`. Scan de pré-vol complet consigné dans `.superpowers/sdd/2026-07-19-plan-5-recherche-et-pages/progress.md`.
- **2026-09-04 — T-A1 Done (`199adf4`).** Revue de tâche : spec ✅, qualité approuvée, 0 `Critical`, 0 `Important`. Mesures **revérifiées par le contrôleur, pas seulement rapportées** : `vitest` 96/96 (10 fichiers) · `astro check` 0 error / 0 warning / 66 hints · `npm run build` → 18 pages puis **Indexed 13 pages, 3756 mots** — exactement les 6 blog + 2 projets + 3 prompts + 2 skills attendus. Le garde-fou de `package.json` a été prouvé mordant (script saboté → 2 échecs ; restauré → 3 passent). **Moitié « build » de R8 établie** ; la moitié « en prod » reste ouverte (T-D1, décision reportée à la fin par l'utilisateur). `plan defect: le brief annonçait 4 balises racines différentes pour les gabarits de détail, alors que les 4 partagent `<article class="mx-auto max-w-3xl px-4 py-10"> — corrigé dans le plan`. Un `Minor` reporté : 4 vulnérabilités npm, **antérieures à ce plan** (arbre de dépendances d'Astro : `postcss`, `nanoid`), à trier à la revue finale.
- **2026-09-04 — T-A2 démarrée.**
- **2026-09-04 — T-A2 Done (`faa1d0f`), R1 établie.** Revue de tâche : conformité ✅, qualité approuvée. **Le smoke navigateur du contrôleur a trouvé un Critical que ni l'implémenteur ni la revue n'avaient vu** : l'import dynamique de Pagefind était inopérant en production. Vite inline `import.meta.env.BASE_URL` à la compilation, le spécificateur redevient une constante, `/* @vite-ignore */` ne protège rien, et le placeholder `__VITE_PRELOAD__` reste non remplacé — le référencer lève une `ReferenceError` avalée par le `catch`, si bien que le message de dégradation « dev » s'affichait **en production**. `plan defect: la parade prescrite au piège n°1 du Step 6 n'atteint pas son objectif — remplacée par un import hors graphe de modules (new Function) et texte du plan corrigé dans le même commit`. Passe de correction round 1/5 : 4 constats (1 Critical + 3 Important), **tous adressés**, aucune casse introduite (re-revue ciblée). Contrôle de non-régression : `grep -c '__VITE_PRELOAD__' dist/index.html` → **0**.
  **Preuve de R1, mesurée sur `astro preview`** : ⌘K **et** Ctrl+K ouvrent le modal avec le focus dans le champ · `git` renvoie **4 groupes / 9 résultats** — Articles (4), Projets (2), Prompts (2), Skills (1) · **les 4 groupes** mènent à la bonne page, le `h1` d'arrivée étant à chaque fois identique au titre affiché dans le résultat.
  **Constat mesuré, remonté sans action** : la bannière `AiBanner` étant rendue sous le titre, ~90 caractères identiques polluent l'extrait de recherche de **chaque** article (« ✍️ 100% humain. Cet article est rédigé intégralement par un humain… ») ; la TOC duplique les titres. R1 reste satisfait tel qu'écrit — décision portée à la Phase Z.
- **2026-09-04 — T-B1 démarrée.**
