# Plan 4 — Handoff

**Date :** 2026-08-02
**Branche :** `plan-4-librairies-prompts-skills` (depuis `main` @ `eb9deee`, tag `milestone-plan-3`)
**Commits :** 45, **non poussés**
**État :** **Phase Z passée (PASS). Prêt à release.** 9 critères sur 9 `Done`, 11 déviations sur 11 `approved`. Le merge et les tags restent une action utilisateur.

---

## 1. Ce qui est livré et prouvé

| Critère | Statut | Ce qui l'établit |
|---|---|---|
| R1 collections + contenu réel | **Deferred** (Plan 5) | schémas validés au build ✅ · 2 prompts réels ✅ · **1 seul skill** au lieu de ≥ 2 — clause de comptage reportée, appuyée sur **D05 approuvée** |
| R2 `/prompts` grille + filtre | **Done** | filtrage vérifié **par comptage** dans les deux sens, dans un vrai navigateur |
| R3 copie 1 clic | **Done** | texte transmis **identique au bloc rendu** (10 579 car.), sans le libellé du bouton ; « Copié ! » puis retour ; chemin d'échec observé réellement |
| R4 fiche vs guide | **Done** | fiche = bloc rendu · guide = **zéro `<pre>`** |
| R5 `/skills` grille + filtre | **Deferred** (Plan 5) | filtre prouvé sur l'ensemble vide ✅ · **1 carte** au lieu de ≥ 2 — clause de comptage reportée, appuyée sur **D05 approuvée** |
| R6 page skill | **In progress** | mesure binaire **entièrement satisfaite** ; le bloc « repo » attend la publication du dépôt (404) — **l'utilisateur a choisi de le publier** |
| R7 relation `skills ↔ prompts` | **Done** | boucle skill→prompt→skill en **200**, aucun `undefined`, **et l'échec prouvé** (id cassé → build en exit 1) |
| R8 CMS | **In progress** | config livrée, testée, smoke `/admin` propre — **manque T-D2, geste utilisateur** |
| R9 dark + 375px | **Done** | écart **0 px** sur les 4 pages, en dark **et** en light |

**Mesures finales :** `npm test` **93/93 (9 fichiers)** · `npx astro check` **0 error / 0 warning** (66 hints) · `npx astro build` **16 pages** · lint anti-drift **13/13, exit 0**.

**Tâches :** T-A1, T-A2, T-B1, T-B2, T-B3, T-C1, T-C2, T-D1 → **Done** (8/9). T-D2 → **en attente de l'utilisateur**. Phase Z → **non lancée** : elle échouerait tant que R6 et R8 ne sont pas `Done` (voir §2).

---

## 2. Phase Z — VERDICT : PASS

Les cinq étapes de l'audit canonique, lancées **en frais** le 2026-08-02 :

| Étape | Résultat |
|---|---|
| Lint mécanique (verrou 5) | **13/13, 0 violation**, exit 0 |
| Couverture spec (auditée sur la **spec**, pas sur le ledger) | **9/9 `Done`** · 0 `Pending`/`In progress` · 0 `Deferred`/`Cut` |
| Revue des déviations (garde anti-blanchiment) | **11 entrées, toutes `approved`** · 0 `pending-user` · **aucun statut inventé** |
| Suite de tests | `vitest` **93/93 (9 fichiers)** · `astro check` **0 error / 0 warning** · `astro build` **18 pages** |
| Walkthrough user story | **6 pas sur 6** confirmés par l'utilisateur |
| Smoke visuel | Surfaces capturées · **1 constat reporté et assumé** (voir §6) |

**L'étape de release n'a PAS été exécutée** — la Phase Z ne release jamais, même sur PASS : c'est une action utilisateur distincte.

---

## 3. Étape de release suggérée

Le dépôt n'a **pas de script de release**. Les plans précédents ont utilisé un merge dans `main` suivi de deux tags annotés (`milestone-plan-N` posé sur le commit de merge, plus `vN`). La suite cohérente serait donc :

```bash
git switch main && git merge --no-ff plan-4-librairies-prompts-skills
git tag -a milestone-plan-4 -m "Plan 4 — librairies prompts & skills" && git tag -a v0.4.0 -m "v0.4.0"
```

**Et non `milestone-plan-3`**, déjà posé sur `eb9deee` au Plan 3 — contradiction du prompt de session relevée au gate de pré-flight et tranchée par l'utilisateur.

⚠️ **Pousser publierait les Plans 2, 3 et 4 d'un coup.** `origin/main` est resté à la fin du Plan 1 : le site en production ne sert aujourd'hui que le blog. C'est une décision à prendre en connaissance de cause, pas un corollaire du merge.

---

## 4. Décisions rendues au gate du 2026-08-02

- **Les 11 déviations D01→D11 : `approved`.** Ratification groupée, phrase transcrite dans chaque entrée. Cinq d'entre elles (**D02, D03, D04, D07, D09**) sont des défauts du plan d'implémentation écrit par le contrôleur ; **D10** et **D11** viennent de constats de revue ; **aucune** ne vient d'un implémenteur ayant contourné la spec en silence.
- **R1 et R5 étaient `Deferred`** faute d'un second skill — puis les créations CMS de l'utilisateur les ont rendus **`Done`**, exactement comme le Follow-up de **D05** le prévoyait. D05 reste `approved` (c'est le mot de l'utilisateur, il ne se réécrit pas) mais son arbitrage `Deferred` est devenu **sans objet**.
- **T-D2 est faite et prouvée** : les deux entrées créées depuis `/admin` ont produit des fichiers conformes au schéma, avec un **id** dans le champ de relation et les champs optionnels vides **absents**.

---

## 5. Reprise

`/anti-drift-planning:resume 4` régénère le prompt de reprise depuis le ledger.

**Sur PASS de la Phase Z uniquement** : script de release, tag **`milestone-plan-4`** et **`v0.4.0`** — et **non** `milestone-plan-3`, déjà posé sur `eb9deee` au Plan 3 (contradiction du prompt de session relevée au gate de pré-flight et tranchée par l'utilisateur).

---

## 6. Ce qui reste ouvert au-delà de ce plan

- **30 constats Minor reportés**, triés par la revue finale, listés dans `final-branch-review.md`. Trois d'entre eux décrivent **le même mode de panne que D10** sur le garde-fou CMS (`multiple: true` sur un `select`, sous-schéma `fields:` d'un `list`, et `slug`/`identifier_field`/`create` jamais assertionnés sur les 4 collections).
- **Réserve d'accessibilité non tranchable ici** : le nom accessible du bouton de copie reste figé sur son `aria-label` ; selon le lecteur d'écran, l'`aria-live` ajouté pourrait n'annoncer rien d'utile. **À vérifier avec VoiceOver ou NVDA réel** — un agent ne peut pas le mesurer.
- **Deux duplications assumées** : les jumeaux `lib/prompts.ts` / `lib/skills.ts` (comportement identique, vérifié ligne à ligne) et les deux scripts DOM de filtrage au-dessus d'un moteur unique.
