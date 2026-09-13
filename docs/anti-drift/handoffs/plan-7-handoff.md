# Plan 7 — Handoff · exécution arrêtée au budget de décisions

**Date :** 2026-09-13
**Branche :** `plan-7-listes-filtrables` (16 commits au-dessus de `main`)
**Motif de l'arrêt :** **4 entrées `pending-user`** au journal de déviations. Le protocole impose
de s'arrêter au-delà de trois — « le plan génère des décisions plus vite qu'un humain ne peut
sincèrement en prendre ». Continuer produirait des approbations en bloc, qui enregistrent des
décisions qui n'ont pas eu lieu : pire que pas de gate du tout.

**Ce n'est pas un échec.** Les 12 critères de la spec §3 sont `Done`. Ce qui reste est une
**décision**, pas du travail.

---

## 1. Où en est le plan

| Phase | Tâches | État |
|---|---|---|
| A — désarmer le piège de cascade | A1 | ✅ close |
| B — résoudre le patron une fois | B1, B2, B3 | ✅ close |
| C — répliquer sur 3 familles | C1, C2 | ✅ close |
| D — 375 px et deux thèmes | D1 | ✅ close, **aucun commit** (rien n'était à corriger) |
| **Z — vérification** | Z1 | ⛔ **non lancée** — échouerait par construction |

**Les 12 critères de la spec §3 sont `Done`.** Trois portent une réserve nommée : R2 (D01),
R7 et R9 (G-02 et D03).

**Les critères du contrat visuel** : V3, V5, V6, V8 `Done` sur ce plan ; V1, V4, V7 acquis au
Plan 6 ; **V2 en échec** (D04).

## 2. Les quatre décisions attendues

Aucune n'est technique : chacune demande un arbitrage que seul l'utilisateur peut rendre.

| # | Objet | Réversibilité | Ce qui se passe si approuvée |
|---|---|---|---|
| **D01** | R2 mesuré en **différentiel** et non en absolu — la référence `milestone-plan-6` a bougé pour une raison étrangère au plan (un article `draft` y était encore construit) | `cheap` | R2 reste `Done` ; la Phase Z peut le valider |
| **D02** | **L'accueil change d'apparence** (rayon des vignettes 14 px → 10 px) alors que la spec le gèle pour P9 — `ArticleCard` est partagé | `cheap` | Le nouveau rendu reste ; P9 trouvera l'accueil déjà aligné |
| **D03** | Sur `/skills`, **R6 n'est pas déclenchable** : aucune combinaison de facettes ne vide la liste | `cheap` | R9 reste `Done` avec la réserve consignée |
| **D04** | **Le saut de niveau de surface n'est pas résolu → V2 échoue** | `cheap` (option `chip`) / **`expensive`** (option `.card-inner`) | V2 est reporté au plan qui possède la hiérarchie des surfaces |

Le détail complet, avec les faits mesurés et les chemins de retour, est dans
[`plan-7-deviations.md`](./plan-7-deviations.md). **Chaque entrée porte les arguments pour ET
contre** — aucune n'est écrite pour obtenir un oui.

## 3. Ce qui reste à faire, une fois les décisions rendues

1. Transcrire les décisions dans `plan-7-deviations.md` (`approved` / `rejected` + la phrase qui
   l'établit). **Seul l'utilisateur écrit ces statuts.**
2. Exécuter les `Follow-up` des entrées rejetées, s'il y en a.
3. Lancer la **revue finale de branche** (elle n'a pas été faite — l'arrêt est intervenu avant), en
   lui passant la liste des mineurs différés du §4.
4. Lancer `/anti-drift-planning:verify 7` — seul chemin vers le script de release et le tag
   `milestone-plan-7` = `v1.2.0`.

`/anti-drift-planning:resume 7` régénère le prompt de reprise.

## 4. Mineurs différés — à passer à la revue finale de branche

- **Accord de zéro** — `count === 1 ? singular : plural` produit « **0 prompts** » ; le français
  demande le singulier après zéro (« 0 prompt »). Visible sur les 4 listes quand l'état vide
  s'affiche. Correction : `count <= 1`, plus un cas de test. *Relevé par le contrôleur, pas par une
  revue.*
- **JSDoc de `pickFeaturedEntry`** (18 lignes) — cumule la doc fonctionnelle et l'historique du
  défaut P-09 ; pourrait renvoyer au rapport de tâche.
- **`derivedFrom.slice(0, 2)`** — suppose un préfixe ASCII stable ; sans risque avec les valeurs
  actuelles, sans garde si une facette future commence par un caractère composé.
- **Commentaires périmés** citant `facet-filters.ts` comme s'il existait encore
  (`blog-filters.ts:4-5`, `facetFilters.ts:6,36`). La mention de `list-pattern.ts:8` est
  historique et correcte — la garder.
- **Faiblesse du jeu de test de tri** — 3 des 5 ordres trient `'a'` en tête par coïncidence du
  fixture ; seuls 2 exposaient le bug P-12. Le garde-fou tient, sa marge est plus mince que le
  nombre de cas ne le suggère.

## 5. Ce que cette exécution a produit, au-delà du code

**16 défauts de plan corrigés** (P-01 à P-16), tous consignés au ledger avec leur correction. Aucun
n'a changé ce qui ship au-delà de la spec : chacun rendait le texte du plan conforme à la réalité ou
à ce qui était déjà convenu.

Trois méritent d'être retenus :

- **P-12** — le plan faisait dériver l'entrée à la une de l'ordre **trié** au lieu de l'ordre
  **canonique**. Sur `/blog`, sous tri, une entrée **disparaissait de la page tout en restant
  comptée**. Le comportement fautif était **encodé comme voulu dans le test**, ce qui l'a fait
  traverser la revue de T-B1 : test et implémentation étaient faux *ensemble*, et la revue avait
  vérifié leur concordance. Seule une exécution dans un contexte que le test n'anticipait pas l'a
  révélé.
- **P-11** — le plan supprimait silencieusement un repli de texte alternatif déjà livré, en
  déménageant l'image vers un composant partagé. Invisible dans le diff : le composant était neuf.
- **P-14** — les corrections apportées à une tâche ne suivaient pas jusqu'aux tâches qui copiaient
  son bloc. Corriger le plan là où le bug est trouvé ne suffit pas : il faut le corriger là où il
  sera **lu**.

**Une leçon de méthode, valable au-delà de ce plan :** sur les quatre déviations, **trois ont été
trouvées par une mesure au rendu** — pas par un test, pas par une relecture de diff. La quatrième
(D01) l'a été en comparant deux builds. C'est la confirmation exacte de ce que la spec §7 annonçait
en citant le Plan 6 : « cinq défauts sur cinq n'ont été attrapés que par une mesure au rendu ».
