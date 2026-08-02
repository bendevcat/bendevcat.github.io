# Plan 4 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut. Un statut assorti d'un commentaire (« approved, mais… ») n'est pas un statut valide : la Phase Z le ré-audite comme `pending-user`._

_Les entrées les plus récentes sont ajoutées **en haut**, juste sous ce bloc._

---

<!--
TEMPLATE D'ENTRÉE — copier ce bloc, le remplir, le placer en haut de la liste.
Numérotation continue : D01, D02, … (jamais réutilisée, même après un rejet).

## D0N — <titre court : ce qui change, en une ligne>

- **Date:** YYYY-MM-DD
- **Task affected:** T-<x> (+ les fichiers ou artefacts touchés)
- **Original plan:** ce que la spec ou le plan d'impl prescrit, cité précisément
  (numéro de ligne, nom de champ, valeur exacte).
- **Deviation taken:** ce qui est fait à la place, aussi précisément.
- **Reason:** le fait établi qui l'impose — sur la SOURCE, pas sur la doc
  (leçon du Plan 2 : trois affirmations de la doc Sveltia se sont révélées
  fausses ; seule la lecture du bundle épinglé a tranché). Si c'est un constat
  de revue, dire comment il a été reproduit.
- **Reversibility:** `cheap` (au plus une tâche de rework si l'utilisateur
  rejette → on peut procéder pendant que la décision est en attente) ou
  `expensive` (rework multi-tâches, données, ou quoi que ce soit de publié →
  NE PAS procéder ; basculer sur une tâche indépendante, ou écrire le handoff).
- **Caught late:** `no` si loggé avant exécution ; `yes` si on s'est surpris à
  avoir déjà dévié — dans ce cas le dire franchement, ne pas maquiller.
- **Status:** pending-user
- **User decision:** _(vide jusqu'à une décision explicite de l'utilisateur —
  seul lui écrit `approved` / `rejected`, et la phrase qui l'a établie est
  transcrite ici)_
- **Follow-up:** ce qu'il faut faire si l'entrée est rejetée (le chemin de
  retour, concrètement).
-->

## D04 — JSDoc d'`assertEntriesResolved` réécrit au lieu d'être déplacé (le Step 4 se contredit lui-même)

- **Date:** 2026-08-02
- **Task affected:** T-A1 — `src/lib/references.ts`
- **Original plan:** le Step 4 de T-A1 se contredit. Sa **prose** dit : créer `src/lib/references.ts` « avec le **corps exact** actuellement dans `src/lib/projects.ts:39-85` (JSDoc compris), en adaptant seulement la dernière phrase du JSDoc qui parle de T-B3/T-B4 ». Le **bloc de code** qui suit immédiatement fournit ensuite un JSDoc **condensé**, réécrit d'un bout à l'autre. Les deux ne peuvent pas être vrais en même temps.
- **Deviation taken:** ce qui est parti dans `b316b45` est le **bloc de code** — l'implémenteur a transcrit littéralement, comme le brief le lui ordonnait par ailleurs (« les valeurs exactes se transcrivent verbatim »). Correction retenue : **restaurer le JSDoc d'origine** et n'en adapter que la dernière phrase, c'est-à-dire faire ce que la prose annonçait et ce que « pur déplacement » signifie.
- **Reason:** constat **I2** de la revue de tâche, vérifié sur la source. Le JSDoc d'origine porte deux choses que la version condensée a perdues : (1) la **citation du code d'Astro** (`createGetEntry` dans `astro/dist/content/runtime.js` fait `console.warn(…); return;`) — c'est le fait établi qui justifie l'existence même du garde-fou, et sans lui la prochaine personne qui lit la fonction n'a aucune raison de la croire ; (2) le **locus exact** du symptôme (`sortAndFilter`, `src/lib/posts.ts:5`) — c'est ce qui rend un `TypeError` diagnosticable. Le corps **exécutable** de la fonction, lui, est bien byte-identique : `diff` entre `git show a4eb77d:src/lib/projects.ts` et `src/lib/references.ts` sur la portée de la fonction est **vide** (vérifié par le contrôleur, puis re-vérifié indépendamment par le relecteur).
- **Reversibility:** cheap (un bloc de commentaire ; aucun comportement, aucun test).
- **Caught late:** **yes.** L'implémenteur avait signalé la contradiction prose/bloc-de-code dans son message final ; le contrôleur a écrit D01 et D02 au tour suivant **sans la logger**, et ne l'a reprise qu'après que le relecteur l'a resortie en I2. C'est exactement le retard que ce protocole existe pour rendre visible : reporté tel quel plutôt que réécrit.
- **Status:** pending-user
- **User decision:**
- **Follow-up:** si rejeté, conserver le JSDoc condensé tel qu'il est parti dans `b316b45` et corriger la prose du Step 4 du plan, qui serait alors la partie fausse.

