# Plan 5 — Scope Ledger

Last updated: 2026-09-04 (pré-flight)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Recherche Pagefind sur tout le site via ⌘K — ⌘K ouvre la recherche **ET** taper un terme renvoie des résultats issus des **4** collections **ET** cliquer mène à la bonne page | Pending | T-A1 (index) puis T-A2 (modal). Terme de preuve : `git`, présent dans les 4 collections (mesuré sur les sources : blog 5, projets 2, prompts 2, skills 2). Les 3 clauses se vérifient séparément — le clic sur **chacun** des 4 groupes, pas sur un seul. |
| R2 | `/tags` liste tous les tags utilisés — chaque tag présent dans ≥ 1 collection, avec son compte | Pending | T-B1. Vérification **par comptage** des liens rendus, pas à l'œil. Clé = slug (`Sécurité` et `securite` = une seule page) ; libellé = première graphie rencontrée. |
| R3 | `/tags/<tag>` agrège cross-collection — un tag partagé liste les entrées **blog + projets + prompts + skills** ensemble | Pending | T-B2. **Réserve de données connue au pré-flight : aucun tag du contenu réel ne couvre les 4 collections** (`devops` → blog+projets ; `anti-drift`/`claude-code`/`methodologie` → prompts+skills). Question posée à l'utilisateur au gate — voir §Questions ouvertes. Ne pas passer `Done` sur une lecture affaiblie du critère. |
| R4 | Filtres catégorie/tag actifs sur `/blog` — cliquer une puce → **uniquement** les articles correspondants | Pending | T-B3. Barre de puces catégorie + tag **et** puce de carte cliquable (lien étiré). Vérification **par comptage dans les deux sens** (filtrer puis « toutes »). Non-régression home à contrôler : `ArticleCard` y est aussi utilisée. |
| R5 | `/a-propos` rendu — la page affiche la bio (**contenu réel fourni**) | Pending | T-C2. **Dépend d'un contenu fourni par l'utilisateur** (bio, parcours, le pourquoi). Aucune bio inventée : cela publierait des affirmations fausses sur une personne réelle tout en passant le critère en apparence. |
| R6 | `/transparence-ia` explique les 3 niveaux — `none`/`partial`/`full` **ET** leur signalétique (couleurs des bannières) | Pending | T-C1. La page **rend les 3 bannières réelles** via `AiBanner`, source unique `AI_USAGE_META` : la couleur montrée ne peut pas diverger de l'explication. |
| R7 | `/404` custom — une URL inexistante affiche une 404 stylée | Pending | T-C3. `dist/404.html` servi automatiquement par GitHub Pages et `astro preview`. Consigner le **code HTTP** observé (404, pas 200). |
| R8 | Index Pagefind généré au build **ET** déployé — `astro build` produit l'index **ET** la recherche fonctionne sur github.io | Pending | T-A1 (moitié build, prouvée localement + test de garde sur `package.json`) et **T-D1 (moitié prod, action utilisateur)**. La moitié prod exige un push sur `main`, qui publierait les Plans 2→5 d'un coup — voir §Questions ouvertes. |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers | Status |
|---|---|---|---|
| A1 | A | R8 (moitié build : dépendance, script, portée de l'index, test de garde), R1 (index disponible) | Pending |
| A2 | A | R1 (modal ⌘K, groupement par collection, clic → page) | Pending |
| B1 | B | R2 (`src/lib/tags.ts` + `/tags`) | Pending |
| B2 | B | R3 (`/tags/<tag>` agrégation) | Pending |
| B3 | B | R4 (barre de puces + puce de carte) · **+ addition n°3** (lien vers `/tags`) · **+ addition n°4** (puce de carte cliquable) | Pending |
| C1 | C | R6 (`/transparence-ia`) · **+ addition n°2** (lien depuis `AiBanner`) | Pending |
| C2 | C | R5 (`/a-propos`) · **+ addition n°1** (nav « À propos » activée) — **dépend d'un contenu utilisateur** | Pending |
| C3 | C | R7 (`/404`) | Pending |
| D1 | D | R8 (moitié prod — **action utilisateur**) | Pending |
| Z1 | Z | Audit `/anti-drift-planning:verify 5` (couverture R1–R8) | Pending |

## Additions au-delà de la lettre de la spec (à ratifier au gate de pré-flight)

Aucune n'est exigée par un critère R. Listées ici pour être approuvées ou coupées **explicitement**, jamais glissées en silence.

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

## Questions ouvertes — posées à l'utilisateur au gate de pré-flight

1. **R3 et les données** — aucun tag du contenu réel ne couvre les 4 collections. Le code d'agrégation peut être juste sans que le critère soit démontrable. Arbitrage attendu : ajouter des tags à du contenu réel pour créer un tag transverse, ou autre chose.
2. **R5 et le contenu** — la bio de `/a-propos` doit être **fournie** ; elle ne sera pas inventée.
3. **R8 et la publication** — la moitié « servi en prod » exige un push sur `main`, qui publierait les Plans 2, 3, 4 et 5 d'un coup (`origin/main` est resté à la fin du Plan 1). S'y ajoute une question d'ordre : la Phase Z exige tous les critères `Done`, or cette moitié de R8 ne peut être mesurée qu'après déploiement.

## Updates log

- **2026-09-04 — pré-flight.** Branche `plan-5-recherche-et-pages` créée depuis `plan-4-librairies-prompts-skills` (base vérifiée : elle porte bien la spec du Plan 5, et son arbre est identique à `main` — même `tree 80fcc88`). Plan d'implémentation écrit depuis la spec et l'état réel du dépôt. Ledger et journal de déviations créés. Base mesurée : `vitest` **93/93 (9 fichiers)** · `astro check` **0 error / 0 warning** · `astro build` **18 pages**. Aucune tâche démarrée : le plan attend la validation de l'utilisateur.
