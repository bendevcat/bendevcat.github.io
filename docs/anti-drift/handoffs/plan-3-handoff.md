# Plan 3 — Handoff de session

**Date :** 2026-07-31
**Branche :** `plan-3-vitrine-projets` (partie de `main` @ `9793f6b`, Plan 2 vérifié PASS)
**HEAD :** `decd295`
**État de session :** **« prêt à continuer, un geste utilisateur en attente »**. La Phase Z n'a **pas** été lancée — le gate exige 0 déviation `pending-user` (il y en a 3) **et** la couverture des critères (3 sur 7 restent ouverts).
**Reprise :** `/anti-drift-planning:resume 3` régénère le prompt de reprise.

---

## 1. Le bloquant, en une phrase

**R1 exige « ≥ 2 fiches réelles ». Il n'y en a qu'une.** L'utilisateur a écarté `resumexyz` et doit publier d'autres projets pour servir d'exemples. Tant que la 2ᵉ fiche n'existe pas, **T-A2 ne peut pas être close, et T-B1 → T-B4 non plus** : leurs critères se vérifient sur des cartes et des fiches rendues (« la page rend **≥ 2** cartes », « choisir un statut → seules les fiches de ce statut restent visibles »). Une seule fiche ne permet de valider ni la grille, ni le filtre.

## 2. Où en est chaque critère

| ID | Critère | Statut | Ce qui manque |
|---|---|---|---|
| R1 | Collection `projects` + ≥ 2 fiches | **In progress** | Le schéma est livré et testé (T-A1). Il manque la 2ᵉ fiche. |
| R2 | `/projets` rend une grille (≥ 2 cartes) | **Pending** | T-B1, bloquée par R1. |
| R3 | Filtre statut + stack | **Pending** | T-B2, bloquée par R1. |
| R4 | `/projets/<slug>` rend la fiche | **Pending** | T-B3, bloquée par R1. |
| R5 | Relation bidirectionnelle `blog ↔ projects` | **In progress** | Les **données** sont en place dans les deux sens (`7edc67e`). Il manque le **rendu** : T-B3 (projet → articles) et T-B4 (article → projets). |
| R6 | Projets éditables via le CMS | **In progress** | Config livrée, testée et smoke-testée (T-C1 + correctif). Il manque la création réelle via `/admin` → **T-C2, geste utilisateur**. |
| R7 | Dark editorial-dev, 375px | **Pending** | Se vérifie dans T-B1 → T-B4. |

## 3. Ce qui est livré, et sur quelles preuves

- **T-A1 — collection `projects`** (`d3978aa`). Schéma Zod **verbatim** de la spec de design §3.2 (sans champ `draft`), page bundles, helpers `sortProjects` / `collectStacks` / `getSortedProjects`, 7 tests. Revue : **spec ✅ / qualité Approved**. Le relecteur a confronté le schéma à la spec de design elle-même, pas au brief.
- **T-A2 — partielle** (`7edc67e`). Fiche `src/content/projects/site-bencat/index.md` (chaque valeur vérifiée : dépôt créé le 2026-07-30, stack lue dans `package.json`, site en 200) **et la relation bidirectionnelle** : `relatedPosts: [bienvenue-dans-mon-foutoir]` côté projet, `relatedProjects: [site-bencat]` côté article. La fiche `resumexyz` a été retirée (**D02**).
- **T-C1 — CMS** (`5500325` + correctif `91498c1`). Collection `projects` dans `config.yml`, `relatedProjects` ajouté à `blog`, `cms-config.test.ts` porté de 14 à 25 tests. Revue : **spec ✅**, 1 Important corrigé en 1 round, re-revue **ADDRESSED**. Smoke `/admin` fait dans un vrai navigateur : écran de connexion normal, **0 erreur console**.

**État de vérification à `decd295` :** `vitest` **33/33** · `astro check` **0 error / 0 warning / 33 hints** · `astro build` **8 pages**. Vérifié par le contrôleur, pas seulement rapporté.

## 4. Ce que j'attends de l'utilisateur — décisions précises

