# Plan 6 — Socle du design system v2 · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.
> Un sous-agent par tâche, revue entre les tâches. Les étapes sont en cases à cocher.

**Goal:** tout le site porte la peau v2 — 23 tokens dans les deux thèmes, Nebula Sans + JetBrains
Mono, 4 patrons de composants, header en pilules — **sans qu'aucune page change de structure**.

**Architecture:** le socle est entièrement en CSS (`src/styles/global.css`), consommé par les
templates via des utilitaires Tailwind v4 générés depuis `@theme`. Un seul composant est reconstruit
(`Header.astro`) ; tous les autres sont *re-câblés* sur les nouveaux tokens, pas redessinés. Aucune
logique TypeScript nouvelle.

**Tech Stack:** Astro 7, Tailwind v4.3.3 (`@tailwindcss/vite`), `@fontsource/nebula-sans` 5.3.0,
`@fontsource-variable/jetbrains-mono`, Vitest 4, Pagefind 1.5.

**Spec:** [`docs/anti-drift/specs/2026-09-12-plan-6-socle-design-system.md`](../specs/2026-09-12-plan-6-socle-design-system.md)
**Contrat visuel (source unique des valeurs):** [`docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md`](../specs/2026-09-12-refonte-visuelle-design.md)

---

## Global Constraints

Ces contraintes s'appliquent à **toutes** les tâches. Elles ne sont pas redites dans chacune.

1. **Aucune valeur de couleur, de rayon ou d'ombre n'est écrite en dur dans un template.** Toute
   valeur vient d'un token défini dans `@theme`. La seule exception autorisée est `global.css`
   lui-même, qui *définit* ces tokens.
2. **Le tableau de valeurs fait foi une seule fois.** Les 23 couleurs viennent de
   `2026-09-12-refonte-visuelle-design.md` §2, les rayons de §3.2, les polices de §3.1. Ni ce plan
   ni le code ne redisent ces nombres ailleurs que dans `global.css`.
3. **Aucune structure de page ne change** (spec §1, R10). Réordonner des blocs, en ajouter ou en
   retirer sur une page est **hors périmètre** et constitue une déviation. `Header.astro` est la
   seule exception, explicitement autorisée.
4. **Aucune logique nouvelle, aucun test unitaire nouveau** (spec §7). Les **12** suites Vitest
   existantes (118 tests) restent vertes après chaque tâche.
5. **Aucun changement d'URL, de schéma Zod, ni de `public/admin/config.yml`** (contrat §9).
6. **Règle des classes composants** (contrat §4) : `.card`, `.card-inner`, `.panel`, `.pill`
   portent fond, bordure, rayon, ombre — **et rien d'autre**. Jamais de `display`, `gap`, `grid`,
   `flex`.
7. **Règle du mono** (contrat §3.1) : `font-mono` signale une donnée machine (date, catégorie,
   chemin, techno, version, compteur). Jamais de la prose.
8. **Hiérarchie des surfaces** (contrat §2.1) : `bg` → `surface` → `card` → `rail`, jamais de saut
   de niveau.
9. **Pas de bleu en thème clair** (contrat §2.2). Réinjecter `#7DD3FC` « pour la cohérence » est une
   déviation, pas une correction.
10. Chaque tâche finit par **un commit** et par la **mise à jour du ledger**
    (`chore(p6): ledger after T-<x>`).

### Conventions de nommage arrêtées par ce plan (spec muette)

Établi par mesure sur Tailwind v4.3.3 : les variables `@theme` en camelCase produisent bien les
utilitaires correspondants (`--color-accentSoft` → `.bg-accentSoft`). Les 23 noms du contrat §2 sont
donc repris **verbatim**, sans transliteration.

| Catégorie | Espace de noms | Exemple |
|---|---|---|
| 22 couleurs | `--color-<nom §2>` | `--color-accentSoft`, `--color-panelLine`, `--color-badgeInk` |
| 1 ombre (`shadow`) | `--shadow` (nu) | utilitaire `.shadow` |
| 5 rayons (§3.2, non nommés par le contrat) | `--radius-*` | `card` 20 · `inner` 14 · `thumb` 10 · `badge` 9 · `pill` 999 |
| 2 polices | `--font-sans`, `--font-mono` | — |