---

## D03 — Filtrage `draft` rendu testable et couvert par des tests (le plan l'exige sans le tester)

- **Date:** 2026-08-02
- **Task affected:** T-A1 — `src/lib/prompts.ts`, `src/lib/skills.ts`, `src/lib/prompts.test.ts`, `src/lib/skills.test.ts`
- **Original plan:** le plan **exige** le comportement — section « Décisions d'implémentation tranchées par ce plan » : « **Entrées `draft`** (T-A1) : `getSortedPrompts()` / `getSortedSkills()` écartent `draft: true` […] Conséquence : une entrée `draft` n'a **pas de route publique** et ne doit pas être liée depuis une autre ». Mais la **liste de tests du Step 1** que le plan fournit verbatim ne contient **aucun** cas de filtrage `draft`, et le code du Step 5 inline le `.filter()` dans la fonction `async` qui appelle `getCollection` — donc dans la seule partie du module qu'un test unitaire ne peut pas atteindre.
- **Deviation taken:** extraire le filtrage dans une fonction **pure** exportée, sur le modèle exact de `sortAndFilter` (`src/lib/posts.ts:3-7`), et ajouter les cas de test correspondants aux deux fichiers de test. `getSortedPrompts()` / `getSortedSkills()` gardent leur signature et leur comportement observable ; c'est un changement de **découpage interne** plus des tests. Le nom exact de la fonction extraite est laissé à l'implémenteur, à condition qu'il dise ce qu'elle fait.
- **Reason:** constat **I1** de la revue de tâche. Le comportement est exigé par le plan, dépend d'une clause que **T-C2 utilise** (« les prompts `draft` sont écartés APRÈS résolution — les lier produirait un 404 »), et **rien ne le vérifie**. Un comportement exigé, non testé, et sur lequel une tâche ultérieure s'appuie, est précisément ce qui disparaît en silence entre deux sessions. Le relecteur a aussi noté que la forme inlinée s'écarte du pattern établi du repo (`posts.ts`), que les contraintes globales demandent de suivre.
- **Reversibility:** cheap (une extraction de fonction dans deux modules et des tests ; aucun comportement observable ne change).
- **Caught late:** no (loggé avant la correction).
- **Status:** pending-user
- **User decision:**
- **Follow-up:** si rejeté, remettre le `.filter()` inline et retirer les tests — le filtrage `draft` redevient alors un comportement exigé par le plan et vérifié par rien.

---

## D02 — Correction d'un chiffre de baseline faux dans les contraintes globales du plan