1. **Publier les projets qui serviront de fiches** (le bloquant). Pour chacun, il me faut de quoi remplir un frontmatter **sans rien inventer** : titre, une phrase de description, statut (`actif` / `wip` / `archivé`), stack, date de début si connue, URL du dépôt, URL de démo **si elle répond encore**, et éventuellement un article du blog à lier. Le plan sera **ré-amendé** avec ces valeurs **avant** que T-A2 ne reprenne.
   - Pour éprouver le filtre (R3), l'idéal est **au moins deux statuts différents** et **au moins une techno partagée** entre deux fiches.
2. **Trancher les 3 déviations `pending-user`** — `approved` ou `rejected`, ce sont tes mots, pas les miens :
   - **D01** — T-C1 exécutée avant la fin de T-A2, parce que c'est la seule tâche indépendante de tout contenu. *(Cette entrée a été corrigée : sa version initiale affirmait à tort que rien n'était commité.)*
   - **D02** — retrait de la fiche `resumexyz`, sur ta demande explicite.
   - **D03** — durcissement du motif d'URL du CMS, après un défaut réel trouvé dans le bundle épinglé.
3. **Hors périmètre du Plan 3, pour information** : le tag `milestone-plan-2` et la version `v0.2.0` **n'existent pas**. La Phase Z du Plan 2 a rendu PASS (`9793f6b`), mais le ship — script de release + tag — était une action utilisateur distincte et n'a pas été faite. À poser rétroactivement ou à assumer manquant.

## 5. Reprise — l'ordre exact

1. Ré-amender le plan (T-A2 Step 2) avec les données réelles des projets publiés. **Amender avant d'exécuter n'est pas une déviation.**
2. **T-A2** — créer la ou les fiches manquantes, vérifier les références résolues (sonde `_probe-refs.astro`, clause « aucun `undefined` » de R5), supprimer la sonde.
3. **T-B1** → **T-B2** → **T-B3** → **T-B4**, dans cet ordre (chaque tâche a ses étapes complètes, code inclus, dans le plan d'impl).
4. **T-C2** — création réelle d'un projet via `/admin` (geste utilisateur ; un agent ne peut ni fournir le PAT ni actionner le sélecteur de dossier natif).
5. **Phase Z** — `/anti-drift-planning:verify 3`, **uniquement** quand les 7 critères sont couverts et que le log de déviations ne contient plus aucune entrée `pending-user`.

## 6. Pièges à ne pas re-découvrir

- **Lire `git log` avant d'écrire dans le ledger ce que le dépôt contient.** Un subagent interrompu peut avoir déjà commité — c'est arrivé cette session, et c'est le relecteur de T-C1 qui l'a détecté, pas moi.
- **`npx astro check` dans la vérification de chaque tâche** (leçon du Plan 2, appliquée dès le plan d'impl de celui-ci).
- **Ne jamais empiler de commits sur une branche locale sans l'avoir intégrée**, et lire `git status -sb` (ahead/behind) **avant** de demander un push (leçon du Plan 2 : un force-push a écrasé deux commits CMS).
- **Établir les faits sur le bundle Sveltia épinglé, pas sur la doc.** Cette session l'a re-confirmé : le validateur de champ fait un `RegExp.test` non ancré, ce que la doc ne dit nulle part.
- **Piège Tailwind du filtre (T-B2)** : masquer une carte par le seul attribut `hidden` ne suffit pas — `[hidden]{display:none}` du preflight et l'utilitaire `flex` ont la même spécificité. La règle CSS explicite est déjà écrite dans le plan.

---

**Artefacts :**
- Plan d'impl : `docs/anti-drift/plans/2026-07-19-plan-3-vitrine-projets.md`
- Ledger : `docs/anti-drift/handoffs/plan-3-ledger.md`
- Déviations : `docs/anti-drift/handoffs/plan-3-deviations.md`
- Briefs et rapports de tâches : `.superpowers/sdd/2026-07-19-plan-3-vitrine-projets/` (git-ignoré)
