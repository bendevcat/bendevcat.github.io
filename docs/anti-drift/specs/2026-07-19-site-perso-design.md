# Site perso bencat — Spec de design

- **Date** : 2026-07-19
- **Auteur** : Benoît Catillon (benCat) + Claude
- **Statut** : Direction **validée**. Le design *fin* (pixels, teintes exactes, dessin de chaque composant) sera affiné à l'implémentation, en live dans le navigateur.
- **Remplace** : ancien site Hugo + Decap CMS (`bencat-website`).
- **Cadrage d'implémentation** : via `anti-drift-planning` (décomposition en plans numérotés, une session par plan).

---

## 1. Vision & positionnement

Site = **présence en ligne pro + perso** de Benoît Catillon. **Pas** un outil de prise de notes / PKM (contenu curé, fini, destiné à un public).

- **Hub ancré sur le blog** : le blog est le cœur ; **projets**, **prompts**, **skills** sont des piliers satellites.
- **Public** : pairs tech francophones + communauté. Contenu **100 % français**, ton « on se tutoie ».
- **Valeur distinctive** : **transparence IA** (déclaration publique sur l'usage de l'IA par article).
- **Auteur/marque** : benCat / Benoît Catillon. Compte GitHub **bendevcat** (≠ compte pro).

---

## 2. Stack technique

