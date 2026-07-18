# Site perso benCat — Plan 1 — Socle blog déployé (walking skeleton) · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** — (premier plan ; base = bootstrap `e5904eb`)
**Target:** `v0.1.0` + `milestone-plan-1`
**Methodology:** `docs/anti-drift/specs/2026-07-19-methodology.md`
**Design de référence:** `docs/anti-drift/specs/2026-07-19-site-perso-design.md`

---

## 1. Goal (incl. user story)

À la fin de ce plan, **sans aide** :

1. Un visiteur ouvre `https://bendevcat.github.io` et voit la **home** : un hero (identité pro+perso) + une grille des articles récents (cartes : titre, date, catégorie, description).
2. Il clique un article et le **lit en entier** sur `/blog/<slug>` : rendu Markdown, **sommaire (TOC)** généré depuis les H2/H3, **blocs de code** stylés avec **bouton copier**, et **bannière de transparence IA** affichée quand le champ `aiUsage` est défini.
3. Il bascule **clair/sombre** via un toggle ; la préférence **persiste au reload** (localStorage) et suit `prefers-color-scheme` au premier chargement.
4. Il parcourt `/blog` qui liste **tous les articles publiés** (migrés depuis l'ancien site Hugo), triés du plus récent au plus ancien.
5. Il s'abonne au **flux RSS** (`/rss.xml`).
6. (Côté build) Benoît **pousse sur `main`** → GitHub Actions build et redéploie automatiquement le site.

**Aucune autre fonctionnalité n'est livrée dans ce plan** : pas de CMS (Plan 2), pas de projets/prompts/skills (Plans 3–4), pas de recherche / pages de tags cross-collection / filtres catégorie-tag / `/a-propos` / `/transparence-ia` (Plan 5), pas de domaine custom (critère différé, cf. §5).

## 2. Pain themes addressed

1. **Remplacement d'un site vivant** — le nouveau site doit être *réellement en ligne avec le vrai contenu*, pas une démo vide ; d'où la migration de tous les articles publiés dès le Plan 1.
2. **Dé-risquer tôt le pari « statique sur GitHub Pages »** — prouver le chemin `build → GitHub Actions → Pages` dès le premier plan, avant d'empiler des fonctionnalités.
3. **Design system fondateur** — poser les tokens couleur (clair+sombre) et la typo (Space Grotesk / Inter / JetBrains Mono) dont **tous** les plans suivants héritent, pour éviter un reskin tardif.

## 3. Success criteria

| ID | Criterion | Measure (binary pass/fail) |
|---|---|---|
| R1 | Un push sur `main` déclenche le workflow GitHub Actions (`withastro/action`) qui build et déploie le site | Le run Actions finit au vert **ET** `curl -sI https://bendevcat.github.io` renvoie `200` avec du HTML |
| R2 | La home `/` affiche un hero + une grille d'articles récents | La page rend le hero **ET** ≥ 3 cartes d'articles réels (titre, date, catégorie, description) |
| R3 | Un article `/blog/<slug>` rend le contenu complet avec TOC (H2/H3), blocs de code à bouton copier, et bannière IA conditionnelle | Ouvrir un article migré : TOC listant les H2/H3 présents **ET** clic « copier » d'un bloc de code met le contenu au presse-papier **ET** bannière visible si `aiUsage` défini / absente sinon |
| R4 | `/blog` liste **tous** les articles publiés (`draft:false`), tri anté-chronologique | Nb de cartes = nb d'articles publiés migrés **ET** aucun `draft:true` visible |
| R5 | Toggle de thème clair/sombre persistant | Cliquer le toggle change le thème **ET** un reload conserve le choix (localStorage) **ET** premier chargement suit `prefers-color-scheme` |
| R6 | Tous les articles publiés de `bencat-website` sont migrés en entrées de la collection `blog`, schéma Zod valide, images co-localisées rendues | `astro build` réussit sans erreur de schéma **ET** `getCollection('blog')` (publiés) = nb de l'ancien site **ET** les images d'articles s'affichent |
| R7 | `/rss.xml` généré, listant les articles publiés | `curl https://bendevcat.github.io/rss.xml` renvoie un RSS valide avec un `<item>` par article publié (titre, lien, date, description) |
| R8 | Design system : tokens couleur (clair+sombre) + 3 polices via `@theme` Tailwind v4, mono sur les éléments techniques | Les 3 polices se chargent (onglet Network) **ET** le toggle applique les variables CSS `--color-*` **ET** méta/tags/code sont en JetBrains Mono |
| R9 | Home + article lisibles sur mobile (~375px) | Viewport 375px : **aucun** scroll horizontal **ET** la grille d'articles passe en 1 colonne **ET** la nav reste utilisable |

*(Aucun verbe vague — chaque ligne est pass/fail.)*

## 4. Work breakdown (phases & tasks)

~4 phases + vérification. Détail des tâches écrit dans le **plan d'implémentation** (au début de la session d'exécution). Squelette :

