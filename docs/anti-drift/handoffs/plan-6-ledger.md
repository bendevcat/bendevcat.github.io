# Plan 6 — Scope Ledger

Last updated: 2026-09-13 (T-A1 en cours)
Last updated by: main (contrôleur SDD)

## Requirements (extracted from spec §3 Success criteria)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| R1 | Les 23 tokens existent dans les deux thèmes — `global.css` définit les 23 noms de `§2` du contrat visuel sous `@theme` **ET** les 23 sous `:root[data-theme="dark"]`, aux valeurs exactes du tableau | Pending | Couvert par T-A2. Nommage arrêté au pré-flight : les 23 noms sont repris **verbatim** (22 en `--color-<nom>`, 1 en `--shadow` nu). Fait mesuré sur Tailwind v4.3.3 : une variable `@theme` en camelCase produit bien son utilitaire (`--color-accentSoft` → `.bg-accentSoft`) — aucune transliteration nécessaire. |
| R2 | Nebula Sans (ou sa substitution actée) est servie — le texte courant de `/` est rendu dans la police retenue **ET** la décision `§8.1` est tranchée et consignée dans la spec de design | In progress | Couvert par T-A1. **Bloqueur tranché par l'utilisateur au gate de pré-flight du 2026-09-13 : « Embarquer Nebula Sans (OFL-1.1) ».** Le fait qui l'a établi : le `LICENSE` de `@fontsource/nebula-sans@5.3.0` porte « Copyright (c) 2024, Nebula Entertainment & Broadcasting LLC (nebula.tv) », dérivée de Source Sans (Adobe), sous SIL OFL-1.1 — licence libre autorisant l'embarquement. La prémisse « police de marque d'Anthropic » du §8.1 est fausse et est corrigée en T-A1. |
| R3 | Space Grotesk et Inter sont retirés — `grep` ne renvoie aucune occurrence **ET** `npm run build` passe | In progress | Couvert par T-A1. Le grep littéral de la spec (`grep -ri "space-grotesk\|inter"`) produit des faux positifs sur les mots français (`interne`, `interactif`) : la mesure appliquée vise la **dépendance et la famille CSS**, pas la sous-chaîne. |
| R4 | Les 4 classes de patrons existent — `global.css` définit `.card`, `.card-inner`, `.panel`, `.pill` **ET** aucune ne contient `display`, `gap`, `grid` ou `flex` | Pending | Couvert par T-B1. |
| R5 | Header : logo en pilule — `bencat_` dans une pilule à bordure avec son glyphe à 3 barres, menant à `/` | Pending | Couvert par T-C1. |
| R6 | Header : nav en pilules à icônes — les 5 items portent leur icône **ET** l'item de la route courante est distinct (fond + graisse), y compris sur une route fille | Pending | Couvert par T-C1. Mesure retenue : **exactement un** `aria-current="page"` par route, vérifié sur route mère **et** fille. |
| R7 | Header : barre d'actions ronde — 3 boutons ronds (recherche, GitHub, thème) dans un conteneur en pilule ; la recherche ouvre le `SearchDialog` existant, le thème bascule | Pending | Couvert par T-C2. Contrats à préserver : `data-search-open`, `id="theme-toggle"`. |
| R8 | Thème clair complet et sans bleu — les 23 valeurs claires s'appliquent **ET** aucun `#7DD3FC` (ni `rgba(125,211,252…`) sous `[data-theme="light"]` | Pending | Couvert par T-A2. |
| R9 | `.prose` accordé — titres, liens, code inline, blocs, citations, listes et tableaux aux nouveaux tokens, dans les **deux** thèmes, sans débordement horizontal | Pending | Couvert par T-B2. Le filet 375 px hérité du Plan 1 (`overflow-wrap`, `overflow-x:auto` sur `pre`/`table`) est à **conserver**, pas à réécrire. |
| R10 | Aucune page n'a changé de structure — mêmes blocs, même ordre, mêmes emplacements qu'en `v1.0.0`. **Header exclu.** | Pending | Couvert par T-D1 et T-D2. Preuve mécanique prévue : `git diff v1.0.0` filtré sur les lignes ajoutées hors attribut `class`. |
| R11 | 375 px sans débordement — sur les 10 routes, `document.documentElement.scrollWidth <= innerWidth` | Pending | Couvert par T-C2 et T-D2. Les **10 routes** = celles du prototype (contrat §1). Les 4 autres routes du site (`/transparence-ia`, `/tags`, `/tags/[tag]`, `/404`) sont contrôlées en non-régression mais leur audit 375 px / AA est le but explicite de P8 (contrat §7). |
| R12 | Contrastes AA — `body` sur `bg`, `muted` sur `surface`, `accent` sur `accentSoft` ≥ 4.5:1 dans les deux thèmes | Pending | Couvert par T-A2 (calcul) et T-D2 (contrôle au rendu). Calcul WCAG, pas à l'œil ; `accentSoft` étant translucide, composé sur son fond réel avant calcul. |

