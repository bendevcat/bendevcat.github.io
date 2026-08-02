# Plan 4 — Handoff

**Date :** 2026-08-02
**Branche :** `plan-4-librairies-prompts-skills` (depuis `main` @ `eb9deee`, tag `milestone-plan-3`)
**Commits :** 40, **non poussés**
**État :** **prêt à shipper, décisions en attente.** Ce n'est pas un échec — c'est l'état de succès prévu par la méthodologie quand le travail est fait et que le gate n'a pas encore tranché.

---

## 1. Ce qui est livré et prouvé

| Critère | Statut | Ce qui l'établit |
|---|---|---|
| R1 collections + contenu réel | **In progress** | 2 prompts réels ✅ · **1 seul skill** au lieu de ≥ 2 (**D05**) |
| R2 `/prompts` grille + filtre | **Done** | filtrage vérifié **par comptage** dans les deux sens, dans un vrai navigateur |
| R3 copie 1 clic | **Done** | texte transmis **identique au bloc rendu** (10 579 car.), sans le libellé du bouton ; « Copié ! » puis retour ; chemin d'échec observé réellement |
| R4 fiche vs guide | **Done** | fiche = bloc rendu · guide = **zéro `<pre>`** |
| R5 `/skills` grille + filtre | **In progress** | filtre prouvé sur l'ensemble vide · **1 carte** au lieu de ≥ 2 (**D05**) |
| R6 page skill | **In progress** | mesure binaire **entièrement satisfaite** ; l'intitulé nomme « + repo » et ce bloc n'a rien à rendre (dépôt en 404) — **arbitrage laissé au gate** |
| R7 relation `skills ↔ prompts` | **Done** | boucle skill→prompt→skill en **200**, aucun `undefined`, **et l'échec prouvé** (id cassé → build en exit 1) |
| R8 CMS | **In progress** | config livrée, testée, smoke `/admin` propre — **manque T-D2, geste utilisateur** |
| R9 dark + 375px | **Done** | écart **0 px** sur les 4 pages, en dark **et** en light |

**Mesures finales :** `npm test` **93/93 (9 fichiers)** · `npx astro check` **0 error / 0 warning** (66 hints) · `npx astro build` **16 pages** · lint anti-drift **13/13, exit 0**.

**Tâches :** T-A1, T-A2, T-B1, T-B2, T-B3, T-C1, T-C2, T-D1 → **Done** (8/9). T-D2 → **en attente de l'utilisateur**. Phase Z → **non lancée** (elle échouerait, voir §2).

---

## 2. Ce qui bloque le ship, et pourquoi c'est normal

**11 déviations, toutes `pending-user`.** `/anti-drift-planning:verify 4` échoue sur la moindre entrée non tranchée — c'est le verrou 2 qui fait son travail, pas un incident. **Aucun tag ne sera posé tant qu'elles ne sont pas décidées.**

**T-D2 non faite** — création réelle d'un prompt et d'un skill via `/admin`. Un agent ne peut ni fournir le PAT GitHub (secret personnel) ni actionner le sélecteur de dossier natif de la File System Access API. Établi au Plan 2, reconfirmé au Plan 3.

---

## 3. Les 11 décisions attendues

Chaque entrée est détaillée dans `plan-4-deviations.md`. Résumé, de la plus lourde à la plus légère :

