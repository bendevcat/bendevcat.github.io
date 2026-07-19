# Site perso benCat — Plan 5 — Recherche & pages transverses · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** Plan 4 (`milestone-plan-4`)
**Target:** `v1.0.0` + `milestone-plan-5` *(lancement)*
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md`
**Design de référence:** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

---

## 1. Goal (incl. user story)

À la fin de ce plan (**site v1 complet**), **sans aide** :

1. Un visiteur appuie **⌘K** (ou clique 🔍) → recherche instantanée **sur tout le site** (Pagefind) ; les résultats couvrent blog + projets + prompts + skills et mènent à la page.
2. Il ouvre `/tags` → index de **tous les tags** ; `/tags/<tag>` **agrège** les entrées des 4 collections portant ce tag.
3. Sur `/blog`, les puces **catégorie et tag deviennent cliquables** → vue filtrée.
4. Il lit `/a-propos` (bio, parcours, le pourquoi) et `/transparence-ia` (explication des 3 niveaux de bannière).
5. Une URL inexistante affiche une **`/404` custom** stylée.

**C'est le dernier plan** : tout élément non couvert ici ouvrirait un nouveau cycle (voir §5).

## 2. Pain themes addressed

1. **Trouvabilité** — sans recherche ni tags transverses, le contenu accumulé devient inaccessible.
2. **Boucler l'identité** — `/a-propos` et `/transparence-ia` matérialisent le positionnement et la valeur distinctive.

## 3. Success criteria

| ID | Criterion | Measure (binary) |
|---|---|---|
| R1 | Recherche Pagefind sur tout le site via ⌘K | ⌘K ouvre la recherche **ET** taper un terme renvoie des résultats issus des **4** collections **ET** cliquer mène à la bonne page |
| R2 | `/tags` liste tous les tags utilisés | La page liste chaque tag présent dans ≥ 1 collection (avec son compte) |
| R3 | `/tags/<tag>` agrège cross-collection | Ouvrir un tag partagé → entrées **blog + projets + prompts + skills** listées ensemble |
| R4 | Filtres catégorie/tag actifs sur `/blog` | Cliquer une puce catégorie ou tag → `/blog` affiche **uniquement** les articles correspondants |
| R5 | `/a-propos` rendu | La page affiche la bio (contenu réel fourni) |
| R6 | `/transparence-ia` explique les 3 niveaux | La page décrit `none` / `partial` / `full` **ET** leur signalétique (couleurs des bannières) |
| R7 | `/404` custom | Naviguer vers une URL inexistante → page 404 stylée (pas la 404 par défaut) |
| R8 | Index Pagefind généré au build **et** déployé | `astro build` produit l'index Pagefind **ET** il est servi en prod (recherche fonctionne sur github.io) |

## 4. Work breakdown (phases & tasks)

### Phase A — Recherche
Intégrer **Pagefind** (post-build), composant de recherche ⌘K (JS vanilla, modal), indexation des 4 collections. → R1, R8.

### Phase B — Tags cross-collection
`/tags` (index), `/tags/[tag]` (agrégation via `getCollection` sur les 4 collections), rendre **cliquables** les puces catégorie/tag du blog. → R2, R3, R4.

### Phase C — Pages éditoriales
`/a-propos`, `/transparence-ia`, `/404`. → R5, R6, R7.

### Phase Z — Verification
- **T** `/anti-drift-planning:verify 5` — audit canonique. Non contournable. Seul chemin vers ship + tag `milestone-plan-5` = **`v1.0.0`**.

## 5. Out of scope (nouveau cycle si souhaité plus tard)

- **Domaine custom** (`public/CNAME` + DNS) — critère différé depuis le Plan 1 ; à brancher quand le domaine est prêt (fast-follow, peut être fait à tout moment).
- **Page Stats / dashboard**, **îlots React/Preact**, **élargissement `skills` hors Claude Code**, **collection `tags` typée** — tous listés « plus tard » dans la spec de design.

## 6. Out-of-band considerations

### 6.1 Ordre de build Pagefind
Pagefind indexe le HTML **après** `astro build` → l'ajouter au script de build / à l'étape CI avant le déploiement.

### 6.2 Sans framework
Modal de recherche + filtres = JS vanilla (réutilise l'UI de recherche de l'ancien thème comme référence).

### 6.3 Domaine custom (rappel)
Quand le domaine est prêt : ajouter `public/CNAME`, mettre `site` au domaine, configurer DNS + « Enforce HTTPS ». `base` reste `/` (user-site) → bascule sans refonte.

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | ⌘K ouvre la recherche · résultats des 4 collections · index généré au build |
| B | `/tags` complet · `/tags/[tag]` agrège · puces cliquables filtrent `/blog` |
| C | `/a-propos`, `/transparence-ia`, `/404` rendus |
| Z | `/anti-drift-planning:verify 5` + walkthrough humain → **v1.0.0** |

## 8. Plan self-review

1. **Spec coverage** — R1→A · R2→B · R3→B · R4→B · R5→C · R6→C · R7→C · R8→A. ✅
2. **Internal consistency** — agrégation tags via `getCollection` sur les 4 collections des Plans 1/3/4 ; recherche indexe le HTML des mêmes pages.
3. **Scope check** — recherche + tags + 3 pages ; dépend des 4 collections existantes (d'où le placement en dernier).
4. **Ambiguity check** — « tout le site » = 4 collections ; domaine custom explicitement hors de ce plan (§5).

---

**Branch:** `plan-5-recherche-et-pages` (off `main` @ `milestone-plan-4`)
**Ledger:** `docs/anti-drift/handoffs/plan-5-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-5-deviations.md`
