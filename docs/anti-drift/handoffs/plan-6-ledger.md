# Plan 6 — Scope Ledger

Last updated: 2026-09-13 (Phase D Done — prêt pour Phase Z)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Les 23 tokens existent dans les deux thèmes — `global.css` définit les 23 noms de `§2` du contrat visuel sous `@theme` **ET** les 23 sous `:root[data-theme="dark"]`, aux valeurs exactes du tableau | Done | Couvert par T-A2. Nommage arrêté au pré-flight : les 23 noms sont repris **verbatim** (22 en `--color-<nom>`, 1 en `--shadow` nu). Fait mesuré sur Tailwind v4.3.3 : une variable `@theme` en camelCase produit bien son utilitaire (`--color-accentSoft` → `.bg-accentSoft`) — aucune transliteration nécessaire. **Établie en `8b977f6`, durcie en `6af9329`.** Les **46** valeurs (23 × 2 thèmes) ont été vérifiées **chiffre par chiffre** contre le tableau §2 — par l'implémenteur, puis indépendamment par le relecteur avec son propre parseur : **46/46 exactes**, alphas compris (`.11`/`.07`/`.10`/`.12`/`.08`/`.06`/`.05`/`.03`/`.16`/`.18`/`.20`). Le correctif `6af9329` ajoute `static` au `@theme` : sans lui Tailwind élaguait six tokens clairs du bundle (`card`, `rail`, `chip`, `panel`, `nav`, `hatch`) — mesuré avant/après sur `dist/` par l'implémenteur, par le relecteur et par le contrôleur : **17 → 23** tokens clairs émis, sombre **22/22** inchangé, aucune valeur modifiée. |
| R2 | Nebula Sans (ou sa substitution actée) est servie — le texte courant de `/` est rendu dans la police retenue **ET** la décision `§8.1` est tranchée et consignée dans la spec de design | Done | Couvert par T-A1. **Bloqueur tranché par l'utilisateur au gate de pré-flight du 2026-09-13 : « Embarquer Nebula Sans (OFL-1.1) ».** Le fait qui l'a établi : le `LICENSE` de `@fontsource/nebula-sans@5.3.0` porte « Copyright (c) 2024, Nebula Entertainment & Broadcasting LLC (nebula.tv) », dérivée de Source Sans (Adobe), sous SIL OFL-1.1 — licence libre autorisant l'embarquement. La prémisse « police de marque d'Anthropic » du §8.1 est fausse et est corrigée en T-A1. **Établie en `30c9ed0`.** Les deux moitiés sont mesurées séparément. Rendu, sur le site **buildé** servi en preview : `getComputedStyle(document.body).fontFamily` → `"Nebula Sans", ui-sans-serif, system-ui, sans-serif` · titre `h1` → même famille, `font-weight: 700` · `document.fonts` charge effectivement `Nebula Sans 400/600/700` (300 et 500 déclarées mais non rendues sur cette page, donc non téléchargées — comportement attendu d'un `@font-face` non utilisé). Consignation : §8.1 de la spec de design, marqué « TRANCHÉ (gate de pré-flight, 2026-09-13) », prémisse fausse corrigée, fait de licence cité, décision transcrite mot pour mot. |
| R3 | Space Grotesk et Inter sont retirés — `grep` ne renvoie aucune occurrence **ET** `npm run build` passe | Done | **Établie en `30c9ed0`.** Le grep littéral de la spec (`grep -ri "space-grotesk\|inter"`) renvoie 55 lignes, **toutes** classées une par une et **toutes** de faux positifs de mots français (`interne`, `interactif`, `intermédiaire`, `interface`, `interface Props` en TS, `pointer-events`) — zéro occurrence portant un nom de dépendance ou une `font-family`. La mesure qui fait foi vise donc la **dépendance et la famille CSS** : `grep -rniE '@fontsource[^"]*\b(inter\|space-grotesk)\b\|Inter Variable\|Space Grotesk' src/ package.json` → aucune ligne. Vérifié indépendamment par le relecteur. Build vert, 52 pages. |
| R4 | Les 4 classes de patrons existent — `global.css` définit `.card`, `.card-inner`, `.panel`, `.pill` **ET** aucune ne contient `display`, `gap`, `grid` ou `flex` | Done | **Établie en `9397719`.** Le `grep` de la spec ne renvoie aucune ligne. Le relecteur ne s'en est pas contenté — la plage `awk` est un instrument grossier : il a **lu les quatre corps de classe** et cherché en plus `align-items`, `justify-content`, `place-items`, `inline-flex`, `width`, `position`. Rien. Correspondance au contrat §4 token par token : `.card` → `surface`/`line`/20px · `.card-inner` → `card`/`line`/14px/`var(--shadow)` · `.panel` → `panel`/`panelLine`/20px · `.pill` → 999px/`accentSoft`/`accent`/mono. L'ombre est consommée en CSS et **non** par l'utilitaire `.shadow` (contrainte n°12). |
| R5 | Header : logo en pilule — `bencat_` dans une pilule à bordure avec son glyphe à 3 barres, menant à `/` | Done | **Établie en `513ae83`.** `Header.astro:70-77` — `<a href="/">` portant `.pill` + `border-line`, glyphe à 3 `<rect>` de largeurs décroissantes, `aria-label` du v1 conservé. Rendu vérifié dans la page par le relecteur. |
| R6 | Header : nav en pilules à icônes — les 5 items portent leur icône **ET** l'item de la route courante est distinct (fond + graisse), y compris sur une route fille | Done | **Établie en `513ae83`.** Mesure par **comptage**, pas à l'œil, et refaite indépendamment par le relecteur sur le site buildé : **exactement un** `aria-current="page"` sur les 9 routes concernées, **zéro** sur `/` (les 5 items sont Blog/Projets/Prompts/Skills/À propos — le logo porte l'accueil), et **zéro faux positif** sur les 5 routes de contrôle (`/tags/`, `/tags/docker/`, `/transparence-ia/`, `/404` sous ses 3 formes). Le piège du slash final de `Astro.url.pathname` en build statique est traité par `path.startsWith(href + '/')`. |
| R7 | Header : barre d'actions ronde — 3 boutons ronds (recherche, GitHub, thème) dans un conteneur en pilule ; la recherche ouvre le `SearchDialog` existant, le thème bascule | Done | **Établie en `8dc8976`, sous réserve de la décision D01.** Les trois vérifications fonctionnelles faites en direct par le relecteur : le bouton de recherche est révélé par le script puis un clic met `dialog.open === true` · un clic sur `#theme-toggle` bascule `dataset.theme` **et** `localStorage.theme` ensemble, dans les deux sens · le lien GitHub pointe `https://github.com/bendevcat` avec `rel="noopener noreferrer"`. Le glyphe GitHub est en **aplat** là où les six Lucide sont en trait : sa peinture réelle est mesurée (`getBBox()` → `24 × 23.4`), pas déduite du code. Anneau de focus vérifié au **vrai Tab clavier** (et non `.focus()`, qui ne déclenche pas `:focus-visible` de façon fiable) : `outline: 2px solid` en `--color-ink` dans les deux thèmes. |
| R8 | Thème clair complet et sans bleu — les 23 valeurs claires s'appliquent **ET** aucun `#7DD3FC` (ni `rgba(125,211,252…`) sous `[data-theme="light"]` | Done | **Établie en `8b977f6`, re-prouvée sur le bundle en `6af9329`.** Vérifiée à deux niveaux : dans la source (`awk` sur le bloc `@theme` → aucune occurrence de `7DD3FC` ni de `125,211,252`) **et** dans le CSS émis, où toutes les occurrences de `7dd3fc` tombent à l'intérieur du seul bloc `:root[data-theme=dark]`, bornes vérifiées programmatiquement. En clair, `badgeInk` vaut bien le vert `#0B6B4C` et `panel` le gris neutre `#E9EEF3` — aucun bleu « harmonisé » n'a été réintroduit. |
| R9 | `.prose` accordé — titres, liens, code inline, blocs, citations, listes et tableaux aux nouveaux tokens, dans les **deux** thèmes, sans débordement horizontal | Done | **Établie en `8c3e1c4`, complétée en `ea31341`.** La première passe satisfaisait R9 **à la lettre mais pas en substance** : `.prose :where(pre) { background: var(--color-code) }` est écrit correctement et ne peignait **aucun** bloc réel — `:where()` a une spécificité nulle, Shiki pose un `style=` inline en clair et un `!important` en sombre. Mesuré avant : clair `rgb(255,255,255)`, sombre `rgb(36,41,46)`. Après `ea31341`, mesuré par trois agents indépendamment : clair `rgb(239,243,247)` = `#EFF3F7`, sombre `rgb(10,12,15)` = `#0A0C0F` — les valeurs du contrat. Le piège identifié à l'avance est fermé : **0 span sur 447** peint un fond. La bascule syntaxique dual-thème du Plan 1 survit — **393 spans sur 447** changent de couleur, les 54 identiques étant le gris de commentaire `#6A737D` que `github-light` et `github-dark` partagent réellement. Le filet 375 px du Plan 1 est intact, ses **7** règles vérifiées une par une. |
| R10 | Aucune page n'a changé de structure — mêmes blocs, même ordre, mêmes emplacements qu'en `v1.0.0`. **Header exclu.** | Done | **Établie en `c313362` (composants) et `a508ee5` (pages).** Preuve **plus forte** que celle prévue au plan : chaque page générée est normalisée en squelette DOM (scripts, styles, `<header>` et **tous** les attributs retirés ; noms de balises, texte et ordre conservés) puis diffée contre le build `v1.0.0` — **52 pages sur 52 identiques**. Le relecteur a refait la mesure avec son propre normaliseur **et** l'a soumise à un test de mutation : élément injecté → `DIFFERENT`, élément supprimé → `DIFFERENT`, deux sections échangées → `DIFFERENT`, classe changée partout → `IDENTIQUE`. La preuve n'est donc pas vide. Le gate simple confirme : `git diff v1.0.0 -- src/pages/` ne renvoie aucune ligne ajoutée hors `class=`. |
| R11 | 375 px sans débordement — sur les 10 routes, `document.documentElement.scrollWidth <= innerWidth` | Done | Couvert par T-C2 et T-D2. **Établie en `a508ee5`.** Les **60 observations** (10 routes × 2 thèmes × 375/768/1180) donnent `scrollWidth == innerWidth` à l'**égalité exacte** — zéro débordement et zéro marge. Refaites indépendamment par le relecteur sur 28 observations en iframes fraîches (jamais par bascule de `dataset.theme` à chaud, qui fausse la mesure). Moitié header établie plus tôt en `8dc8976` : `scrollWidth <= innerWidth` vrai (égalité exacte) sur les **10 routes** à 375 px, dans les deux thèmes, sans menu burger — la nav passe en 2ᵉ ligne et les pilules se replient sur deux rangs. Reste la passe complète de T-D2 (768 et 1180 n'ont été échantillonnés que sur `/a-propos/`, la route au libellé de nav le plus long). Les **10 routes** = celles du prototype (contrat §1). Les 4 autres routes du site (`/transparence-ia`, `/tags`, `/tags/[tag]`, `/404`) sont contrôlées en non-régression mais leur audit 375 px / AA est le but explicite de P8 (contrat §7). |
| R12 | Contrastes AA — `body` sur `bg`, `muted` sur `surface`, `accent` sur `accentSoft` ≥ 4.5:1 dans les deux thèmes | Done | **Établie en `8b977f6`, confirmée au rendu en `a508ee5`.** Luminance relative WCAG, `accentSoft` composé *source-over* sur `surface` avant calcul (clair → `rgb(231,240,237)`, sombre → `rgb(25,46,39)`). **6/6 ≥ 4.5:1** — clair : `body`/`bg` **11.79**, `muted`/`surface` **6.33**, `accent`/`accentSoft` **5.61** ; sombre : **12.75**, **7.34**, **8.25**. Recalculés indépendamment par le relecteur, qui retrouve les mêmes chiffres à la décimale. Le relecteur a aussi vérifié le fond alternatif réel (pilule d'accent posée sur `bg`) : **5.10** en clair, **9.21** en sombre — AA également. **Aucune valeur du contrat n'a été ajustée** ; le test de sincérité est que sauter la composition aurait affiché 6.52 au lieu de 5.61, donc un chiffre plus flatteur. **Le contrôle au rendu a révélé un cas que le calcul sur papier ne couvrait pas** : `accentSoft` porte de l'alpha, donc son contraste dépend de ce qu'il y a *derrière*. Posé sur `surface` il reproduit le calcul de la Phase A (8.25 sombre / 5.62 clair) ; posé sur **`bg`** — la pilule du logo dans le header — il donne 9.20 sombre / **5.11** clair. Les six paires passent, mais **5.11:1 est la marge la plus mince de tout le contrat** et elle bougera si un fond clair change. Recalculé indépendamment par le relecteur (composite `rgb(218,230,230)`, ratio 5.104–5.114). **À reprendre en P8**, dont la spec porte déjà « contrastes AA ». |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers | Status |
|---|---|---|---|
| A1 | A | R2, R3 (+ V7) — polices : Nebula Sans entre, Space Grotesk et Inter sortent | Done (`30c9ed0`) |
| A2 | A | R1, R8, R12 (+ V1, V4, V8) — les 23 tokens dans les 2 thèmes + re-câblage mécanique des 283 classes | Done (`8b977f6`, correctif `6af9329`) |
| B1 | B | R4 (+ V6) — `.card`, `.card-inner`, `.panel`, `.pill` | Done (`9397719`) |
| B2 | B | R9 (+ V5, V6) — `.prose` accordé | Done (`8c3e1c4`, correctif `ea31341`) |
| C1 | C | R5, R6 (+ E1) — logo en pilule, nav en pilules à icônes, actif par famille de routes | Done (`513ae83`) |
| C2 | C | R7, R11 header (+ E2) — barre d'actions ronde, responsive 375 px | Done (`8dc8976`) — voir D01 |
| D1 | D | R10 composants (+ V2, V3, V6) — les 8 composants sur les tokens v2 | Done (`c313362`) — voir D02 |
| D2 | D | R10, R11, R12 (+ V5) — parcours 10 routes × 2 thèmes × 3 largeurs · + le gate V6 repo-wide | Done (`a508ee5`) |
| Z1 | Z | Audit `/anti-drift-planning:verify 6` (couverture R1–R12 + V1–V8) | Pending |

## Critères du contrat visuel (V1–V8, §10) — rattachement

La méthodologie §4.2 les rend applicables en Phase Z de chaque plan de la vague 2. Ils ne sont pas
dans la spec §3 : les rattacher explicitement évite qu'ils surgissent en Phase Z.

| V | Critère | Tâche | Statut |
|---|---|---|---|
| V1 | Les 23 tokens dans les 2 thèmes | A2 | Done (`6af9329`) |
| V2 | Aucun saut de niveau de surface | D1 | Done (`c313362`) — audité **en sombre**, seul thème où un saut est visible : le contrat donne `card` = `surface` = `#FFFFFF` en clair. Les 8 composants sont posés sur `bg` ; aucun saut. Un défaut réel corrigé au passage : la puce de statut `archivé` était en `bg-surface` sur une carte déjà `surface` — invisible en clair, corrigée en `bg-chip`. |
| V3 | Grammaire des accents respectée en sombre | D1 | Done (`c313362`). Le relecteur a établi que les 5 pilules de nav ne portent **aucun** accent (elles prennent `nav`/`line`/`ink`/`muted`, neutres), et que seule la pilule du logo porte le vert — identité, pas navigation. Aucun élément ne porte les deux. Côté composants, le relecteur a établi qu'aucun des quatre tokens porteurs de bleu (`badgeInk`, `badgeBg`, `panel`, `panelLine`) n'apparaît dans les 10 fichiers, et vérifié au rendu dans les deux thèmes. |
| V4 | Thème clair sans bleu | A2 | Done (`6af9329`) |
| V5 | Mono réservé à la donnée machine | B2, D1, D2 | **Done (`a508ee5`).** Compte relevé par route et par thème sur les 14 routes, refait par le relecteur : aucune prose en mono ; tout ce qui reste en mono est de la donnée machine (dates, catégories, versions, technos, compteurs). Le correctif de `SearchDialog` a traité la **cause systémique**, pas la ligne signalée : les 4 états dynamiques passent tous par `message()` dans `search.ts`, qui réécrit ce même `<p>` dès la première frappe — ne corriger que la ligne statique aurait donné un correctif qui s'annule au premier caractère tapé. |
| V6 | Rayons ∈ {9, 10, 14, 20, 999}px | B1, B2, D1, D2 | **Done (`a508ee5`).** Le gate **repo-wide** ne renvoie aucune ligne. Le relecteur l'a aussi rejoué sur le commit *précédent* pour vérifier l'état « avant » : **31 lignes, toutes dans `src/pages/`** — le compte annoncé est exact. Deux arbitrages sont assumés et consignés plutôt que maquillés : les boutons du `Hero` en `rounded-pill` et les lignes de résultat de recherche en `rounded-thumb` — le §3.2 nomme 10px pour « vignette, petite image », pas pour une ligne de texte. |
| V7 | Space Grotesk et Inter retirés | A1 | Done (`30c9ed0`) |
| V8 | Contrastes AA | A2 | Done (`8b977f6`) |

## Décisions de l'utilisateur au gate de pré-flight (2026-09-13)

1. **§8.1 — Nebula Sans est embarquée** (`@fontsource/nebula-sans@5.3.0`, SIL OFL-1.1). Option
   choisie : « Embarquer Nebula Sans (OFL-1.1) ». Consignation dans la spec de design en T-A1.
2. **Plan d'implémentation validé** tel quel, option « Je valide, lance T-A1 » — y compris ses trois
   choix non triviaux : noms de tokens verbatim, T-A2 fusionnant tokens et re-câblage, et le
   périmètre « 10 routes » de R11.

## Rulings du contrôleur au scan de pré-flight (défauts de plan, pas des déviations)

Détail et coût-si-faux dans `.superpowers/sdd/2026-09-12-plan-6-socle-design-system/progress.md`.

- **R-01** — T-A2 préserve les tokens de police posés par T-A1 et ne réintroduit pas
  `--font-display`.
- **R-02** — T-A2 remappe aussi les `var(--color-*)` **internes à `global.css`** (`.prose`,
  `.copy-btn`), sinon des variables pendouillent entre T-A2 et T-B2. T-B2 garde la sémantique.
- **R-03** — le grep V6 **repo-wide** est le critère de T-D2, pas de T-D1 ; T-D1 le passe scopé à
  `src/components/`.

## Décisions d'implémentation tranchées par le plan (spec muette — ratification au gate)

- **Noms des tokens repris verbatim** du contrat §2, y compris le camelCase (`--color-accentSoft`,
  `--color-panelLine`, `--color-badgeBg`, `--color-badgeInk`, `--color-cardHover`,
  `--color-accentInk`, `--color-line2`). Mesuré, pas supposé : Tailwind v4.3.3 génère
  `.bg-accentSoft` depuis `--color-accentSoft`.
- **`shadow` défini en `--shadow` nu** (utilitaire `.shadow`) plutôt qu'en `--shadow-card` : c'est le
  seul nommage qui fait littéralement exister le 23ᵉ nom du contrat dans `@theme`.
- **Rayons nommés par le plan** (le contrat §3.2 nomme des usages, pas des tokens) :
  `--radius-card` 20 · `--radius-inner` 14 · `--radius-thumb` 10 · `--radius-badge` 9 ·
  `--radius-pill` 999.
- **`--font-display` supprimé.** Le contrat §3.1 ne prévoit que deux familles ; les 22 usages de
  `font-display` passent en `font-sans`, la distinction des titres passant à la graisse (§3.3).
- **Tokens et re-câblage dans la même tâche (T-A2).** Renommer les tokens sans remapper les
  utilitaires laisserait le site sans couleurs pendant les phases B et C — un état qu'aucune revue
  intermédiaire ne pourrait juger.
- **Icônes de nav : tracés Lucide (`lucide-static`, licence ISC) inlinés** dans un
  `src/components/Icon.astro`, sans dépendance runtime. Le glyphe du logo (3 barres, R5) est dessiné
  à la main — il n'existe pas chez Lucide.
- **Pas de menu burger à 375 px.** Le header v1 fait passer la nav en 2ᵉ ligne sous `sm` ; le même
  principe est repris avec les pilules. Un burger serait une structure nouvelle.
- **Vérification sur le site buildé** (`npm run build` + `astro preview` via `.claude/launch.json`),
  jamais sur `astro dev` : c'est l'artefact que R10 compare à `v1.0.0`.

## Défauts de plan corrigés (texte faux sur la réalité — pas des déviations)

Le discriminant appliqué : la correction ne change ni ce qui ship, ni ce que l'utilisateur observe,
ni le périmètre. Elle aligne un texte sur une réalité déjà actée.

- **plan defect: spec §7 annonce « 10 suites vitest », il y en a 12 (118 tests)** — corrigé en
  `30c9ed0`. Compte revérifié indépendamment par le relecteur : `Test Files 12 passed (12)`,
  `Tests 118 passed (118)`.
- **plan defect: contrat §3.2 s'intitule « quatre valeurs, pas cinq » puis liste cinq rayons, et V6
  en exige cinq** — corrigé en `<sha T-A1>`.
- **plan defect: contrat §8.1 affirme que Nebula Sans est « la police de marque d'Anthropic » ; le
  `LICENSE` du paquet que le prototype sert (`@fontsource/nebula-sans@5.3.0`) porte « Copyright (c)
  2024, Nebula Entertainment & Broadcasting LLC (nebula.tv) », dérivée de Source Sans (Adobe), sous
  SIL OFL-1.1** — corrigé en `30c9ed0`, en même temps que la consignation de la décision §8.1.

## Constats reportés à une tâche ultérieure

Relevés en passant, hors du périmètre de la tâche qui les a trouvés. Aucun n'est une déviation :
aucun n'exige un arbitrage, chacun a une tâche d'accueil déjà prévue au plan.

- **Contrainte pour T-B1 — l'ombre ne passe pas par l'utilitaire `.shadow`.** Mesuré sur le bundle en
  T-A2 et confirmé par le relecteur : Tailwind v4 inline la valeur **claire** à la compilation dans
  `.shadow` (`--tw-shadow:0 10px 18px -12px …`), donc la surcharge sombre ne l'atteint jamais. La
  variable `var(--shadow)` bascule, elle, correctement. `.card-inner` doit donc porter
  `box-shadow: var(--shadow)` en CSS — ce que le contrat §4 prescrit déjà. Les utilitaires de rayon
  n'ont pas ce défaut : les cinq lisent bien leur variable. **Porté en contrainte globale n°12 du
  plan d'impl.**
- **Contrainte pour toutes les tâches — `@theme static` ne se supprime pas.** Son retrait fait
  disparaître six tokens clairs du bundle sans aucun signal rouge. **Porté en contrainte globale
  n°11 du plan d'impl** plutôt que laissé à un commentaire, sur la remarque du relecteur de la
  re-revue : un garde-fou qui repose sur « lis-moi » protège mal contre une passe de simplification.
- **Constat archivé (traité en T-D1) — `backdrop:bg-black/60` dans `SearchDialog.astro:8`.** Une couleur hors des
  23 tokens du contrat, antérieure à ce plan (Plan 5). La Phase D devra trancher si le voile de la
  modale entre dans le système ou reste un cas à part.
- **Constat pour T-D1/T-D2 — la hiérarchie des surfaces (§2.1) n'est auditable qu'en sombre.** En
  clair, le contrat donne `card` = `surface` = `#FFFFFF` : un saut de niveau y est littéralement
  invisible. V2 se vérifie donc en thème sombre, pas en clair.
- **Piste pour la spec de P7 — envelopper les 4 patrons dans `@layer components`.** Proposée par le
  relecteur de T-D1 comme la correction de fond du piège de la contrainte n°13 : les patrons étant
  hors layer, ils battent tout utilitaire, en silence. Les mettre dans `@layer components` rendrait
  aux utilitaires leur comportement normal et supprimerait le piège pour de bon. **Non faite ici, et
  ce n'est pas une déviation puisqu'elle n'est pas faite** : l'exécuter serait *ajouter une tâche*
  au plan, ce que le protocole classe explicitement comme déviation. P7 est le plan qui construira
  massivement avec ces patrons — c'est là que la question doit être tranchée, dans sa spec.
- **Constat pour P8 — `backdrop:bg-black/60` reste tel quel, faute de token adapté.** Examiné en
  T-D1 : le contrat §2 n'a aucun rôle de voile ou de calque ; les deux candidats les plus proches
  (`bg`, `code`) sont **plus clairs que la page elle-même** en thème clair, ce qui supprimerait la
  seule fonction du voile. Dire « aucun token ne convient » est la bonne réponse ; en forcer un ne
  l'aurait pas été.
- **Accessibilité de la palette Shiki — constat mesuré, hors périmètre du contrat.** Poser
  `--color-code` sur les blocs de code déplace le contraste de **toutes** les couleurs de syntaxe.
  Mesuré site-wide sur `dist/` : en **clair** (`#fff` → `#EFF3F7`), trois couleurs passent juste
  sous AA — `#D73A49` 4.57→**4.10**, `#22863A` 4.63→**4.15**, `#6A737D` 4.82→**4.32** — et une
  quatrième, `#E36209`, échouait **déjà avant ce plan** (3.49→3.13). En **sombre**
  (`#24292e` → `#0A0C0F`), toutes s'améliorent : la pire, `#6A737D`, passe de **3.05 à 4.07** —
  autrement dit le thème sombre livrait une couleur de syntaxe sous AA avant ce plan, et ne le fait
  plus. **Channel adjudiqué en (b), constat et non déviation**, par un agent à qui la question a été
  posée en lui demandant explicitement de dire si le contrôleur rationalisait. Son raisonnement :
  R12 et V8 sont écrits comme des listes **fermées** de trois paires nommées, dont aucune n'est une
  couleur de syntaxe ; les palettes `github-light`/`github-dark` ne sont pas parmi les 23 tokens du
  contrat et vivent dans `astro.config.mjs`, que ce plan ne touche pas ; et lire « change ce que
  l'utilisateur observe » isolément ferait de chaque commit de ce plan une déviation, puisque le
  changement visuel **est** le livrable. **À reprendre quand un plan touchera `astro.config.mjs`** —
  la spec de P8 porte déjà « contrastes AA ».
- **Contrainte pour T-D1/T-D2 — un utilitaire Tailwind ne surcharge PAS une classe de patron, et
  l'échec est silencieux.** Vérifié deux fois par le relecteur de la Phase C : dans le CSS buildé
  (`@layer utilities` se referme avant que `.pill` soit défini) **et** en direct dans la page — un
  élément `class="pill bg-nav"` calcule `rgba(11,107,76,.1)` = `accentSoft`, pas `nav`. Un style
  hors layer bat n'importe quel layer, indépendamment de la spécificité. Pour changer un fond, un
  rayon ou une bordure portés par un patron, il faut **ne pas utiliser le patron**, pas le nuancer.
  **Porté en contrainte globale n°13 du plan d'impl.**
- **Piège de mesure pour T-D2 — ne jamais capturer juste après avoir basculé `dataset.theme`.**
  `transition-colors` est encore en cours d'animation et la capture rend les valeurs du thème
  **précédent**. L'implémenteur de la Phase C y a perdu du temps sur un faux diagnostic de « pilule
  blanche en sombre ». Poser `localStorage.theme` puis **recharger**.
- **Question ouverte pour P7, pas pour ce plan — la pilule de navigation n'a pas de classe de
  patron.** Le contrat §4 dit « quatre patrons et quatre seulement » et définit `.pill` comme la
  pilule d'**accent** ; §2 ne donne à la navigation qu'un token (`nav`), pas une classe. Les pilules
  de nav sont donc composées en utilitaires — lecture correcte du contrat tel qu'écrit, confirmée
  par le relecteur. Mais le patron « détail à onglets » du §5.2, que P7 doit livrer, a exactement la
  même forme : ce sera son second consommateur, et la question d'un cinquième patron se posera là.
- **Constat pour T-C1/T-C2 — le `padding` de `.pill` (`0.25em 0.75em`) est une valeur d'auteur.** Le
  contrat §4 autorise `.pill` à porter son padding mais ne donne aucun nombre. Rien ne consomme
  `.pill` à ce stade ; le header en est le premier consommateur, donc c'est là que la proportion se
  compare à la maquette.
- **V5 — un paragraphe de prose en mono dans `SearchDialog`.** Mesuré sur `/` au rendu buildé après
  T-A1 : sur les 15 `<p>` de la page, 14 sont conformes (`~/ whoami`, dates, compteurs de lecture —
  de la donnée machine). Le 15ᵉ, « Tapez au moins 2 caractères. », est une consigne en prose rendue
  en `font-mono`. **Reporté à T-D1** (`SearchDialog.astro` est dans sa liste de fichiers), critère
  V5. Antérieur à ce plan : la classe vient du Plan 5.