## Status legend
- **Done** — verified, criteria passed (link to commit SHA)
- **In progress** — actively being worked
- **Pending** — not yet started
- **Deferred** — moved to a later plan (must have an approved deviation)
- **Cut** — removed from scope (must have an approved deviation)

## Task index → requirement(s) covered

| Task | Phase | Covers | Status |
|---|---|---|---|
| A1 | A | R2, R3 (+ V7) — polices : Nebula Sans entre, Space Grotesk et Inter sortent | In progress |
| A2 | A | R1, R8, R12 (+ V1, V4, V8) — les 23 tokens dans les 2 thèmes + re-câblage mécanique des 283 classes | Pending |
| B1 | B | R4 (+ V6) — `.card`, `.card-inner`, `.panel`, `.pill` | Pending |
| B2 | B | R9 (+ V5, V6) — `.prose` accordé | Pending |
| C1 | C | R5, R6 (+ E1) — logo en pilule, nav en pilules à icônes, actif par famille de routes | Pending |
| C2 | C | R7, R11 header (+ E2) — barre d'actions ronde, responsive 375 px | Pending |
| D1 | D | R10 composants (+ V2, V3, V6) — les 8 composants sur les tokens v2 | Pending |
| D2 | D | R10, R11, R12 (+ V5) — parcours 10 routes × 2 thèmes × 3 largeurs | Pending |
| Z1 | Z | Audit `/anti-drift-planning:verify 6` (couverture R1–R12 + V1–V8) | Pending |

## Critères du contrat visuel (V1–V8, §10) — rattachement

La méthodologie §4.2 les rend applicables en Phase Z de chaque plan de la vague 2. Ils ne sont pas
dans la spec §3 : les rattacher explicitement évite qu'ils surgissent en Phase Z.

| V | Critère | Tâche | Statut |
|---|---|---|---|
| V1 | Les 23 tokens dans les 2 thèmes | A2 | Pending |
| V2 | Aucun saut de niveau de surface | D1 | Pending |
| V3 | Grammaire des accents respectée en sombre | D1 | Pending |
| V4 | Thème clair sans bleu | A2 | Pending |
| V5 | Mono réservé à la donnée machine | B2, D2 | Pending |
| V6 | Rayons ∈ {9, 10, 14, 20, 999}px | B1, B2, D1 | Pending |
| V7 | Space Grotesk et Inter retirés | A1 | In progress |
| V8 | Contrastes AA | A2 | Pending |

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
  `<sha T-A1>`.
- **plan defect: contrat §3.2 s'intitule « quatre valeurs, pas cinq » puis liste cinq rayons, et V6
  en exige cinq** — corrigé en `<sha T-A1>`.
- **plan defect: contrat §8.1 affirme que Nebula Sans est « la police de marque d'Anthropic » ; le
  `LICENSE` du paquet que le prototype sert (`@fontsource/nebula-sans@5.3.0`) porte « Copyright (c)
  2024, Nebula Entertainment & Broadcasting LLC (nebula.tv) », dérivée de Source Sans (Adobe), sous
  SIL OFL-1.1** — corrigé en `<sha T-A1>`, en même temps que la consignation de la décision §8.1.