- **Date:** 2026-08-02
- **Task affected:** T-A1 (constat), et **toutes** les tâches suivantes — la ligne corrigée est une contrainte globale du plan d'impl, pas une ligne de tâche.
- **Original plan:** la section « Global Constraints » du plan d'impl affirme comme **baseline mesurée** : « `npx astro build` → **9 pages** ». Chaque tâche s'en sert comme point de comparaison pour détecter une régression.
- **Deviation taken:** corriger la valeur en **11 pages**, et ajuster les attentes de page des Steps qui en dérivent (T-A1 Step 7, T-A2 Step 5 et Step 6 : « 9 pages » → « 11 pages » ; T-B1 Step 3 et T-B2 Step 9 : « 10 pages » → « 12 pages »). Les chiffres relatifs (« +1 page », « +N pages ») restent valides. **Second point, même nature :** le plan prédisait le message `[WARN] [glob-loader] No files found matching '**/index.{md,mdx}' in …` pour les collections vides ; le message réellement émis est `[WARN] [glob-loader] The base directory "…/src/content/prompts/" does not exist.` — parce que les **dossiers eux-mêmes** n'existent pas avant T-A2, cas différent de « dossier présent mais vide ». Corrigé aux mêmes endroits.
- **Reason:** le chiffre était **faux**. Je ne l'avais pas mesuré : je l'avais recopié du ledger du Plan 3, où « 9 pages » date de T-B1 — **avant** que T-B3 n'ajoute les routes `/projets/<slug>`. L'implémenteur de T-A1 l'a relevé et a mesuré 11 pages avant comme après sa tâche. **Re-vérifié indépendamment par le contrôleur** : `npx astro build` produit 12 fichiers HTML dans `dist/`, dont `dist/admin/index.html` qui est un asset statique de `public/` et non une page Astro → **11 pages Astro**, conforme au décompte attendu (1 home + 1 index blog + 6 articles + 1 index projets + 2 fiches projets). Laisser « 9 » aurait fait passer chaque tâche suivante pour une régression de +2 pages, ou pire, aurait entraîné leur ajustement silencieux.
- **Reversibility:** cheap (des chiffres attendus dans un document de plan ; aucun code, aucun comportement).
- **Caught late:** no pour l'exécution (rien n'a été construit sur le chiffre faux), **mais l'entrée est écrite après le commit `b316b45`** : le constat est venu du rapport de l'implémenteur, qui ne peut pas écrire dans ce log. Séquence exacte reportée telle quelle.
- **Status:** pending-user
- **User decision:**
- **Follow-up:** si rejeté, restaurer « 9 pages » dans le plan — ce qui revient à demander aux tâches suivantes de se comparer à un chiffre que le dépôt contredit.

---

## D01 — Modification d'un fichier hors de la liste de T-A1 (`src/lib/projects.test.ts`)

- **Date:** 2026-08-02
- **Task affected:** T-A1
- **Original plan:** la section **Files** de T-A1 énumère exactement les fichiers touchés : `src/content.config.ts`, `src/lib/references.ts` (créé), `src/lib/projects.ts`, `src/pages/projets/[...slug].astro`, `src/pages/blog/[...slug].astro`, plus les 4 fichiers créés de `prompts`/`skills`. **`src/lib/projects.test.ts` n'y figure pas.** Le Step 4 ne prescrit que trois redirections d'import (les deux pages + la suppression dans `projects.ts`), et le Step 8 attend **3 occurrences** de `assertEntriesResolved` au `grep`.
- **Deviation taken:** modifier **une ligne** de `src/lib/projects.test.ts` — `import { assertEntriesResolved } from './projects'` devient `from './references'`. **Aucun corps de test n'est touché**, aucune assertion n'est ajoutée, retirée ni modifiée.
- **Reason:** le plan a raté un consommateur. `src/lib/projects.test.ts` importe `assertEntriesResolved` **directement** (2 tests de la baseline, lignes 64-85 : le cas nominal et le cas de la référence introuvable). Déplacer la fonction sans redirriger cet import casse ces 2 tests — c'est-à-dire une **régression de la baseline**, que les contraintes globales interdisent explicitement. Il n'existe pas de version de T-A1 qui déplace la fonction ET laisse ce fichier intact. **Vérifié indépendamment par le contrôleur** : `grep -rn assertEntriesResolved src/` montre bien 3 sites d'usage réels (la définition dans `references.ts` + les 2 pages) **plus** le fichier de test, et `diff` entre l'ancien corps de fonction (`git show a4eb77d:src/lib/projects.ts`) et le nouveau (`src/lib/references.ts`) est **vide** — le déplacement est bien pur.
  Conséquence mécanique : le Step 8 du plan attend 3 occurrences, il y en a **4**. C'est le même constat, pas un second.
- **Reversibility:** cheap (une ligne d'import dans un fichier de test ; le chemin de retour est de ne pas déplacer la fonction du tout, soit une seule tâche de rework).
- **Caught late:** no — l'implémenteur l'a relevé au Step 6, **avant** de committer, et l'a remonté au contrôleur au lieu de le glisser en silence. L'entrée est toutefois **écrite après** le commit `b316b45` : un subagent n'écrit pas dans ce log, il rapporte au contrôleur qui l'écrit à la première occasion.
- **Status:** pending-user
- **User decision:**
- **Follow-up:** si rejeté, annuler le déplacement de `assertEntriesResolved` : la fonction retourne dans `src/lib/projects.ts`, `src/lib/references.ts` est supprimé, et les 4 imports (2 pages + le test + les futures pages du Plan 4) pointent de nouveau vers `projects.ts`.