### Phase A — Scaffold & design system
Init Astro v5, Tailwind v4 via `@tailwindcss/vite`, tokens `@theme` (clair+sombre), polices (Space Grotesk / Inter / JetBrains Mono), layout de base + toggle de thème (localStorage + `prefers-color-scheme`). → couvre R5, R8.

### Phase B — Collection `blog` & migration
`src/content.config.ts` + schéma Zod `blog` (page bundles), migration des articles publiés de `bencat-website` (mapping frontmatter, images co-localisées, nettoyage TOML/shortcodes). → couvre R6.

### Phase C — Pages & rendu
Home (`/`), index (`/blog`), article (`/blog/[slug]`) avec TOC + blocs de code (bouton copier) + bannière IA, flux RSS (`@astrojs/rss`). → couvre R2, R3, R4, R7, R9.

### Phase D — Déploiement
Repo GitHub `bendevcat.github.io` (user site, `base:/`), `astro.config` (`site`), workflow `.github/workflows/deploy.yml` (`withastro/action`), Pages source = GitHub Actions. → couvre R1.

### Phase Z — Verification
- **T** Lancer `/anti-drift-planning:verify 1` — audit canonique (couverture spec, walkthrough user-story, tests, smoke visuel, revue des déviations). Non contournable. Seul chemin vers le ship + le tag `milestone-plan-1`.

## 5. Out of scope (deferred to plan 2+)

- **Sveltia CMS / édition sans code** → Plan 2.
- **Collections projets, prompts, skills** → Plans 3–4.
- **Recherche (Pagefind), `/tags` + `/tags/[tag]` cross-collection, filtres catégorie/tag sur `/blog`, `/a-propos`, `/transparence-ia`, `/404` custom** → Plan 5. *(En Plan 1, catégorie et tags sont affichés sur les cartes/articles comme puces **non cliquables** — les vues filtrées arrivent au Plan 5, donc pas de lien mort.)*
- **Domaine custom (`public/CNAME` + DNS)** → **critère différé**, à brancher dès que le domaine est prêt (fast-follow tracké ici ; bascule triviale car user-site `base:/`).
- **Reskin visuel fin / pixel-perfect** — la *direction* dark editorial-dev est posée ; l'affinage composant-par-composant se fait au fil des plans.

## 6. Out-of-band considerations

### 6.1 Migration safety
- Mapping frontmatter : `date→pubDate`, `categories[0]→category`, `image→cover`, `ai_usage→aiUsage`, `tags→tags`, `draft→draft`.
- Certains anciens posts sont en frontmatter **TOML** (`+++`) et contiennent des shortcodes Hugo (`<!--more-->`) → à convertir/nettoyer.
- **Conserver les slugs existants** pour ne pas casser d'éventuels liens entrants.
- Ne migrer que `content/posts/` publiés — exclure `content/trash/` et les drafts.
- Vérifier chaque image co-localisée (chemins relatifs).

### 6.2 GitHub Pages — user site
Repo nommé **`bendevcat.github.io`** (user site) → servi à la racine, `base:'/'` ; simplifie le futur passage au domaine custom (base inchangée).

### 6.3 Tailwind v4
Utiliser le plugin Vite **`@tailwindcss/vite`** (⚠️ pas l'ancienne intégration `@astrojs/tailwind`).

## 7. Test strategy per phase

| Phase | Test approach |
|---|---|
| A | `astro build` passe · polices chargées (Network) · toggle + persistance (manuel) |
| B | Build sans erreur de schéma Zod · count articles publiés · images rendues |
| C | TOC / bouton copier / bannière IA (manuel) · RSS valide · smoke responsive 375px |
| D | Workflow Actions vert · `curl 200` sur l'URL Pages · `/rss.xml` servi |
| Z | `/anti-drift-planning:verify 1` + walkthrough humain |

## 8. Plan self-review

1. **Spec coverage** — R1→D · R2→C · R3→C · R4→C · R5→A · R6→B · R7→C · R8→A · R9→C. Chaque R mappé à ≥1 phase. ✅
2. **Internal consistency** — noms de champs (`pubDate`, `aiUsage`, `category`, `draft`) alignés sur la spec de design ✅ ; user-site `base:/` cohérent entre §6.2 et R1.
3. **Scope check** — walking skeleton d'un seul tenant (scaffold→contenu→pages→deploy) ; tient en une session. ✅
4. **Ambiguity check** — « en ligne » = URL github.io (pas le domaine, §5) ; « tous les articles » = publiés de `content/posts/` hors trash/drafts (§6.1). ✅

---

**Branch:** `plan-1-socle-blog-deploye` (off `main` @ `e5904eb`)
**Ledger:** `docs/anti-drift/handoffs/plan-1-ledger.md`
**Deviations:** `docs/anti-drift/handoffs/plan-1-deviations.md`