`--font-display` **disparaît** : le contrat §3.1 ne prévoit que deux familles.

### Périmètre de « les 10 routes » (R11, Phase D)

Le contrat §1 définit les 10 routes du prototype. Ce sont celles que R10/R11 mesurent :

`/` · `/blog` · `/blog/[slug]` · `/projets` · `/projets/[slug]` · `/prompts` · `/prompts/[slug]` ·
`/skills` · `/skills/[slug]` · `/a-propos`

Les 4 autres routes du site (`/transparence-ia`, `/tags`, `/tags/[tag]`, `/404`) **reçoivent la
nouvelle peau** — elles consomment les mêmes composants et les mêmes tokens — mais leur audit
375 px / AA est le but explicite de **P8** (contrat §7). Elles sont contrôlées en Phase D au titre
de la non-régression (elles doivent builder et ne pas être cassées), pas au titre de R11.

### Vérification visuelle — outillage

`.claude/launch.json` porte déjà la configuration `astro-preview` (`astro preview --port 4321`).
Toute vérification de rendu se fait sur le **site buildé** (`npm run build` puis ce preview), jamais
sur `astro dev` : c'est l'artefact que R10 compare à `v1.0.0`.

Mesure de débordement, à exécuter dans la page :
```js
document.documentElement.scrollWidth <= window.innerWidth
```

---

## File Structure

| Fichier | Responsabilité après ce plan | Tâches |
|---|---|---|
| `src/styles/global.css` | **Le socle.** `@theme` (23 tokens + rayons + polices), surcharge `[data-theme="dark"]`, 4 classes de patrons, `.prose`, règles héritées (`[hidden]`, `.copy-btn`, Shiki) | A2, B1, B2 |
| `package.json` | `@fontsource/nebula-sans` entre ; `@fontsource-variable/space-grotesk` et `@fontsource-variable/inter` sortent | A1 |
| `src/components/Header.astro` | **Reconstruit.** Logo en pilule, nav en pilules à icônes avec état actif par famille de routes, barre d'actions ronde | C1, C2 |
| `src/components/ThemeToggle.astro` | Bouton rond, intégré à la barre d'actions du header | C2 |
| `src/components/Icon.astro` *(créé)* | 5 glyphes de nav + loupe + GitHub, en SVG inline `currentColor` | C1 |
| `src/components/{ArticleCard,ProjectCard,PromptCard,SkillCard,Hero,AiBanner,TableOfContents,SearchDialog}.astro` | Re-câblés sur les nouveaux tokens, **structure inchangée** | A2 (remap mécanique), D1 (passe fine) |
| `src/pages/**/*.astro` (14 templates) | Re-câblés sur les nouveaux tokens, **structure inchangée** | A2 (remap mécanique), D2 (passe fine) |
| `src/lib/projectStatus.ts`, `src/scripts/search.ts` | Portent des classes de couleur en chaînes TypeScript — remappées comme le reste | A2 |

---

## Phase A — Tokens & typographie

### Task A1 : Polices — Nebula Sans entre, Space Grotesk et Inter sortent

**Couvre :** R2, R3, V7.

**Files:**
- Modify: `package.json` (dépendances)
- Modify: `src/styles/global.css:1-13` (imports `@fontsource*` et `--font-*` dans `@theme`)
- Modify: `docs/anti-drift/specs/2026-09-12-refonte-visuelle-design.md` §8.1 (consigner la décision)
- Modify: tout fichier portant `font-display` (22 occurrences)

**Interfaces:**
- Produit : les tokens `--font-sans` = `"Nebula Sans", ui-sans-serif, system-ui, sans-serif` et
  `--font-mono` = `"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace`.
  `--font-display` n'existe plus — les 22 usages de `font-display` deviennent `font-sans` (les
  titres se distinguent par la graisse, contrat §3.3).

- [ ] **Step 1 — Consigner la décision §8.1 dans la spec de design**

