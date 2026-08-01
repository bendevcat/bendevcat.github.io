# Plan 3 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut. Un statut assorti d'un commentaire (« approved, mais… ») n'est pas un statut valide : la Phase Z le ré-audite comme `pending-user`._

**Ratification — 2026-07-31 (utilisateur bendevcat, transcrite depuis sa réponse explicite au gate de décision) : « Je les approuve toutes ».** **D01, D02, D03, D04, D05, D06, D07 → `approved`.** Trois d'entre elles (D04, D05, D07) sont des corrections d'erreurs factuelles du plan d'implémentation, remontées par des implémenteurs qui ont refusé de les contourner ; D02 vient d'une demande explicite de l'utilisateur ; D06 vient d'un constat de revue établi en cassant une vraie référence.

---

## D08 — `delete: false` sur les deux collections du CMS (constat I1 de la revue finale)

- **Date:** 2026-07-31
- **Task affected:** T-C1 (rouverte après la revue finale) + README
- **Original plan:** aucune tâche du plan ne mentionne la clé `delete`. Le défaut de Sveltia/Decap étant `delete: true`, le bouton « Supprimer » est actif sur les deux collections.
- **Deviation taken:** poser `delete: false` sur `blog` **et** sur `projects`, ajouter l'assertion correspondante à `src/lib/cms-config.test.ts`, et documenter dans le README comment supprimer proprement une entrée (retirer l'entrée **et** ses rétro-références, dans le dépôt).
- **Reason:** constat **I1** de la revue finale, **reproduit** par le relecteur : supprimer le projet `gha-svu` depuis `/admin` laisse `relatedProjects: [gha-svu]` sur l'article — le CMS ne nettoie pas les rétro-références — le commit déclenche le déploiement, `astro build` s'interrompt et **0 page** est produite. Le site entier cesse d'être déployé, sur un geste que le CMS présente comme banal.
- **Recommandation du contrôleur, et pourquoi celle-là** (l'utilisateur a explicitement délégué le choix parmi les trois options qui lui ont été présentées) :
  1. **La panne est totale, pas partielle.** Ce n'est pas la fiche supprimée qui casse, c'est le site. Un risque total mérite une parade structurelle, pas une ligne de documentation.
  2. **C'est la troisième occurrence du même mode de panne** sur ce projet (image lourde, URL distante, et maintenant suppression) : « le CMS accepte, le build casse après le commit ». Les deux premières ont réellement produit des déploiements rouges. Le motif est établi, pas hypothétique.
  3. **L'option « projets seulement » ne ferme que la moitié du trou.** La relation est symétrique : supprimer un *article* casse la fiche projet qui le cite, exactement comme l'inverse. Une parade asymétrique serait plus difficile à raisonner qu'à réparer.
  4. **Le coût est faible et bien placé.** La valeur du CMS est de **publier et éditer** sans toucher au code — c'est fréquent. Supprimer est rare, et sur un site dont le contenu est curé et destiné à durer, c'est même l'opération qu'on veut faire lentement. La déplacer dans le dépôt, où le build valide avant le push, met la friction exactement là où elle protège.
  5. **C'est réversible d'une clé YAML**, sans aucune migration de contenu.
  **Résiduel assumé** : supprimer un article ou un projet devient une opération manuelle (`rm -rf` du dossier + retrait des rétro-références + commit). Le README dira comment.
- **Reversibility:** cheap (deux clés YAML, une assertion, une section de README ; aucun contenu touché, rien de publié).
- **Caught late:** no (loggé avant exécution).
- **Status:** approved
- **User decision:** **Délégation explicite de l'utilisateur** le 2026-07-31 — « On suit ta recommandation », en réponse aux **trois options** qui lui avaient été présentées (`delete: false` partout / accepter et documenter / `delete: false` sur `projects` seulement). L'option retenue par le contrôleur est la **première**, motivée ci-dessus. Si ce n'était pas l'intention, une clé YAML suffit à revenir en arrière.
- **Follow-up:** si rejeté, retirer `delete: false` et l'assertion, et remplacer par la section README de mise en garde (option 2).

---

## D07 — Travail après clôture de T-C1 : symétriser le garde-fou CMS↔Zod + corriger un commentaire faux

- **Date:** 2026-07-31
- **Task affected:** T-C1 (rouverte après la revue finale de branche) et T-A1 (commentaire)
- **Original plan:** T-C1 Step 2 prescrit une **liste exacte** d'assertions pour `src/lib/cms-config.test.ts`. Elle couvre `projects.relatedPosts` (widget, collection, `multiple`, `value_field`) mais, pour `blog.relatedProjects`, seul le **nom du champ** est vérifié.
- **Deviation taken:** (1) ajouter à `cms-config.test.ts` les assertions manquantes sur `blog.relatedProjects`, en miroir de celles de `projects.relatedPosts` ; (2) corriger le commentaire JSDoc de `sortProjects` dans `src/lib/projects.ts`.
- **Reason:** constat **I2** de la revue finale, que **seule une revue transverse pouvait voir** : les deux côtés de la relation ont été livrés par deux tâches différentes, chacune conforme à son brief. Scénario mesuré : passer `value_field: '{{slug}}'` à `'{{title}}'` sur `config.yml:63` laisse **40/40 tests verts**, `astro check` vert et `astro build` vert (le contenu existant est écrit à la main) ; puis le **premier article enregistré depuis `/admin`** écrit `relatedProjects: ["gha-svu — le versionnage sémantique…"]` et casse le build après le commit. La contrainte globale du plan dit pourtant que **toute divergence CMS↔Zod doit faire échouer ce test** : l'ajout sert cette contrainte, mais il élargit une tâche déjà close, donc il est loggé.
  Pour (2) : le commentaire affirme que `localeCompare('fr')` « ignore casse et accents » — **faux**, vérifié en Node par deux relecteurs indépendants. Un commentaire faux dans une fonction de tri est un piège pour la prochaine personne qui la modifie. La revue finale l'a classé « seul Minor dont la correction est gratuite et le maintien coûteux ».
- **Reversibility:** cheap (des assertions de test et une phrase de commentaire ; aucun comportement modifié).
- **Caught late:** no (loggé avant exécution).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-07-31 (« Je les approuve toutes », ratification groupée D01→D07).
- **Follow-up:** aucun code à défaire si rejeté. **Le constat I1 de la revue finale n'est PAS traité ici** — il demande une décision de l'utilisateur, voir la note ci-dessous.

> **CONSTAT I1 DE LA REVUE FINALE — décision utilisateur requise, aucune action prise.**
> Aucune collection du `config.yml` ne pose `delete: false` : supprimer une entrée depuis `/admin` est donc autorisé. Or le CMS **ne nettoie pas les rétro-références**. Reproduit par le relecteur : supprimer le projet `gha-svu` laisse `relatedProjects: [gha-svu]` sur l'article, le commit déclenche le déploiement, `astro build` s'interrompt et **0 page** est produite — le site entier cesse d'être déployé. C'est la **troisième occurrence** du mode « le CMS accepte, le build casse après le commit » sur ce projet. Deux options, toutes deux à trancher par l'utilisateur : (a) `delete: false` sur les deux collections — le trou se ferme, mais supprimer un article ou un projet redevient une opération manuelle dans le dépôt ; (b) accepter le risque et le documenter dans le README, à côté des deux pièges d'images du Plan 2. **Rien ne sera fait sans décision explicite** : les deux options changent quelque chose d'observable.

---

## D06 — Garde-fou ajouté sur la résolution des références (constat Important de la revue T-B3)

- **Date:** 2026-07-31
- **Task affected:** T-B3 (round de fix 1) et, par conséquence, T-B4
- **Original plan:** le plan impose verbatim, en T-B3 comme en T-B4, de passer directement le résultat de `getEntries()` à `sortAndFilter` / `sortProjects`. Aucune étape ne prévoit de garde-fou sur une référence introuvable.
- **Deviation taken:** interposer un garde-fou qui **échoue avec un message nommant le projet (ou l'article) fautif et l'id manquant**, au lieu de laisser passer un `undefined` jusqu'à un `TypeError` anonyme.
- **Reason:** constat **Important** de la revue, **établi empiriquement** par le relecteur — sondes créées, mesurées, supprimées, arbre vérifié propre. `getEntries` d'Astro n'échoue pas sur une référence introuvable : `createGetEntry` fait `console.warn('Entry blog → … was not found.'); return;`, donc **`undefined` entre dans le tableau**. `sortAndFilter` (`src/lib/posts.ts:5`) accède ensuite à `p.data.draft` → `TypeError: Cannot read properties of undefined (reading 'data')`, **exit 1, build interrompu** : aucune des 11 pages n'est produite, pas seulement la fiche concernée. Ni le schéma Zod (`reference()` ne valide que la forme) ni `astro check` (0 erreur sur une référence cassée) ne détectent le cas en amont.
  **Scénario réel, pas théorique** : l'éditeur supprime ou renomme dans le CMS un article encore cité en `relatedPosts` → le commit est accepté sans le moindre avertissement → le déploiement suivant casse intégralement, avec un message qui ne nomme ni le projet ni l'article manquant. C'est la forme exacte de l'incident image du Plan 2 : le CMS accepte, le build tranche, et il tranche trop tard **et** sans expliquer.
  **La lettre de R5 est déjà respectée** (aucun `undefined` n'atteint le HTML, l'échec est bruyant) : ce garde-fou ne corrige pas une non-conformité, il rend l'échec **diagnosticable**. C'est pour cette raison qu'il est loggé comme une déviation et non comme un correctif de conformité.
- **Reversibility:** cheap (un helper et son appel dans deux gabarits ; aucun contenu, aucune donnée, rien de publié).
- **Caught late:** no (loggé avant exécution du correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-07-31 (« Je les approuve toutes », ratification groupée D01→D07).
- **Follow-up:** si rejeté, retirer le helper et revenir au code verbatim du plan — en assumant qu'une référence cassée produira un `TypeError` anonyme et un déploiement rouge non diagnosticable. **Choix alternatif écarté** : filtrer silencieusement les `undefined`. Il aurait rendu le build vert en **supprimant discrètement un lien**, ce qui est précisément le genre de perte silencieuse que ce plan existe pour empêcher.

---

## D05 — Valeurs attendues fausses dans les étapes de vérification de la Phase B

- **Date:** 2026-07-31
- **Task affected:** T-B1 (Steps 4 et 6), T-B2 (Step 10), T-B3 (Step 5)
- **Original plan:** deux erreurs, relevées par l'implémenteur de T-B1 et **re-vérifiées par le contrôleur** :
  1. `grep -c 'data-project-card' dist/projets/index.html` (T-B1 Step 4) — `grep -c` compte les **lignes** contenant le motif, pas les **occurrences**. Le HTML construit n'étant pas indenté (6 lignes en tout), la commande renvoie `1` quel que soit le nombre de cartes. **Le contrôle de R2 « ≥ 2 cartes » était donc impossible à satisfaire tel qu'écrit.**
  2. « build **11 pages** » annoncé à la fin de T-B1, T-B2 et T-B3. Faux à deux endroits sur trois : après T-B1 le build fait **9 pages** (8 + `/projets`), après T-B2 toujours **9** (le filtre ne crée aucune route), et ce n'est qu'après T-B3 qu'il atteint **11** (9 + les 2 fiches).
- **Deviation taken:** la commande devient `grep -o … | wc -l` ; les valeurs attendues sont corrigées à 9 / 9 / 11.
- **Reason:** mesuré, pas déduit. `npx astro build` → **9 pages** ; `grep -o 'data-project-card' dist/projets/index.html | wc -l` → **2**, quand `grep -c` sur le même fichier renvoie **1**. Une étape de vérification qui ne peut pas passer, ou dont le chiffre attendu est faux, pousse l'implémenteur suivant soit à croire qu'il a cassé quelque chose, soit — bien pire — à « arrondir » son rapport pour coller au plan.
- **Reversibility:** cheap (des commandes et des nombres dans des étapes de vérification ; aucun livrable n'est touché).
- **Caught late:** no (loggé avant correction du plan). L'implémenteur de T-B1 a **signalé les deux écarts au lieu de les arrondir** — c'est exactement le comportement attendu.
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-07-31 (« Je les approuve toutes », ratification groupée D01→D07).
- **Follow-up:** aucun code à défaire. Vérifier que les valeurs corrigées tiennent à mesure que la Phase B avance.

---

## D04 — La méthode de vérification de R5 prescrite par le plan (T-A2 Steps 4-5) était factuellement fausse

- **Date:** 2026-07-31
- **Task affected:** T-A2 (Steps 4 et 5)
- **Original plan:** deux affirmations du plan d'impl, toutes deux erronées :
  1. contexte de T-A2 et Step 4 — « **Astro valide les `reference()` au build : un id inexistant fait échouer `astro build`** avec un message explicite — c'est le test de cette tâche » ;
  2. Step 5 — sonde à créer en `src/pages/_probe-refs.astro`, puis à lire via `cat dist/_probe-refs/index.html`.
- **Deviation taken:** (1) l'affirmation est corrigée — `reference()` ne valide que la **forme**, l'existence n'est vérifiée qu'à la **résolution** (`getEntry` / `getEntries`), donc uniquement quand une page routée résout le champ ; le Step 4 devient un contrôle de schéma, et la preuve d'intégrité des références passe par la sonde. (2) La sonde est renommée **sans underscore** (`src/pages/probe-refs.astro`) et lue en `dist/probe-refs/index.html`.
- **Reason:** constat remonté par l'implémenteur de T-A2, qui s'est **arrêté avant de committer** comme le brief le lui demandait, puis **re-vérifié indépendamment par le contrôleur** en trois builds réels :
  - id cassé (`nexiste-pas`) dans `relatedPosts`, **aucune page ne le résout** → `astro build` **vert, exit 0, 8 pages**. La validation annoncée par le plan n'existe pas à ce stade.
  - même id cassé **avec** une page routée qui résout → build **en échec** : `Entry blog → nexiste-pas was not found.` puis `TypeError: Cannot read properties of undefined (reading 'id')`.
  - ids corrects + sonde routée → `site-bencat -> [bienvenue-dans-mon-foutoir:Bienvenue dans mon foutoir ! 🚀]` et `gha-svu -> [comment-jutilise-github-actions-au-quotidien:Comment j'utilise GitHub Actions au quotidien]` — **aucun `undefined`**.
  Quant au nom de la sonde : Astro exclut du routage tout fichier ou dossier préfixé par `_` sous `src/pages/`. La sonde prescrite ne produisait donc **aucune page**, et le `cat` du plan échouait en « No such file or directory » **même avec des données correctes** — une étape de vérification qui ne pouvait pas passer.
- **Reversibility:** cheap (une méthode de vérification et un nom de fichier temporaire ; aucun livrable n'est touché — les Steps 2 et 3 restent identiques).
- **Caught late:** no (loggé avant que le correctif ne soit exécuté et avant tout commit de T-A2).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-07-31 (« Je les approuve toutes », ratification groupée D01→D07).
- **Follow-up:** conséquence à porter jusqu'à la Phase Z — **une référence cassée dans le contenu ne casse le build qu'une fois qu'une page la résout**. Tant que T-B3 et T-B4 ne sont pas livrées, rien ne protège contre un `relatedPosts` pointant dans le vide. À partir de T-B4, la protection existe et elle est **bruyante** (build rouge), ce qui est le bon comportement. Ce fait doit être re-vérifié lors du walkthrough de R5 en Phase Z, pas supposé.

---

## D03 — Durcissement du `pattern` de `repoUrl` / `demoUrl` (constat Important de la revue T-C1)

- **Date:** 2026-07-31
- **Task affected:** T-C1 (correctif post-livraison, round de fix 1)
- **Original plan:** plan d'impl, T-C1 Step 5, YAML imposé verbatim : `pattern: ['^https?://', 'Doit être une URL complète commençant par http:// ou https://']` sur `repoUrl` et `demoUrl`.
- **Deviation taken:** remplacer ce motif par un motif **ancré des deux côtés**, et ajouter un test qui confronte le motif au schéma Zod réel plutôt qu'à une liste d'exemples choisis.
- **Reason:** constat **Important** de la revue de tâche, **établi sur le bundle épinglé** puis reproduit en Node — pas déduit de la doc. Le validateur de champ `string` de Sveltia 0.175.1 fait `_A(n[0]).test(String(i))` : un `RegExp.test` **non ancré à droite**, qui ne vérifie donc qu'un préfixe. Conséquence mesurée : `https://`, `http://`, `https:///` et `http://exa mple.com` **passent** la validation du CMS et sont écrits dans le frontmatter, alors que `z.string().url()` les **rejette** — `astro build` échoue alors avec une `ZodError` sur `repoUrl`, après le commit. C'est exactement la classe de valeurs que ce `pattern` était censé arrêter : il donne aujourd'hui une fausse impression de garde-fou. Le défaut vient du plan lui-même, pas de l'implémenteur (le YAML a été repris verbatim).
- **Reversibility:** cheap (une expression régulière et un test).
- **Caught late:** no (loggé avant exécution du correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-07-31 (« Je les approuve toutes », ratification groupée D01→D07).
- **Follow-up:** si rejeté, revenir au motif préfixe — en assumant qu'une URL tronquée saisie dans le CMS casse le déploiement après coup, comme au Plan 2 avec les images.

---

## D02 — Fiche `resumexyz` retirée ; l'amendement du plan pour T-A2 est annulé

- **Date:** 2026-07-31
- **Task affected:** T-A2 (déjà partiellement livrée en `7edc67e`)
- **Original plan:** plan d'impl amendé (`3b52fa0`), T-A2 Step 2 : créer `src/content/projects/resumexyz/index.md` avec un contenu exact ; l'amendement désignait `site-bencat` **et** `resumexyz` comme les deux fiches réelles de R1.
- **Deviation taken:** suppression de `src/content/projects/resumexyz/` et retrait de son bloc du plan. La fiche `site-bencat` et la relation bidirectionnelle sont **conservées** telles que livrées. T-A2 redevient partiellement livrée : il lui manque sa 2ᵉ fiche.
- **Reason:** **décision explicite de l'utilisateur** — « Laisse tomber pour resumexyz, je vais voir pour push quelques projets locaux pour avoir de vrais exemples ». La 2ᵉ fiche viendra donc d'un projet que l'utilisateur doit d'abord publier.
- **Reversibility:** cheap (un dossier de contenu, jamais déployé — la branche n'est pas mergée).
- **Caught late:** no (loggé avant exécution de la suppression).
- **Status:** approved
- **User decision:** demandé explicitement par l'utilisateur le 2026-07-31 (« laisse tomber pour resumexyz »). Reste `pending-user` : seul l'utilisateur clôt une entrée, et la formulation exacte du périmètre restant (quels projets, combien) n'est pas encore arrêtée.
- **Follow-up:** le plan sera **ré-amendé** avec les vraies valeurs des projets poussés, avant que T-A2 ne reprenne. R1 ne peut pas passer `Done` tant qu'une 2ᵉ fiche n'existe pas (« ≥ 2 fiches réelles chargées »).

---

## D01 — T-C1 (CMS) exécutée avant la fin de T-A2

> **CORRECTION (2026-07-31)** — la version initiale de cette entrée affirmait « T-A2 est bloquée » et, dans le ledger du même commit (`1625b29`), « rien de commité (…) la fiche `site-bencat` n'est pas créée non plus ». **C'était faux.** Le subagent T-A2 avait déjà commité `7edc67e` (deux fiches + la relation sur l'article) avant que l'interruption de l'utilisateur ne prenne effet ; ce commit est le **parent direct** de celui où l'entrée a été écrite. L'erreur a été relevée par le relecteur de T-C1, qui l'a établie sur `git log` / `git show`, pas sur mes affirmations. L'entrée est réécrite ci-dessous sur les faits ; la décision d'ordonnancement, elle, reste la même. **Caught late: yes** pour l'affirmation fausse.

- **Date:** 2026-07-31 (corrigée le même jour)
- **Task affected:** ordre d'exécution du plan (T-A2 ↔ T-C1)
- **Original plan:** dernière ligne du plan d'impl — « **Ordre d'exécution :** T-A1 → T-A2 → T-B1 → T-B2 → T-B3 → T-B4 → T-C1 → T-C2 → Z1 ».
- **Deviation taken:** T-C1 (collection `projects` dans le `config.yml` Sveltia + garde-fou de test) a été exécutée **avant la fin de T-A2**, qui reste ouverte faute de sa 2ᵉ fiche. T-A2 reprendra dès que l'utilisateur aura publié les projets, puis T-B1 → T-B4, puis T-C2.
- **Reason:** l'utilisateur a retiré `resumexyz` du périmètre (cf. **D02**) ; la 2ᵉ fiche réelle exigée par R1 dépend donc d'un **push que seul lui peut faire**. T-A2 ne peut pas être close, et T-B1 → T-B4 non plus : leurs critères se vérifient sur des cartes et des fiches rendues (« la page rend **≥ 2** cartes »), donc une seule fiche ne permet pas de les valider. **T-C1 est la seule tâche du plan qui ne touche à aucun contenu** : elle ne modifie que `public/admin/config.yml` et `src/lib/cms-config.test.ts`, et ses assertions portent sur la config, pas sur des entrées. La faire maintenant ne consomme aucune décision future.
- **Reversibility:** cheap — aucune tâche n'est supprimée ni fusionnée, seul l'ordre change ; rien dans T-A2/T-B1-4 ne dépend d'un livrable de T-C1, et rien dans T-C1 ne dépend d'un contenu.
- **Caught late:** **yes** — non pas sur la décision d'ordonnancement (loggée avant exécution), mais sur l'**état du dépôt** qui la justifiait : l'entrée initiale et le ledger décrivaient un arbre sans contenu alors que le contenu était commité. Corrigé ci-dessus.
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-07-31 (« Je les approuve toutes », ratification groupée D01→D07).
- **Follow-up:** si rejeté, aucun code n'est à défaire — seul l'ordre des tâches restantes serait à rétablir. T-C2 (création réelle d'un projet via `/admin`) reste de toute façon **après** T-A2 : elle a besoin que la collection ait des entrées pour que la relation « Articles liés » soit choisissable dans le CMS.

**Leçon de processus, à appliquer pour le reste du plan :** vérifier `git log` **avant** d'écrire dans le ledger ce que le dépôt contient. Un subagent interrompu peut avoir commité ; l'interruption arrête le dialogue, pas le travail déjà fait.

---

## Template d'entrée

```markdown
## D<NN> — <titre court : ce qui a changé>

- **Date:** YYYY-MM-DD HH:MM
- **Task affected:** T-<x> (ou : nouvelle tâche T-<x>)
- **Original plan:** ce que la spec ou le plan d'impl disent, cité précisément (fichier, tâche, étape).
- **Deviation taken:** ce qui est fait à la place, en une ou deux phrases factuelles.
- **Reason:** le fait qui force l'écart — mesuré, pas supposé. Dire sur quoi il est établi (build réel, lecture du code source, réponse HTTP…) et ce qui reste non vérifié.
- **Reversibility:** `cheap` (au plus une tâche de rework) ou `expensive` (rework multi-tâches, données, ou déjà publié → NE PAS PROCÉDER, basculer sur une tâche indépendante).
- **Caught late:** no (loggé avant exécution) / **yes** (déjà exécuté au moment du log — dire pourquoi).
- **Status:** pending-user
- **User decision:** —
- **Follow-up:** ce qu'il faut défaire ou reprendre si l'utilisateur rejette.
```
