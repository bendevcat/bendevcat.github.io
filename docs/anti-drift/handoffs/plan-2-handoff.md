# Plan 2 — Handoff de session

**Date:** 2026-07-30
**Branche:** `plan-2-cms-sveltia` (non mergée, non poussée)
**État:** **prêt à ship côté code — 5 déviations à ratifier + 3 questions de fond + 3 vérifications manuelles en attente** (détail en §7 et §8)
**Phase Z:** **NON lancée** (voir « Pourquoi la Phase Z n'a pas tourné »)
**Reprise:** `/anti-drift-planning:resume 2` régénère le prompt de reprise.

---

## 1. Ce qui est livré et vérifié

| Tâche | Commit | Vérification |
|---|---|---|
| T-A1 — page `/admin` + config CMS valide + test de non-régression | `68ed21a` | Revue : spec ✅ / qualité Approved. Smoke navigateur contrôleur : UI Sveltia rendue, **0 erreur console**. |
| T-B1 — mapping du schéma Zod en widgets Sveltia, `output`, médias | `e84d0dd` | Revue : spec ✅ / qualité Approved, 0 Critical/Important. |
| Correctif — `@types/node` (régression `astro check`) | `d9e900a` | Re-revue ciblée : **ADDRESSED**, aucun masquage, aucune casse. |
| T-C1 — README : workflows d'édition prod + local | `f5f2bc8` | Voir ledger (revue de tâche). |

**Suite de tests au dernier passage contrôleur** (branche `f5f2bc8`) :

```
npx astro check   → 0 errors, 0 warnings, 14 hints
npx vitest run    → 12 tests / 2 fichiers, 12 passed
npx astro build   → 8 pages, 0 erreur
```

**Ne pas re-citer ces résultats comme frais** : la Phase Z devra les relancer.

## 2. Ce qui reste — et pourquoi seul l'utilisateur peut le faire

Trois vérifications exigent des gestes qu'aucun agent ne peut poser. Ce n'est pas un contournement : c'est la contrepartie directe de l'architecture « CMS sans backend » choisie par la spec.

### T-A2 → critère **R2** (auth PAT)
Un agent ne manipule jamais de *personal access token*. **Toi seul.**

1. Lancer `npm run dev`, ouvrir **`http://localhost:4321/admin/index.html`** (le slash final ne marche qu'en production, cf. D01).
2. Cliquer **« Sign In Using Access Token »** — *pas* « Sign In with GitHub », qui ne peut pas fonctionner sans backend.
3. Créer un PAT **fine-grained** limité au dépôt `bendevcat/bendevcat.github.io`, permission **Contents: Read and write**.
4. Le coller.
5. **Constat binaire attendu :** la bibliothèque s'ouvre et la collection **Articles** liste les **6** articles existants.

### T-B2 → critères **R3**, **R4**, **R6** (création/édition réelle)
Mesuré cette session : un navigateur piloté par automatisation échoue avec « *A repository root directory could not be selected. Please try again.* ». La File System Access API n'accorde l'accès disque que sur un geste humain dans le sélecteur natif. **Toi seul, dans un navigateur Chromium.**

Le pas-à-pas complet est dans le brief `.superpowers/sdd/2026-07-19-plan-2-cms-sveltia/task-B2-brief.md`. En résumé :

1. `npm run dev` → `http://localhost:4321/admin/index.html` → **« Work with Local Repository »** → sélectionner la racine du projet.
2. Créer un article de test avec **uniquement** : titre `Test CMS plan 2`, description, date, catégorie `Outils`, un corps markdown. **Laisser vides** `updatedDate`, `cover`, `coverAlt`, `aiUsage`, `tags`. Enregistrer.
3. Vérifier `src/content/blog/test-cms-plan-2/index.md` : chemin conforme (**R3**), et **aucune** clé vide dans le frontmatter (**R4**).
4. `npx astro build` → doit passer (clause « ET `astro build` passe » de **R4**).
5. Rouvrir l'article, **uploader une image de couverture** + son texte alternatif, enregistrer → l'image doit atterrir **dans le dossier de l'article**, et s'afficher sur `/blog/test-cms-plan-2/` et sur `/blog` (**R6**).
6. `rm -rf src/content/blog/test-cms-plan-2` puis `npx astro build` + `git status` → arbre propre.

**Si une de ces étapes échoue**, ne corrige pas à la main : note le symptôme exact, c'est un défaut de `public/admin/config.yml` à traiter en session (le plan prévoit de reprendre au step 2 après correction).

### T-C2 → critère **R5** (commit CMS → déploiement)
Vérifiable seulement **après merge sur `main` et déploiement**. Mécanisme déjà vérifié côté contrôleur : `.github/workflows/deploy.yml` déclenche bien sur `push: { branches: [main] }` et n'a pas été modifié par ce plan.

1. Après merge + déploiement, ouvrir `https://bendevcat.github.io/admin/`, se connecter au jeton.
2. Modifier un article, **Save**.
3. **Constat binaire attendu :** un nouveau commit apparaît sur `main`, un run `Deploy to GitHub Pages` est déclenché **par ce commit**, et une fois vert la modification est en ligne.

### R7 (workflow local documenté)
Le README est écrit (`f5f2bc8`), mais R7 dit « **suivre** le README ». Il passera `Done` quand T-B2 aura été exécutée **en suivant le README**, pas avant.

## 3. Les déviations à ratifier (liste complétée en §8)

Toutes sont `pending-user` dans [`plan-2-deviations.md`](./plan-2-deviations.md). **Deux autres, D04 et D05, sont venues de la revue finale — voir §7 et §8.** **Tant qu'il en reste une, la Phase Z échoue et rien n'est tagué** — c'est le gate, pas une formalité.

| # | Question | Ma recommandation |
|---|---|---|
| **D01** | En local, la doc envoie sur `/admin/index.html` au lieu de `/admin/` (qui renvoie 404 sur le serveur de dev ; en production les deux marchent). Tu acceptes ? | **Approuver.** L'alternative documentait une URL en 404, ce qui rendait R7 invérifiable en le suivant. |
| **D02** | T-C1 (README) a été écrite **avant** T-B2, alors que le plan la fait dépendre de ses constats — parce que T-B2 est bloquée sur toi. Tu acceptes ? | **Approuver**, en gardant que R7 ne passe `Done` qu'après exécution réelle de T-B2. |
| **D03** | `@types/node` ajouté en devDependency, non prévu au plan, pour rétablir `astro check` à 0 erreur (régression introduite en T-A1 par le code de test que le plan impose verbatim). Tu acceptes ? | **Approuver.** L'alternative réécrivait du code de test imposé verbatim par le plan. |

**À retenir sur D03** : la régression a vécu 2 tâches sans être vue, parce qu'**aucune étape du plan ne lançait `astro check`**. C'est un défaut du plan, pas des agents. À corriger dans les plans 3 à 5 : ajouter `astro check` aux étapes de vérification.

## 4. Pourquoi la Phase Z n'a pas tourné

`/anti-drift-planning:verify 2` échouerait sur deux fronts, et la lancer maintenant produirait un audit connu d'avance :

1. **5 entrées `pending-user`** dans le log de déviations (D01 à D05) — le gate l'interdit.
2. **4 critères sur 7 non vérifiés** : R2, R3, R4, R6 restent `In progress` (leur preuve exige T-A2 et T-B2), R5 est `Pending` (post-merge), R7 est `In progress` (attend que le README soit suivi).

Seul **R1** est `Done`. « Prêt à ship, décisions en attente » est l'état de succès de cette session ; un tag posé maintenant ne le serait pas.

## 5. Ordre de reprise recommandé

1. Ratifier **D01 à D05** et trancher les 3 questions de fond de §8 (approved / rejected — ce sont tes mots, pas les miens).
2. Exécuter **T-A2** puis **T-B2** en local → débloque R2, R3, R4, R6, R7.
3. Merger `plan-2-cms-sveltia` dans `main`, pousser → déploiement.
4. Exécuter **T-C2** sur le site déployé → débloque R5.
5. Lancer **`/anti-drift-planning:verify 2`** → seul chemin vers le script de release et le tag `milestone-plan-2`.

## 6. Points mineurs mis de côté

- Le libellé réel du bouton est « **Sign In Using Access Token** » ; la spec R2 écrit « Sign In with Token ». Libellé du bundle CDN, pas de notre fait — la doc utilise le libellé réel.
- `sortable_fields`, `identifier_field`, `slug` et la `description` de collection ne sont couverts par aucune assertion du test de config.
- Les options `aiUsage` sont comparées à un littéral dans le test, faute d'export dédié dans `src/content.config.ts` (les catégories, elles, sont bien comparées à `CATEGORIES` importé).
- `npm audit` signale **1 vulnérabilité high** (`fast-uri`, transitive) — **préexistante au Plan 2**, confirmée présente avant le correctif `d9e900a`. À traiter en maintenance dédiée.
- Sveltia affiche un avertissement console « version plus récente disponible » (`0.176.0`) : conséquence normale de l'épinglage volontaire en `0.175.1`.

---

## 7. Revue finale de branche — 4 constats Important (ajout du 2026-07-30 23:30)

Une revue finale sur les 14 commits a été passée sur le modèle le plus capable, avec **sondes `astro build` réelles** et **lecture du code source amont de Sveltia**. Verdict : **aucun Critical**, merge recommandé sous réserve des 4 Important. Rapport complet : `.superpowers/sdd/2026-07-19-plan-2-cms-sveltia/final-review.md`.

Bonne nouvelle d'abord : la question centrale — *le CMS produira-t-il vraiment ce que le schéma Zod exige ?* — reçoit une réponse **positive et vérifiée**, pas supposée. Chemin d'image nu résolu par `image()`, `omit_empty_optional_fields` bien lu au bon endroit et excluant `false`, `body` correctement reconnu comme nom réservé, format de date sûr (Sveltia utilise Day.js).

| # | Constat | État |
|---|---|---|
| **I1** | L'onglet média **global** du sélecteur est toujours activé, même en mode entry-relative. Y basculer produit `cover: /images/uploads/…` → `astro build` échoue → run Actions rouge, article jamais publié, aucune explication dans le CMS. | **Ouvert** — le retrait est impossible (Sveltia refuse de démarrer sans `media_folder` global, mesuré). 3 options dans D04. |
| **I2** | Aucun script `test` (`npm test` → *Missing script*), et la CI ne lance ni `vitest` ni `astro check`. Le README promet pourtant que le test « échoue si les deux divergent » — rien ne l'exécute. Même famille exacte que l'angle mort de D03. | **Ouvert** — câbler les tests dépasse le périmètre de la spec du Plan 2. Ta décision. |
| **I3** | R6 dit « visible sur **l'article publié** ». Or le cover n'est rendu que dans `ArticleCard.astro` (vignettes de `/` et `/blog`) ; `src/pages/blog/[...slug].astro` ne le référence jamais. Vérifié sur la sortie construite : aucun `src=`/`srcset=`. Gabarits hérités du Plan 1, mais **R6 appartient au Plan 2**. | **Ouvert** — R6 n'est satisfaisable par aucun code livré. Ta décision. |
| **I4** | Aucun SRI sur le bundle CDN qui reçoit le PAT en écriture. | **Corrigé** (`68e854a`, déviation D05) — `integrity` + `crossorigin`, `/admin` recharge avec 0 erreur. |

**Minor mis de côté** : le test est **unidirectionnel** (il verrouille le CMS contre le schéma, jamais l'inverse — seul `CATEGORIES` est croisé avec la source ; le `format` des dates et la clé `output` ne sont assertés par rien) · `pubDate` n'a pas de `default: '{{now}}'`, donc date à saisir à la main à chaque article · pas de `clean_accents`, donc les slugs générés seront accentués alors que les 6 articles existants sont en ASCII · `_next-session-prompt.md` désormais gitignoré (corrigé).

## 8. Les décisions ouvertes, au complet

**5 déviations `pending-user`** : D01 (URL locale), D02 (README avant validation), D03 (`@types/node`), D04 (dossier média global — **tentative annulée, rien n'a été modifié**), D05 (SRI).

**3 questions de fond**, indépendantes des déviations : I1 (quelle parade au dossier média global), I2 (câbler `vitest`/`astro check` maintenant ou au Plan 3), I3 (rendre le cover sur la page article, ou reformuler R6).

Aucune ne peut être tranchée à ta place : chacune arbitre entre élargir le périmètre du Plan 2 et laisser un critère ou un risque en l'état.