| Brique | Choix | Notes |
|---|---|---|
| SSG | **Astro v5** (statique par défaut) | Content Collections / Content Layer API |
| Style | **Tailwind v4** | plugin Vite `@tailwindcss/vite` (⚠️ pas l'ancien `@astrojs/tailwind`) ; design tokens via `@theme` dans `src/styles/global.css` |
| Interactivité | **Îlots React/Preact** | **NON installé au lancement** (aucun besoin interactif v1). Ajout ciblé le jour venu ; lean par défaut **Preact** (`@astrojs/preact`, ~3 Ko) sauf besoin d'écosystème React |
| CMS | **Sveltia CMS** | Git-based headless, drop-in Decap. Auth **PAT « Sign In with Token »** → **zéro backend** sur GitHub Pages. `public/admin/{index.html,config.yml}` |
| Hébergement | **GitHub Pages** + **domaine custom** | `site: 'https://<domaine>'`, **pas de `base`**, `public/CNAME`, workflow `withastro/action`, Source = GitHub Actions |
| Recherche | **Pagefind** | indexe le HTML buildé, zéro backend (remplace l'index JSON fait-main de l'ancien site) |

### Gotchas actés (à intégrer dès le départ)
- `output.omit_empty_optional_fields: true` dans `config.yml` Sveltia → sinon les champs optionnels vides cassent les schémas Zod d'Astro (notamment dates optionnelles).
- **Épingler la version du CDN Sveltia** (pre-1.0, releases fréquentes).
- Édition **locale** Sveltia = File System Access API → **Chromium uniquement** (Chrome/Edge/Brave). Pas de `decap-server`/`local_backend`.
- **Images** : contenu en *page bundles* (`src/content/<coll>/<slug>/index.md` + images co-localisées) pour bénéficier de l'optimisation Astro via le helper `image()`.

---

## 3. Modèle de contenu — 4 collections

Content Layer API, loader `glob()`, schémas Zod typés. **Page bundles** (un dossier par entrée). Fichier `src/content.config.ts`.

### Décisions actées
1. **Tags** = chaînes libres (`z.array(z.string())`) + pages de tags générées. (Pas de collection `tags` dédiée au v1 ; promotion possible plus tard.)
2. **Catégories blog** = enum curé : `Actus · DevOps · Outils · Sécurité · Geekerie · Tutos · IA`.
3. **Texte du prompt** = champ `prompt` dédié en frontmatter (bouton copier fiable) pour les fiches.
4. **Liaison v1 = minimale** : tags partagés + `blog ↔ projects` + `skills ↔ prompts`. Extensible ensuite.

### 3.1 `blog` — articles *(cœur du site)*
```
title           string (req)
description     string (req)         # cartes + <meta>
pubDate         date (req)
updatedDate     date?
draft           boolean = false
category        enum(CATEGORIES) (req)   # 1 seule
tags            string[] = []
cover           image()?  + coverAlt string?
aiUsage         enum('none','partial','full')?   # transparence IA
featured        boolean = false
relatedProjects reference('projects')[]?
```
Corps = l'article (Markdown/MDX).

### 3.2 `projects` — fiches projets
```
title, description (req)
status          enum('actif','wip','archivé') = 'actif'
startDate       date?
stack           string[] = []        # technos
tags            string[] = []
cover           image()? + coverAlt string?
repoUrl         url?
demoUrl         url?
featured        boolean = false
relatedPosts    reference('blog')[]?
```
Corps = présentation détaillée (extensions Chrome, outils, POCs…).

### 3.3 `prompts` — bibliothèque de prompts
```
title, description (req)
format          enum('fiche','guide') = 'fiche'
prompt          string?              # texte copiable (fiches)
tool            string = 'Claude'    # extensible multi-outils
model           string?
tags            string[] = []
draft           boolean = false
relatedSkills   reference('skills')[]?
```
Fiche : corps = notes d'usage + prompt copiable en 1 clic. Guide : corps = write-up.

### 3.4 `skills` — bibliothèque de skills Claude Code
```
title           string (req)         # nom lisible
name            string?              # slug type SKILL.md
description     string (req)         # le « when to use »
type            string = 'claude-code'   # extensible (competence, howto…)
tags            string[] = []
version         string?
repoUrl         url?
installCmd      string?
draft           boolean = false
relatedPrompts  reference('prompts')[]?
```
Corps = contenu/instructions du skill + comment l'utiliser. **v1 = 100 % Claude Code** ; `type` prévu pour élargir sans refonte.

### 3.5 Tissu connectif
- **Tags thématiques partagés** entre les 4 collections → pages `/tags/<tag>` agrègent tout.
- **Liens typés** `reference()` : `blog ↔ projects`, `skills ↔ prompts`.

### 3.6 Migration
- Migrer les **~15 articles publiés** de `bencat-website`.
- Mapping : `date→pubDate`, `categories[0]→category`, `image→cover`, `ai_usage→aiUsage`, `tags→tags`, `draft→draft`.
- **Abandonnés** (car présence publique ≠ outil de notes) : inbox « Dump Mental », tags de workflow (`en-cours`, `à-relire`, `inbox`…), page stats/dashboard.

---

## 4. Structure des pages & routing

Routing par fichiers (`src/pages/`). **URLs en français.**

```
/                    Home — hub ancré blog
/blog                Index articles (filtres catégorie + tag)
/blog/[slug]         Article — TOC, code blocks, bannière transparence IA
/projets             Index projets — grille de cartes (filtre statut/stack)
/projets/[slug]      Fiche projet
/prompts             Bibliothèque prompts — filtre format/outil/tag, copie 1 clic
/prompts/[slug]      Prompt (fiche ou guide)
/skills              Bibliothèque skills — filtre tag/type
/skills/[slug]       Skill
/tags                Index de tous les tags
/tags/[tag]          Tag — agrège blog + projets + prompts + skills
/a-propos            Bio, parcours, le « pourquoi » du site
/transparence-ia     Explique le système de bannières IA (différenciateur)
/rss.xml             Flux RSS (articles)
/404
/admin/              Sveltia CMS (public/admin/, hors routing Astro)
```

### Navigation
`Blog · Projets · Prompts · Skills · À propos` + 🔍 recherche (⌘K, portée = **tout le site**) + 🌓 bascule thème. **Catégories = filtres dans `/blog`** (pas dans la nav).

### Composition de la Home *(structure, pas visuel)*
1. **Hero** — identité pro + perso en 1–2 phrases
2. **Articles** — 1 *featured* + grille des récents
3. **Satellites** — teasers : dernier projet, prompts & skills phares
4. **CTA** — à propos / GitHub / contact

---

## 5. Direction visuelle — « dark editorial-dev »

**Esprit** : squelette **éditorial** (typo forte, grands blancs, cartes propres) × **peau terminal** (fond near-black, accents monospace, vert terminal). Clair **et** sombre.

### Typographie
- **Titres** : Space Grotesk (700, tracking serré)
- **Corps** : Inter
- **Technique** : JetBrains Mono (kickers, tags, méta, code) — *le mono partout où c'est « technique »*, c'est ça la signature.

### Tokens couleur — **point de départ** (à affiner au build)
**Dark**
```
--bg #0B0E14 · --surface #141B24 · --line rgba(255,255,255,.09)
--text #E8EDF3 · --muted #8B97A6 · --acc #4ADE80 · --acc-contrast #06281A
```
**Light** (vert texte foncé pour contraste AA)
```
--bg #FCFCFD · --surface #FFFFFF · --line rgba(15,23,42,.10)
--text #14181F · --muted #5A6572 · --acc(text) #047857 · --acc-solid #34D399 · --acc-dim #ECFDF5
```

### Fonctionnalités portées (de l'ancien thème)
- Bascule **dark/light** (localStorage)
- **Recherche** ⌘K (via Pagefind)
- **TOC** auto (H2/H3, highlight au scroll)
- **Code blocks** enrichis (copie, numéros de ligne, coloration)
- **Bannières transparence IA** (article) + puces (cartes)
- **Cartes** d'article/projet/prompt/skill

### Ce qui est FIGÉ (direction) vs OUVERT (affiné au build)
- **Figé** : l'esprit dark editorial-dev, le pairing typo, le mono pour le technique, les deux thèmes.
- **Ouvert** : espacements/tailles/arrondis/ombres exacts ; teintes finales ; dessin réel de chaque composant ; **toutes les pages hors home** (article, fiche projet/prompt/skill, listes, à-propos) ; responsive ; micro-interactions ; logo.

---

## 6. Décisions ouvertes (à trancher au build)
- **Accent final** : vert terminal `#4ADE80` (défaut de travail) vs cyan `#38BDF8` vs indigo `#6366F1`. *Simple variable CSS.*
- **Échelle couleur transparence IA** : proposition = `100 % humain` ardoise · `co-créé` ambre · `IA relue` bleu (pour ne pas se confondre avec le vert des tags). À confirmer.
- **Nom de domaine** exact (ex. `bencat.dev` ?) — à confirmer, conditionne `site` + `CNAME`.
- **Logo** / favicon.

---

## 7. Hors périmètre v1 (plus tard, sans refonte)
- Îlots React/Preact (aucun composant interactif au lancement).
- Page Stats / dashboard.
- Élargissement `skills` au-delà de Claude Code (schéma déjà prêt via `type`).
- Collection `tags` typée (si besoin de description/couleur par tag).
- OAuth relay Cloudflare Worker pour Sveltia (uniquement si éditeurs non-tech un jour).

---

## 8. Prochaine étape
Cadrage de l'implémentation via **`anti-drift-planning`** : décomposer cette spec en plans numérotés (ex. *scaffold Astro+Tailwind+deploy*, *modèle de contenu + migration*, *CMS Sveltia*, *thème & composants*, *pages librairies*…), une session par plan, avec suivi anti-dérive.