La décision de l'utilisateur (gate de pré-flight) est transcrite dans §8.1, avec le fait qui l'a
établie : `@fontsource/nebula-sans@5.3.0` est sous **SIL OFL-1.1**, © 2024 Nebula Entertainment &
Broadcasting LLC (nebula.tv), dérivée de Source Sans (Adobe) — **pas** une police de marque
Anthropic, contrairement à ce qu'affirmait le texte du §8.1. Corriger cette prémisse fausse fait
partie de l'étape.

- [ ] **Step 2 — Échanger les dépendances**

```bash
npm uninstall @fontsource-variable/space-grotesk @fontsource-variable/inter
npm install @fontsource/nebula-sans@5.3.0
```

Le paquet n'est **pas** variable : il expose 6 graisses statiques. Importer les 5 que le contrat
§3.1 nomme (300/400/500/600/700). Les `@font-face` non utilisés ne déclenchent aucun
téléchargement — le coût réel est celui des graisses effectivement rendues.

- [ ] **Step 3 — Réécrire les imports et les tokens de police de `global.css`**

```css
@import "tailwindcss";
@import "@fontsource/nebula-sans/300.css";
@import "@fontsource/nebula-sans/400.css";
@import "@fontsource/nebula-sans/500.css";
@import "@fontsource/nebula-sans/600.css";
@import "@fontsource/nebula-sans/700.css";
@import "@fontsource-variable/jetbrains-mono";
```

et dans `@theme`, **deux** familles seulement (`--font-display` supprimé).

- [ ] **Step 4 — Remplacer les 22 `font-display`**

```bash
grep -rl 'font-display' src/ | xargs sed -i '' 's/font-display/font-sans/g'
```
Puis relire les 22 sites : là où `font-display` portait un titre, vérifier que la graisse
(`font-bold` / `font-semibold`) est présente — sinon l'ajouter, car la distinction ne passe plus par
la famille.

- [ ] **Step 5 — Vérifier (binaire)**

```bash
grep -ri "space-grotesk\|inter\|font-display" src/ package.json ; echo "exit=$?"
npm run build && npm run test
```
Attendu : **aucune** occurrence (`exit=1` de grep), build vert, 118 tests verts.
Attention aux faux positifs de `inter` : le mot apparaît dans des mots français (`interne`,
`interactif`, `intermédiaire`). Le grep de R3 vise la **dépendance** — utiliser
`grep -rniE '@fontsource[^"]*\b(inter|space-grotesk)\b|Inter Variable|Space Grotesk'`.

- [ ] **Step 6 — Vérifier au rendu que la police servie est bien Nebula Sans**

Après `npm run build`, ouvrir `/` dans le preview et exécuter :
```js
getComputedStyle(document.querySelector('p')).fontFamily
```
Attendu : la chaîne commence par `"Nebula Sans"`. Puis confirmer que la requête réseau du `.woff2`
correspondant part bien (onglet réseau du preview).

- [ ] **Step 7 — Commit**

```bash
git add -A && git commit -m "feat(p6): Nebula Sans remplace Space Grotesk et Inter"
```

---

### Task A2 : Les 23 tokens dans les deux thèmes, et le re-câblage mécanique du site

**Couvre :** R1, R8, R12, V1, V4, V8. Rend aussi le site de nouveau cohérent après le renommage.

**Files:**
- Modify: `src/styles/global.css` (bloc `@theme` + bloc `:root[data-theme="dark"]`)
- Modify: les 25 fichiers portant une classe de couleur (283 occurrences)

**Interfaces:**
- Produit : les 23 tokens du contrat §2 + les 5 rayons du §3.2, disponibles en utilitaires.
- Consomme : les tokens de police de A1.

**Pourquoi tokens et re-câblage dans la même tâche.** Renommer les tokens sans remapper les
utilitaires laisserait le site sans aucune couleur pendant toute la Phase B et C — un état cassé
qu'aucune revue intermédiaire ne pourrait juger. Le remap est presque entièrement mécanique
(5 renommages, ci-dessous) ; la part de jugement se limite à `text-text`.

- [ ] **Step 1 — Réécrire `@theme` et le bloc sombre**

Le contrat §2 donne le **clair** et le **sombre**. Le clair est le défaut (dans `@theme`), le sombre
surcharge dans `:root[data-theme="dark"]` — mécanisme existant, inchangé (spec §6.2). Reprendre les
23 valeurs **exactement**, sans en réécrire une seule ailleurs.