| # | Sujet | Ce que ça change | Réversibilité |
|---|---|---|---|
| **D05** | **1 seul skill au lieu de ≥ 2** | **R1 et R5 ne seront pas satisfaits.** Choix explicite de l'utilisateur : aucun 2ᵉ skill ne lui appartenait et n'était publiable (les autres sont sous l'org privée `sxd-platform`, `author: Sixense Digital`, `license: UNLICENSED`) | cheap |
| **D10** | **4ᵉ occurrence du mode de panne « le CMS accepte, le build casse après »** | Motif d'URL resserré sur **3 champs**, dont 2 du Plan 3. **Effet observable : le CMS refuse désormais des URL qu'il acceptait** — toutes invalides pour Zod | cheap |
| **D07** | Bloc de prompt hors `.prose` | **2 461 px de débordement horizontal**, R9 cassée, avec build/check/93 tests **au vert** | cheap |
| **D11** | Vague de correction de la revue finale | 2 Important transverses + 6 Minor triés « avant merge » | cheap |
| **D09** | Ordre des entrées liées | Composition des helpers testés ; entrées liées en A→Z au lieu de l'ordre frontmatter | cheap |
| **D03** | Filtrage `draft` rendu testable | Comportement exigé par le plan, couvert par **aucun** test | cheap |
| **D08** | Annonce de l'échec de copie + test manquant | `aria-live` sur le bouton ; branche non couverte | cheap |
| **D06** | Garde de type dans `matchesFacets` | Défaut non atteignable aujourd'hui, mais le module était livré tel quel à T-C1 | cheap |
| **D01** | Fichier hors liste de T-A1 | 1 ligne d'import ; sans elle, 2 tests de la baseline cassaient | cheap |
| **D02** | Chiffres de baseline faux dans le plan | 9 pages → 11 · 52 tests → 56 · message de WARN erroné. **Récidive tracée** | cheap |
| **D04** | JSDoc réécrit au lieu d'être déplacé | Perte de la citation du code d'Astro et du locus du symptôme. **`Caught late: yes`** | cheap |

**Cinq d'entre elles — D02, D03, D04, D07, D09 — sont des défauts du plan d'implémentation, écrit par le contrôleur.** D10 et D11 viennent de constats de revue. Aucune ne vient d'un implémenteur ayant contourné la spec en silence.

---

## 4. Ce que l'utilisateur doit faire

1. **Ratifier ou rejeter les 11 déviations** (`approved` / `rejected` — seuls ses mots comptent).
2. **Trancher R6** : soit publier `https://github.com/bendevcat/anti-drift-planning` (encore **404**, re-vérifié plusieurs fois), auquel cas l'entrée du skill est amendée (`repoUrl` + `installCmd` réellement exécutable) et R6 passe `Done` sans réserve ; soit acter que la mesure binaire fait foi.
3. **Faire T-D2** : créer un prompt et un skill depuis `/admin` (Chrome/Edge/Brave, `Sign In Using Access Token` ou dépôt local), en renseignant les champs de relation. Le contrôleur vérifie ensuite chemin, frontmatter, ids et omission des champs vides.
4. **Décider du sort de R1/R5** si aucun 2ᵉ skill n'est publié : `Deferred` (reporté au Plan 5) ou `Cut`. **Le linter exigera une déviation `approved`** pour accepter l'un ou l'autre.

---

## 5. Reprise

`/anti-drift-planning:resume 4` régénère le prompt de reprise depuis le ledger.

**Sur PASS de la Phase Z uniquement** : script de release, tag **`milestone-plan-4`** et **`v0.4.0`** — et **non** `milestone-plan-3`, déjà posé sur `eb9deee` au Plan 3 (contradiction du prompt de session relevée au gate de pré-flight et tranchée par l'utilisateur).

---

## 6. Ce qui reste ouvert au-delà de ce plan

- **30 constats Minor reportés**, triés par la revue finale, listés dans `final-branch-review.md`. Trois d'entre eux décrivent **le même mode de panne que D10** sur le garde-fou CMS (`multiple: true` sur un `select`, sous-schéma `fields:` d'un `list`, et `slug`/`identifier_field`/`create` jamais assertionnés sur les 4 collections).
- **Réserve d'accessibilité non tranchable ici** : le nom accessible du bouton de copie reste figé sur son `aria-label` ; selon le lecteur d'écran, l'`aria-live` ajouté pourrait n'annoncer rien d'utile. **À vérifier avec VoiceOver ou NVDA réel** — un agent ne peut pas le mesurer.
- **Deux duplications assumées** : les jumeaux `lib/prompts.ts` / `lib/skills.ts` (comportement identique, vérifié ligne à ligne) et les deux scripts DOM de filtrage au-dessus d'un moteur unique.
