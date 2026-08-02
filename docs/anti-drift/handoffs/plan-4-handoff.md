# Plan 4 — Handoff

**Date :** 2026-08-02
**Branche :** `plan-4-librairies-prompts-skills` (depuis `main` @ `eb9deee`, tag `milestone-plan-3`)
**Commits :** 43, **non poussés**
**État :** **prêt à shipper, deux actions utilisateur en attente.** Les 11 déviations sont **approuvées** ; il reste la publication du dépôt (R6) et T-D2 (R8). Ce n'est pas un échec — c'est l'état de succès prévu quand le travail est fait et que les derniers gestes ne sont pas ceux d'un agent.

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

## 2. Ce qui bloque encore le ship

**Les 11 déviations sont APPROUVÉES** (gate de ratification du 2026-08-02, « Je les approuve toutes »). Ce verrou est levé.

**Il reste deux actions, toutes deux du ressort de l'utilisateur :**

1. **Publier le dépôt `anti-drift-planning`** → débloque **R6**. Tant que `https://github.com/bendevcat/anti-drift-planning` répond **404**, le bloc « code source » de la fiche skill n'a rien à rendre. Dès qu'il répond **200** : l'entrée est amendée (`repoUrl` + `installCmd` réellement exécutable avec le vrai `git clone`), le rendu est re-vérifié, et R6 passe `Done`. Le motif d'URL resserré en D10 accepte déjà cette URL — vérifié.
2. **Faire T-D2** → débloque **R8**. Créer un prompt et un skill depuis `/admin`. Un agent ne peut ni fournir le PAT GitHub (secret personnel) ni actionner le sélecteur de dossier natif de la File System Access API — établi au Plan 2, reconfirmé au Plan 3.

**Tant que R6 et R8 ne sont pas `Done`, la Phase Z ne peut pas passer.** Ce n'est pas un blocage à contourner : c'est le verrou 4 qui fait son travail.

---

## 3. Décisions déjà rendues au gate du 2026-08-02

- **Les 11 déviations D01→D11 : `approved`.** Ratification groupée, phrase transcrite dans chaque entrée. Cinq d'entre elles (**D02, D03, D04, D07, D09**) sont des défauts du plan d'implémentation écrit par le contrôleur ; **D10** et **D11** viennent de constats de revue ; **aucune** ne vient d'un implémenteur ayant contourné la spec en silence.
- **R1 et R5 → `Deferred` au Plan 5**, appuyées sur la déviation approuvée **D05**, comme le linter l'exige. Ce qui est reporté est **la seule clause de comptage** (« ≥ 2 skills », « ≥ 2 cartes ») : tout le reste des deux critères est livré et prouvé. Le manque est du **contenu**, pas du code — un 2ᵉ skill s'ajoutera sans une ligne de code à changer.
- **R6 : l'utilisateur publie le dépôt**, plutôt que d'acter que la mesure binaire fait foi.

---

## 4. Marche à suivre pour T-D2

```bash
npm run dev
```

1. Ouvrir `http://localhost:4321/admin/index.html` dans **Chrome, Edge ou Brave** (File System Access API — ni Firefox ni Safari).
2. Se connecter via **« Sign In Using Access Token »**, ou **« Work with Local Repository »** en sélectionnant la racine du dépôt.
3. Créer **un prompt** : titre, description, format, texte du prompt, et surtout **« Skills liés » renseigné** — c'est le widget `relation` qu'on veut voir écrire un **id de dossier**, pas un titre (scénario D07 du Plan 3).
4. Créer **un skill** : titre, description, type, **« Prompts liés » renseigné**.
5. Publier les deux.

Le contrôleur vérifie ensuite, **sur le dépôt** : chemin `src/content/<coll>/<slug>/index.md`, frontmatter validant le schéma Zod (`astro build`), champs de relation contenant des **ids**, et champs optionnels vides **absents** du frontmatter. **R8 ne passera `Done` qu'après ces contrôles** — on ne marque pas `Done` ce qu'on n'a pas vu.

---

## 5. Reprise

`/anti-drift-planning:resume 4` régénère le prompt de reprise depuis le ledger.

**Sur PASS de la Phase Z uniquement** : script de release, tag **`milestone-plan-4`** et **`v0.4.0`** — et **non** `milestone-plan-3`, déjà posé sur `eb9deee` au Plan 3 (contradiction du prompt de session relevée au gate de pré-flight et tranchée par l'utilisateur).

---

## 6. Ce qui reste ouvert au-delà de ce plan

- **30 constats Minor reportés**, triés par la revue finale, listés dans `final-branch-review.md`. Trois d'entre eux décrivent **le même mode de panne que D10** sur le garde-fou CMS (`multiple: true` sur un `select`, sous-schéma `fields:` d'un `list`, et `slug`/`identifier_field`/`create` jamais assertionnés sur les 4 collections).
- **Réserve d'accessibilité non tranchable ici** : le nom accessible du bouton de copie reste figé sur son `aria-label` ; selon le lecteur d'écran, l'`aria-live` ajouté pourrait n'annoncer rien d'utile. **À vérifier avec VoiceOver ou NVDA réel** — un agent ne peut pas le mesurer.
- **Deux duplications assumées** : les jumeaux `lib/prompts.ts` / `lib/skills.ts` (comportement identique, vérifié ligne à ligne) et les deux scripts DOM de filtrage au-dessus d'un moteur unique.