Ajouter les 5 rayons et le `--shadow`. Mettre à jour la règle de base :
```css
html { font-family: var(--font-sans); background: var(--color-bg); color: var(--color-body); }
```
(`--color-text` n'existe plus ; le texte courant est `body`, pas `ink`.)

- [ ] **Step 2 — Remap mécanique des 4 renommages sans ambiguïté**

```bash
FILES=$(grep -rlE '\-(acc|acc-dim|acc-solid|acc-contrast)\b' src/)
sed -i '' -E 's/\b(text|bg|border|decoration|ring|fill|stroke|outline|divide)-acc-dim\b/\1-accentSoft/g;
              s/\b(text|bg|border|decoration|ring|fill|stroke|outline|divide)-acc-contrast\b/\1-accentInk/g;
              s/\b(text|bg|border|decoration|ring|fill|stroke|outline|divide)-acc-solid\b/\1-accent/g;
              s/\b(text|bg|border|decoration|ring|fill|stroke|outline|divide)-acc\b/\1-accent/g' $FILES
```
L'ordre compte : les variantes longues **avant** `-acc` nu, sinon `-acc-dim` devient
`-accent-dim`. Les variantes d'opacité (`border-acc/50`, `text-muted/40`) sont préservées par
`\b`. `bg-surface`, `border-line`, `text-muted` gardent leur nom : ces trois tokens existent à
l'identique dans le contrat §2.

- [ ] **Step 3 — Trancher les 37 `text-text` un par un**

Seul renommage qui demande du jugement : le contrat §2 scinde l'ancien `text` en **`ink`** (titres,
texte fort) et **`body`** (texte courant). Règle à appliquer :

| L'élément porteur est… | Devient |
|---|---|
| `h1`–`h4`, titre de carte, `<strong>`, libellé de bouton actif | `text-ink` |
| paragraphe, description, résumé, cellule de tableau, texte de lien de corps | `text-body` |

Les relire tous ; ne pas globaliser vers `text-ink` « parce que c'est plus proche de l'ancien ».

- [ ] **Step 4 — Vérifier (binaire)**

```bash
# R1 : les 23 noms présents dans les deux thèmes
for t in bg surface card rail line line2 ink body muted dim accent accentInk accentSoft chip \
         panel panelLine badgeBg badgeInk nav cardHover code hatch; do
  printf '%-12s theme=%s dark=%s\n' "$t" \
    "$(awk '/^@theme/,/^}/' src/styles/global.css | grep -c -- "--color-$t:")" \
    "$(awk '/data-theme="dark"/,/^}/' src/styles/global.css | grep -c -- "--color-$t:")"
done
awk '/^@theme/,/^}/' src/styles/global.css | grep -c -- '--shadow:'
```
Attendu : `theme=1 dark=1` sur les 22 couleurs, `1` pour `--shadow` (+ sa surcharge sombre) = **23**.

```bash
# R8 / V4 : aucun bleu de méta appliqué en clair
awk '/^@theme/,/^}/' src/styles/global.css | grep -iE '7DD3FC|125,\s*211,\s*252'
```
Attendu : **aucune ligne** (le bloc clair est le défaut de `@theme`).

```bash
# Aucun ancien nom résiduel
grep -rnE '\-(acc|acc-dim|acc-solid|acc-contrast|text)\b' src/ --include=*.astro --include=*.ts | grep -vE 'text-(ink|body|muted|dim|accent)'
npm run build && npm run test
```

- [ ] **Step 5 — R12 / V8 : calculer les 3 paires de contraste dans les 2 thèmes**

Calcul WCAG (luminance relative), pas à l'œil. Écrire le script dans le scratchpad, pas dans le repo.
Les paires : `body` sur `bg` · `muted` sur `surface` · `accent` sur `accentSoft`.
`accentSoft` étant translucide, le composer d'abord sur son fond réel (`surface`) avant de calculer.
Attendu : les 6 ratios ≥ **4.5:1**. Tout ratio en dessous est un constat à consigner — **pas** une
valeur à corriger en douce, les valeurs du contrat font foi.

- [ ] **Step 6 — Commit**

```bash
git add -A && git commit -m "feat(p6): les 23 tokens du contrat visuel dans les deux themes"
```

---

## Phase B — Patrons de composants

### Task B1 : Les 4 classes de patrons

**Couvre :** R4, V6.

**Files:** Modify: `src/styles/global.css` (nouveau bloc après le bloc de tokens)

**Interfaces:**
- Produit : `.card`, `.card-inner`, `.panel`, `.pill`, consommables par tout template.

- [ ] **Step 1 — Écrire les 4 classes**

Chacune porte exactement : fond, bordure, rayon, et pour `.card-inner` l'ombre. `.pill` porte en
plus son padding et sa famille mono (contrat §4 l'autorise explicitement pour cette classe).

- [ ] **Step 2 — Vérifier (binaire, R4)**

```bash
awk '/^\.(card|card-inner|panel|pill)\b/,/^}/' src/styles/global.css | grep -nE '^\s*(display|gap|grid|flex)'
```
Attendu : **aucune ligne**. C'est la mesure littérale de R4.

- [ ] **Step 3 — Vérifier V6 sur les 4 classes**

Tout `border-radius` des 4 classes ∈ {9, 10, 14, 20, 999}px, exprimé via `var(--radius-*)`.

- [ ] **Step 4 — Commit** — `feat(p6): les 4 patrons de composants (.card, .card-inner, .panel, .pill)`

---

### Task B2 : `.prose` accordé aux nouveaux tokens

**Couvre :** R9, V5, V6.

**Files:** Modify: `src/styles/global.css` (bloc `.prose`, ~lignes 47-160 avant A2)

- [ ] **Step 1 — Re-câbler les règles `.prose`**

- corps : `--color-body` ; titres : `--color-ink`, `--font-sans` + `font-weight: 700`
- liens de corps : `--color-accent`
- code inline : `--color-accent` sur `--color-accentSoft`
- blocs de code : fond `--color-code`, bordure `--color-line`
- citations : barre `--color-line`, texte `--color-muted`
- tableaux : bordures `--color-line`, en-têtes `--color-muted` en mono (donnée machine, V5 OK)
- puces de liste : `--color-dim`

**Conserver sans y toucher** : `overflow-wrap: break-word`, `overflow-x: auto` sur `pre` et `table`,
`scroll-margin-top` des titres, la neutralisation du style de lien sur les titres autolinkés, et la
bascule Shiki. Ces règles sont le filet 375 px hérité du Plan 1 ; les perdre casserait R9 et R11.

- [ ] **Step 2 — Normaliser les rayons de `.prose` (V6)**

Les 5 `border-radius` en `em` (`0.3em`, `0.6em`, `0.5em`, `0.4em`) deviennent des `var(--radius-*)`.
Correspondance : code inline → `--radius-badge` (9) ; bloc de code, image, `.copy-btn` →
`--radius-thumb` (10).

- [ ] **Step 3 — Vérifier au rendu, dans les 2 thèmes**

Article de contrôle : `/blog/k9s-kubernetes-terminal-ui/` — il porte titres, liens, code inline,
blocs Shiki, images, listes. Pour les **tableaux**, un article en contenant est requis ; à défaut,
les vérifier sur `/prompts/<slug>` ou via un fichier de contrôle temporaire non commité.

Contrôle 375 px : `document.documentElement.scrollWidth <= window.innerWidth` → `true`.

- [ ] **Step 4 — Commit** — `feat(p6): .prose accorde aux tokens v2`

---

## Phase C — Header

### Task C1 : Logo en pilule + navigation en pilules à icônes

**Couvre :** R5, R6, E1.

**Files:**
- Create: `src/components/Icon.astro`
- Modify: `src/components/Header.astro`

**Interfaces:**
- `Icon.astro` — Props `{ name: 'blog'|'projets'|'prompts'|'skills'|'a-propos'|'search'|'github'|'logo', size?: number }`.
  Rend un `<svg>` inline en `currentColor`, `aria-hidden="true"`, `focusable="false"`.
  Source des tracés : **Lucide** (`lucide-static@1.45.0`, licence **ISC**), extraits une fois et
  **inlinés** — aucune dépendance runtime ajoutée. Mentionner la source en commentaire du composant.
- Produit pour C2 : le composant `Icon.astro` et le conteneur de droite du header.

- [ ] **Step 1 — Extraire les 8 glyphes**

```bash
cd "$SCRATCH" && npm pack lucide-static@1.45.0 && tar -xzf lucide-static-1.45.0.tgz
# icons/ : newspaper.svg folder-git-2.svg terminal.svg sparkles.svg user.svg search.svg github.svg
```
Le glyphe du **logo** (3 barres, R5) n'est pas un Lucide : le dessiner en trois `<rect>` de largeurs
décroissantes, en `currentColor`.

- [ ] **Step 2 — Écrire `Icon.astro`**

Une `Map` nom → contenu du `<svg>`, un seul `<svg>` rendu avec `width`/`height` = `size` (défaut 14),
`stroke="currentColor"`, `stroke-width="1.75"`, `fill="none"`.

- [ ] **Step 3 — Logo en pilule (R5)**

`<a href="/">` portant `.pill` (rayon 999, bordure `line`), contenant le glyphe 3 barres puis
`bencat<span class="text-accent">_</span>` en mono. `aria-label="bencat_ — accueil"` conservé.

- [ ] **Step 4 — Nav en pilules à icônes avec état actif par famille (R6)**

L'état actif se dérive de `Astro.url.pathname` **par préfixe de famille**, pas par égalité — R6
exige que `/blog/<slug>` mette « Blog » en actif :

```ts
const path = Astro.url.pathname;
const isActive = (href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
```
Attention : `Astro.url.pathname` porte un `/` final en build statique (`/blog/`). La comparaison
ci-dessus le gère (`path === href` échoue, `path.startsWith('/blog/')` réussit).

Actif : fond `nav` + bordure `line` + `font-medium` + `aria-current="page"`.
Inactif : transparent, `text-muted`.

- [ ] **Step 5 — Vérifier (binaire, R6)**

Builder, puis pour chacune des 10 routes vérifier que **exactement un** élément de nav porte
`aria-current="page"` et que c'est le bon :
```js
[...document.querySelectorAll('nav [aria-current="page"]')].map(e => e.textContent.trim())
```
Routes mères **et** filles : `/blog/` → `Blog` · `/blog/docker-kubernetes-devops/` → `Blog` ·
`/projets/gha-svu/` → `Projets` · `/prompts/macos-clone/` → `Prompts` ·
`/skills/superpowers/` → `Skills` · `/a-propos/` → `À propos` · `/` → aucun (le logo porte
l'accueil).

- [ ] **Step 6 — Commit** — `feat(p6): header — logo en pilule et nav en pilules a icones`

---

### Task C2 : Barre d'actions ronde + responsive 375 px

**Couvre :** R7, R11 (header), E2.

**Files:**
- Modify: `src/components/Header.astro`
- Modify: `src/components/ThemeToggle.astro`

**Interfaces:**
- Consomme : `Icon.astro` (C1).
- **Contrats à ne pas casser** — trois attributs sont lus par du code existant :
  `data-search-open` (révélé par `src/scripts/search.ts`, masqué par la règle `[hidden]` de
  `global.css`), `id="theme-toggle"` (écouté par `src/scripts/theme.ts`), et le `<SearchDialog />`
  de `BaseLayout.astro`. Les renommer casserait la recherche ou la bascule.

- [ ] **Step 1 — Conteneur en pilule, 3 boutons ronds**

Un conteneur `.pill`-like (rayon 999, fond `nav`, bordure `line`) contenant trois boutons ronds de
32 px (`--radius-pill`) : recherche, GitHub, thème.

- Recherche : `<button data-search-open hidden>` — **garder l'attribut et le `hidden`**, c'est
  l'enhancement progressif du Plan 5. Icône loupe ; `⌘K` reste affiché ≥ `sm`.
- GitHub : `<a href="https://github.com/bendevcat" target="_blank" rel="noopener noreferrer">`,
  `aria-label="GitHub de benCat"`.
- Thème : `ThemeToggle.astro` réduit à un bouton rond `id="theme-toggle"`, glyphe `◐` conservé
  (le contrat ne prescrit pas d'icône de thème).

- [ ] **Step 2 — Responsive 375 px**

Le header v1 basculait la nav en 2ᵉ ligne sous `sm`. Reprendre **le même principe** avec les
pilules : `order-last w-full sm:order-none sm:w-auto` sur `<nav>`, et laisser les pilules passer à
la ligne (`flex-wrap`). Pas de menu burger — ce serait une structure nouvelle, hors périmètre.

- [ ] **Step 3 — Vérifier (binaire, R7 + R11)**

Sur le site buildé, à 375 px :
- `document.querySelector('[data-search-open]').hidden === false` (script chargé) puis un clic
  ouvre `SearchDialog` ;
- un clic sur `#theme-toggle` fait basculer `document.documentElement.dataset.theme` **et**
  `localStorage.theme` ;
- le lien GitHub pointe vers la bonne URL ;
- `document.documentElement.scrollWidth <= window.innerWidth` sur les 10 routes.

- [ ] **Step 4 — Commit** — `feat(p6): header — barre d'actions ronde (recherche, GitHub, theme)`

---

## Phase D — Passe de non-régression visuelle

### Task D1 : Les 8 composants sur les nouveaux tokens

**Couvre :** R10 (composants), V2, V3, V6.

**Files:** Modify: `src/components/{ArticleCard,ProjectCard,PromptCard,SkillCard,Hero,AiBanner,TableOfContents,SearchDialog}.astro`, `src/lib/projectStatus.ts`, `src/scripts/search.ts`

A2 a rendu ces fichiers *corrects* ; D1 les rend *justes*. Trois contrôles, composant par composant :

- [ ] **Step 1 — Hiérarchie des surfaces (V2)**

Pour chaque composant, identifier le niveau de son fond et celui de son parent. Une carte posée
directement sur `bg` prend `surface` (classe `.card`) ; une carte **dans** une `surface` prend
`card` (classe `.card-inner`). Aucun `rail` sans `card` intermédiaire. Remplacer les fonds ad hoc
par les classes de patrons de B1 partout où le patron correspond.

- [ ] **Step 2 — Grammaire des accents en sombre (V3)**

Vérifier qu'aucun élément ne porte vert **et** bleu. Rappel du partage (contrat §2.2) : vert =
contenu et action ; bleu = méta et navigation. En clair, **aucun bleu** — si un composant en fait
apparaître, c'est un défaut à corriger, pas à harmoniser.

- [ ] **Step 3 — Rayons (V6)**

Les 19 `rounded-lg`, 5 `rounded-xl`, 7 `rounded`, 1 `rounded-md` deviennent `rounded-card` (20),
`rounded-inner` (14), `rounded-thumb` (10), `rounded-badge` (9) ou `rounded-pill` (999) selon
l'usage du contrat §3.2. Après la passe :
```bash
grep -rnE 'rounded(-(sm|md|lg|xl|2xl|3xl|none|full))?\b' src/ | grep -vE 'rounded-(card|inner|thumb|badge|pill)'
```
Attendu : **aucune ligne**.

- [ ] **Step 4 — Vérifier la non-régression de structure (R10)**

Le DOM de chaque composant ne change pas. Preuve mécanique :
```bash
git diff v1.0.0 -- src/components/ | grep -E '^\+' | grep -vE 'class=|^\+\+\+' | head -50
```
Toute ligne ajoutée **hors attribut `class`** est à justifier explicitement — hors `Header.astro`
et `Icon.astro`, exclus de R10 par la spec.

- [ ] **Step 5 — Commit** — `chore(p6): les 8 composants sur les tokens v2, structure inchangee`

---

### Task D2 : Parcours des 10 routes × 2 thèmes × 3 largeurs

**Couvre :** R10, R11, R12, V5.

**Files:** Modify: `src/pages/**/*.astro` (corrections ponctuelles uniquement)

- [ ] **Step 1 — Construire la matrice**

`npm run build`, puis preview. 10 routes × 2 thèmes × {375, 768, 1180} = **60 observations**.
Consigner le résultat dans le ledger, pas seulement « c'est bon ».

- [ ] **Step 2 — Pour chaque route, trois mesures**

1. `document.documentElement.scrollWidth <= window.innerWidth` (R11)
2. Capture d'écran comparée au rendu `v1.0.0` de la même route (R10) : mêmes blocs, même ordre,
   mêmes emplacements. **Header exclu.**
3. Aucun paragraphe de prose en mono (V5) :
```js
[...document.querySelectorAll('p, li')].filter(e =>
  getComputedStyle(e).fontFamily.includes('JetBrains')).length
```
Attendu : `0`.

- [ ] **Step 3 — Le rendu de référence v1.0.0**

```bash
git stash -u && git checkout v1.0.0 && npm ci && npm run build && cp -r dist "$SCRATCH/dist-v1"
git checkout plan-6-socle-design-system && npm ci && git stash pop
```
Le comparatif se fait entre `$SCRATCH/dist-v1` et le `dist` courant, servis chacun en preview.

- [ ] **Step 4 — Corriger, sans restructurer**

Toute correction est un changement de classe utilitaire. Si une correction exige d'ajouter,
retirer ou déplacer un élément du DOM, **c'est une déviation à consigner avant de l'exécuter**
(R10 l'interdit explicitement).

- [ ] **Step 5 — Contrôle de non-régression des 4 routes hors périmètre**

`/transparence-ia`, `/tags`, `/tags/[tag]`, `/404` doivent builder et rendre avec les nouveaux
tokens. Leur audit 375 px / AA appartient à P8 : consigner les constats, ne pas les traiter ici.

- [ ] **Step 6 — Commit** — `chore(p6): passe de non-regression visuelle sur les 10 routes`

---

## Phase Z — Vérification

### Task Z1 : Audit canonique

- [ ] **Step 1** — `/anti-drift-planning:verify 6`
- [ ] **Step 2** — Le verdict conditionne tout : PASS → script de release + tag `milestone-plan-6`
      (= `v1.1.0`). FAIL ou une entrée `pending-user` → handoff, pas de tag.

Non contournable, non résumable de mémoire. Si le contexte manque, écrire le handoff.

---

## Self-Review

**1. Couverture de la spec §3 — les 12 critères**

| R | Tâche(s) | R | Tâche(s) |
|---|---|---|---|
| R1 | A2 | R7 | C2 |
| R2 | A1 | R8 | A2 |
| R3 | A1 | R9 | B2 |
| R4 | B1 | R10 | D1, D2 |
| R5 | C1 | R11 | C2, D2 |
| R6 | C1 | R12 | A2, D2 |

Aucun R orphelin. **Les 8 critères V du contrat visuel** (§10), applicables en Phase Z par la
méthodologie §4.2 : V1→A2 · V2→D1 · V3→D1 · V4→A2 · V5→B2, D2 · V6→B1, B2, D1 · V7→A1 · V8→A2.
Aucun V orphelin non plus — ils étaient le principal angle mort d'une lecture de la seule spec §3.

**2. Placeholders** — aucun « TBD », aucun « similaire à la tâche N », aucune étape sans sa commande
ou son critère binaire.

**3. Cohérence des noms** — `--color-accentSoft` (A2) = `bg-accentSoft` (D1) ; `Icon.astro`
props identiques en C1 et C2 ; `data-search-open` et `#theme-toggle` cités à l'identique en C2 et
dans les fichiers existants.

**4. Défauts de plan corrigés au pré-flight** (texte faux sur la réalité, pas des déviations) —
consignés dans le ledger :
- spec §7 annonce « 10 suites vitest » ; il y en a **12** (118 tests).
- contrat §3.2 s'intitule « quatre valeurs, pas cinq » puis liste **cinq** rayons, et V6 en exige
  cinq.
- contrat §8.1 affirme que Nebula Sans est « la police de marque d'Anthropic » ; le `LICENSE` du
  paquet servi par le prototype dit Nebula Entertainment & Broadcasting LLC, OFL-1.1.

**5. Proportion** — ~380 lignes de plan pour un diff produit d'environ 300 lignes de CSS réécrites,
un composant reconstruit et ~283 substitutions de classes sur 25 fichiers. Proportionné.
