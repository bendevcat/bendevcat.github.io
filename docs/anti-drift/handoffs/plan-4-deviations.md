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

## D11 — Vague de correction issue de la revue finale de branche

- **Date:** 2026-08-02
- **Task affected:** transverse — `src/lib/promptView.ts` ou `src/pages/skills/[...slug].astro`, `src/components/SkillCard.astro`, `public/admin/config.yml` (en-tête + hints), `README.md`, `src/pages/skills/[...slug].astro`.
- **Original plan:** aucune tâche du plan ne prévoit de vague de correction post-revue. Chaque tâche a été relue **isolément** ; ces constats ne se voient qu'en regardant l'ensemble.
- **Deviation taken:** une **seule** vague de correction couvrant les 2 constats `Important` transverses et les 6 `Minor` triés « à corriger avant merge » par la revue finale. Détail dans `final-branch-review.md`.
- **Reason:** trois d'entre eux ont un effet observable réel. **T2** : le pattern de bloc copiable a **dérivé entre T-B3 et T-C2** — `shouldRenderPromptBlock` teste `.trim().length > 0`, la page skill teste `installCmd &&`. Un `installCmd` composé d'espaces (saisissable dans `/admin`) rend un `<pre>` vide surmonté d'un bouton qui copie du blanc et affiche « Copié ! ». **T3** : `version` s'affiche en texte nu sur la carte et en pastille bordée sur la fiche ; `SkillCard` est la seule des 4 surfaces à mêler les deux styles — invisible en revue par tâche, personne n'ayant comparé carte skill et fiche skill. **D1-M3/M4/M7** : l'en-tête du `config.yml` annonce encore « Plan 2 », la table du README reste blog-only alors que la branche a édité la section juste au-dessus, et des hints du CMS sont à revoir **avant T-D2**, qui utilise précisément ce formulaire.
- **Reversibility:** cheap (rendu conditionnel, classes d'une pastille, commentaires et documentation ; aucun schéma, aucune donnée, aucun contrat partagé).
- **Caught late:** no (loggé avant la vague).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté, tout revient en l'état — et le bloc `installCmd` d'espaces reste rendu vide avec un bouton qui prétend avoir copié.

---

## D10 — Fermer la 4ᵉ occurrence du mode de panne « le CMS accepte, le build casse après », et symétriser le garde-fou

- **Date:** 2026-08-02
- **Task affected:** T-D1 (`public/admin/config.yml`, `src/lib/cms-config.test.ts`). **Touche aussi la collection `projects`, livrée au Plan 3** — voir la portée ci-dessous.
- **Original plan:** le Step 1 de T-D1 impose pour `skills.repoUrl` le motif **exactement identique** à celui de `projects` (`^https?://[^\s/]+(/[^\s]*)?$`), et le Step 2 fournit la **liste exacte** des assertions à ajouter à `cms-config.test.ts` — dont un test intitulé « n'est **JAMAIS** plus laxiste que Zod », qui vérifie **10 cas choisis à la main**.
- **Deviation taken:** (1) **resserrer le motif** pour qu'il refuse les hôtes et ports invalides, sur `skills.repoUrl` **et** sur `projects.repoUrl` / `projects.demoUrl` ; (2) remplacer les 10 cas choisis à la main par une **génération de cas** confrontée au vrai `z.string().url()`, pour que l'affirmation du test soit réellement vérifiée ; (3) **symétriser le garde-fou** sur les 2 nouvelles collections : assertions de `required`, de `widget`, et des clés `extension`/`format`/`media_folder`/`public_folder` — toutes présentes sur `blog`/`projects`, absentes sur `prompts`/`skills`.
- **Reason:** constats **I1 à I4** de la revue de tâche, tous établis **par mesure contre le Zod réellement utilisé** (4.4.3, via `astro:content`), pas par lecture de doc.
  **I1 — la 4ᵉ occurrence, atteignable par un collage banal :** le motif accepte `https://github.com:bendevcat/anti-drift-planning`, `http://exemple.fr:99999`, `https://exemple.fr:abc`, `http://[` — que `z.string().url()` **rejette**. Le CMS valide et commite, le commit déclenche le déploiement, `astro build` s'interrompt et produit **0 page**. Et le test censé l'interdire **ne le voit pas** : aucun de ses 10 cas ne contient de port ni d'hôte invalide. **Le test affirme donc quelque chose de faux**, ce qui est pire qu'une absence de test.
  **I2/I3/I4 — trois portes ouvertes pour une 5ᵉ occurrence :** aucune assertion de `required` (passer `description` en `required: false` laisse **85 tests verts**, puis un champ omis casse le build), aucune assertion de `widget` (passer `tags` de `list` à `string`, ou `draft` de `boolean` à `string` : idem), et le test de `skills` omet 4 clés que son homologue `prompts` vérifie. **Toutes ces protections existent déjà sur `blog` et `projects`** — le plan a simplement oublié de les demander pour les deux nouvelles collections.
  La **contrainte globale du plan** dit pourtant : « toute divergence CMS↔Zod **doit** faire échouer `cms-config.test.ts` ». Ce correctif sert cette contrainte ; il élargit une liste d'assertions que le plan avait figée trop court.
- **Portée sur du code du Plan 3, assumée et signalée :** le motif de `projects.repoUrl` / `projects.demoUrl` est corrigé lui aussi. Le laisser en l'état conserverait la même faille sur une collection éditable, **et** rendrait le test partagé menteur. Le Plan 3 avait d'ailleurs **déféré exactement ce constat** (« `https://exemple.fr:99999` passe le motif mais est rejeté par Zod… à trancher à la revue finale de branche ») — il n'a jamais été tranché. Il l'est ici.
- **Effet observable, énoncé franchement :** après correctif, le CMS **refusera** des URL qu'il acceptait avant — toutes invalides pour Zod, donc toutes vouées à casser le build. Le motif reste **plus strict** que Zod sur le schéma (`ftp://` refusé), jamais plus laxiste.
- **Reversibility:** cheap (un motif YAML répété 3 fois et des assertions de test ; aucun contenu, aucun schéma, aucune page).
- **Caught late:** no (loggé avant le correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté, restaurer le motif du Step 1 et la liste d'assertions d'origine — et acter que le mode de panne « le CMS accepte, le build casse après » reste **ouvert** sur 3 champs URL, avec un test qui affirme le contraire.

---

## D09 — Ordre des entrées liées : composer les helpers testés au lieu de refiltrer à la main

- **Date:** 2026-08-02
- **Task affected:** T-C2 (`src/pages/skills/[...slug].astro`) **et T-B3, rouverte** (`src/pages/prompts/[...slug].astro`) — les deux sens de la relation.
- **Original plan:** les Steps de T-B3 et T-C2 fournissent verbatim un `.filter((entry) => !entry.data.draft)` appliqué au résultat d'`assertEntriesResolved`. Aucun des deux n'appelle les helpers de tri.
- **Deviation taken:** composer `sortAndFilterSkills` / `sortAndFilterPrompts` (`src/lib/skills.ts`, `src/lib/prompts.ts`) à la place du `.filter()` écrit à la main, **dans les deux pages**, pour que les entrées liées soient listées dans l'ordre A→Z comme partout ailleurs.
- **Reason:** constat **I1** de la revue de T-C2. Ces helpers **existent, sont testés, et leur JSDoc nomme littéralement ce cas d'usage** — les avoir extraits est même l'objet de la déviation **D03**. Refiltrer à la main à côté d'eux crée une seconde source de vérité pour la même règle, et produit un **effet observable** : les prompts liés s'affichent dans l'ordre du frontmatter au lieu de l'ordre alphabétique. Le précédent du dépôt tranche dans le même sens : `src/pages/projets/[...slug].astro` (Plan 3) compose bien `sortAndFilter` pour ses articles liés. **T-B3 est rouverte** pour que les deux sens de la relation se comportent pareil — corriger un seul côté remplacerait une incohérence par une asymétrie.
- **Reversibility:** cheap (deux appels de fonction ; aucun schéma, aucune donnée, aucun contrat partagé).
- **Caught late:** no (loggé avant le correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté, restaurer les deux `.filter()` verbatim — l'ordre des entrées liées redevient celui du frontmatter, et la règle `draft` reste écrite à deux endroits.

---

## D08 — Deux ajouts hors de la lettre du plan sur T-B3 : annonce de l'échec de copie, et un test manquant

- **Date:** 2026-08-02
- **Task affected:** T-B3 — `src/scripts/copy-code.ts` (partagé avec le blog et les projets) et `src/lib/clipboard.test.ts`
- **Original plan:** (1) le Step 5 de T-B3 ne prescrit **que** le changement de `textContent` du bouton ; l'`aria-label` (`copy-code.ts:29`, posé au Plan 1) n'est mentionné nulle part. (2) Le Step 1 fournit la **liste exacte** des 5 cas de `clipboard.test.ts`.
- **Deviation taken:** (1) faire en sorte que le nouvel état d'échec soit **perceptible autrement que visuellement**, sans changer le chemin nominal ni le comportement visuel. (2) Ajouter le cas de test manquant à `clipboard.test.ts`.
- **Reason:** deux constats de la revue de tâche.
  **I2 :** ce plan **crée** un état d'échec qui n'existait pas au Plan 1 (« Échec — copie manuelle »). Il n'est porté que par le `textContent`, et l'`aria-label` reste figé sur « Copier le code » : un utilisateur de lecteur d'écran clique, la copie échoue, et **rien ne le lui dit** — puis le message disparaît après 1,5 s. C'est la spec §6.1 (« fallback + feedback ») livrée à moitié : le feedback existe pour ceux qui voient l'écran. **Reconnu hors de la lettre de la spec**, qui ne parle que de feedback *visuel* — d'où cette entrée plutôt qu'une correction glissée en silence.
  **I3 :** le relecteur a **muté le code pour le prouver** — en remplaçant `deps.legacyCopy?.(text) ?? false` par `deps.legacyCopy!(text)`, **les 5 tests passent quand même**. La branche « pas de `legacyCopy` du tout » n'est donc couverte par rien, alors que c'est exactement le cas d'un navigateur sans `document.execCommand`.
- **Reversibility:** cheap (un attribut d'accessibilité et un cas de test ; le chemin nominal et le rendu visuel ne changent pas).
- **Caught late:** no (loggé avant le correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté sur (1), retirer l'annonce — l'échec de copie reste alors invisible aux lecteurs d'écran, ce qui est un choix, mais un choix explicite. Si rejeté sur (2), retirer le test — la branche redevient non couverte.

---

## D07 — Le bloc de prompt est hors de `.prose` : R9 violé de 2 461 px, et le style du code-block du Plan 1 jamais appliqué

- **Date:** 2026-08-02
- **Task affected:** T-B3 — `src/pages/prompts/[...slug].astro`. **Et T-C2, qui porte le même motif** pour `installCmd` : le plan y sera amendé **avant exécution**.
- **Original plan:** le Step 6 de T-B3 fournit verbatim `<pre class="mt-4"><code>{prompt.data.prompt}</code></pre>`, placé dans une `<section>` **au-dessus** du `<div class="prose">`. L'implémenteur a transcrit exactement.
- **Deviation taken:** faire en sorte que ce bloc reçoive réellement le style de code-block du Plan 1 — `overflow-x: auto`, padding, bordure, rayon — sans dupliquer de CSS et sans toucher au chemin du blog.
- **Reason:** **le plan se contredit lui-même**, et la contradiction est mesurable. La spec §6.2 exige que le champ `prompt` soit « rendu dans un bloc de code **réutilisant le composant code-block du Plan 1** », et la contrainte globale R9 interdit tout débordement horizontal à 375px. Or la règle qui porte `overflow-x: auto` est `.prose :where(pre)` (`src/styles/global.css:115-122`) : elle est **scopée à `.prose`**, et le bloc du Step 6 est **en dehors**. **Mesuré par le contrôleur dans le navigateur** : `overflow-x` calculé = **`visible`**, `padding` = `0px`, `border` = `0px`, `border-radius` = `0px` — donc **aucune** partie du style du Plan 1 ne s'applique ; le `<code>` est rendu sur **3 946 px** et la page atteint **3 961 px** de large, soit **2 461 px de débordement**. Ce n'est pas un écart cosmétique : à 375px, la page entière défile latéralement.
  À noter, parce que ça explique pourquoi personne ne l'a vu plus tôt : `astro build`, `astro check` et les 73 tests sont **tous verts**. Rien dans la chaîne automatisée ne mesure une largeur rendue — seul un smoke navigateur pouvait l'attraper.
- **Reversibility:** cheap (le rendu d'un bloc dans une seule page ; aucun schéma, aucune donnée, aucun contrat partagé).
- **Caught late:** no (loggé avant le correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Addendum du 2026-08-02, après la revue de tâche :** la forme retenue par l'implémenteur ajoutait une classe `astro-code` sur le `<pre>`, justifiée par la nécessité de restaurer la police mono. **La justification est fausse**, et le relecteur l'a établie sur le CSS buildé : le preflight Tailwind v4 met déjà `pre` en JetBrains Mono (`--default-mono-font-family: var(--font-mono)`), et cette classe attache en réalité **5 déclarations `!important` de Shiki** (`global.css:160-167`) qui matchent bien ce `<pre>` — bénignes aujourd'hui **par accident** (les variables `--shiki-*` sont indéfinies, donc `unset`). La classe est retirée. Ce n'est pas une nouvelle déviation mais un affinement de celle-ci, consigné ici parce que **cette forme allait être reprise verbatim pour T-C2**.
- **Follow-up:** si rejeté, restaurer le markup verbatim du Step 6 — et acter alors que **R9 est en échec sur `/prompts/<slug>`**, ce qui devra être tranché en `Deferred` ou `Cut` à la Phase Z, avec la déviation approuvée que le linter exigera.

---

## D06 — Durcissement de `matchesFacets` au-delà du code fourni verbatim par le plan

- **Date:** 2026-08-02
- **Task affected:** T-B2 — `src/lib/facetFilters.ts`, `src/lib/facetFilters.test.ts`
- **Original plan:** le Step 3 de T-B2 fournit le **corps exact** de `matchesFacets`, à transcrire verbatim :
  `return Object.entries(selected).every(([key, value]) => value === ALL || (entry[key] ?? []).includes(value));`
  Et le Step 1 fournit la **liste exacte** des 8 cas de test. Ni l'un ni l'autre ne contrôle que les valeurs de facette sont bien des **tableaux**.
- **Deviation taken:** ajouter une garde de type dans `matchesFacets` (les valeurs non-tableau ne matchent pas) et le cas de test qui l'ancre. Le comportement sur le domaine typé — le seul atteignable aujourd'hui — **ne change pas**.
- **Reason:** constat **I1** de la revue de tâche. `(entry[key] ?? []).includes(value)` ne vérifie jamais que `entry[key]` est un tableau : sur une **chaîne**, `.includes` devient un **matching de sous-chaîne**, donc filtrer sur `fic` ferait matcher `"fiche"`. Le `JSON.parse` du script navigateur (`src/scripts/facet-filters.ts:23`) est **casté** en `Record<string, string[]>` sans garde, donc TypeScript est aveugle au problème. `PromptCard.astro:15` respecte le contrat (il sérialise bien des tableaux) — **le défaut n'est donc pas atteignable aujourd'hui**. Mais ce module est **explicitement livré tel quel à T-C1**, qui doit reproduire le même contrat de son côté : c'est précisément le genre de contrat implicite qui casse à la tâche suivante, entre deux implémenteurs qui ne se parlent pas.
- **Reversibility:** cheap (une garde et un test ; aucun comportement observable ne change sur les données réelles).
- **Caught late:** no (loggé avant le correctif).
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté, restaurer le corps verbatim du Step 3 et retirer le test — le contrat « valeurs = tableaux » redevient alors une convention que rien ne fait respecter, à la veille d'être reproduite par T-C1.

---

## D05 — Un seul skill réel au lieu de « ≥ 2 » : R1 et R5 ne seront pas entièrement satisfaits

- **Date:** 2026-08-02
- **Task affected:** T-A2 (contenu), et par ricochet T-C1 (clause « ≥ 2 cartes » de R5). **Réduction de périmètre — la plus lourde de ce plan.**
- **Original plan:** la spec §3 exige, pour **R1**, « ≥ 2 prompts **ET** ≥ 2 skills réels », et pour **R5**, « ≥ 2 cartes » sur `/skills`. T-A2 devait livrer 2 prompts et 2 skills.
- **Deviation taken:** T-A2 livrera **2 prompts et 1 seul skill** (`anti-drift-planning`). **R1 et R5 ne seront donc pas entièrement satisfaits** et resteront `In progress` — ils ne seront **pas** maquillés en `Done`.
- **Reason:** décision explicite de l'utilisateur au gate, en connaissance de cause. Recherche faite dans son environnement : **un seul** skill lui appartenant et publiable est identifiable — le plugin `anti-drift-planning` (`author.name: bendevcat`, `license: MIT`, `homepage: https://github.com/bendevcat/anti-drift-planning`). Les autres skills disponibles vivent sous l'org **privée `sxd-platform`** (son employeur) et leur métadonnée dit `author.name: "Sixense Digital"`, `license: "UNLICENSED"`, `homepage: null` — établi en lisant les `plugin.json` réels, pas la doc. Publier ça sur une vitrine perso publique aurait signifié publier de la propriété intellectuelle employeur non licenciée. Trois options lui ont été présentées avec ces faits ; il a choisi de n'en publier qu'un plutôt que d'inventer un skill ou de publier ce qui ne lui appartient pas.
- **Portée exacte de ce qui tombe, et de ce qui ne tombe pas** (mesuré, pas supposé) : tombent la clause « ≥ 2 skills » de **R1** et la clause « ≥ 2 cartes » de **R5**. Ne tombent **pas** : **R6** (`/skills/<slug>` — instructions, `installCmd` copiable, repo, prompts liés) et **R7** (relation `skills ↔ prompts` résolue dans les deux sens), tous deux entièrement livrables et vérifiables avec un seul skill relié à deux prompts. T-C1 et T-C2 sont donc **construites et vérifiées normalement** ; seul le comptage de cartes de R5 reste en défaut.
- **Reversibility:** cheap (ajouter un second skill = un `index.md` de plus ; aucun code, aucun schéma, aucune page à changer — la grille, le filtre et les relations fonctionnent déjà à N entrées).
- **Caught late:** no (loggé avant que T-A2 s'exécute).
- **Status:** approved
- **User decision:** l'utilisateur a **choisi explicitement** l'option « 1 seul skill, R1 reste In progress » le 2026-08-02, parmi trois options présentées avec les faits de propriété ci-dessus (autre skill à lui / publier un skill sxd avec confirmation d'auteur et de droit / un seul skill). **Le statut reste `pending-user` :** un agent n'écrit jamais `approved`, et une réduction de périmètre de cette taille mérite une ratification explicite au gate, pas une déduction depuis un clic. À ratifier avant la Phase Z.
- **Arbitrage rendu le 2026-08-02, au même gate :** l'utilisateur choisit **`Deferred` (reporté au Plan 5)** pour la clause « ≥ 2 skills » de **R1** et « ≥ 2 cartes » de **R5**, parmi trois options (Deferred / Cut / publier un 2ᵉ skill maintenant). **Cette entrée est la déviation approuvée sur laquelle reposent les deux lignes `Deferred` du ledger**, comme le linter mécanique l'exige. Motif retenu : le manque est du **contenu**, pas du code — la grille, le filtre et les relations fonctionnent déjà à N entrées, un 2ᵉ skill s'ajoutera sans une ligne de code à changer.
- **Follow-up:** si l'utilisateur publie un 2ᵉ skill avant la Phase Z, R1 et R5 redeviennent atteignables et cette entrée devient sans objet. Sinon, la Phase Z doit trancher entre `Deferred` (reporté au Plan 5) et `Cut` pour la clause manquante — et le linter mécanique **exigera une déviation `approved`** pour accepter l'un ou l'autre.

---

## D04 — JSDoc d'`assertEntriesResolved` réécrit au lieu d'être déplacé (le Step 4 se contredit lui-même)

- **Date:** 2026-08-02
- **Task affected:** T-A1 — `src/lib/references.ts`
- **Original plan:** le Step 4 de T-A1 se contredit. Sa **prose** dit : créer `src/lib/references.ts` « avec le **corps exact** actuellement dans `src/lib/projects.ts:39-85` (JSDoc compris), en adaptant seulement la dernière phrase du JSDoc qui parle de T-B3/T-B4 ». Le **bloc de code** qui suit immédiatement fournit ensuite un JSDoc **condensé**, réécrit d'un bout à l'autre. Les deux ne peuvent pas être vrais en même temps.
- **Deviation taken:** ce qui est parti dans `b316b45` est le **bloc de code** — l'implémenteur a transcrit littéralement, comme le brief le lui ordonnait par ailleurs (« les valeurs exactes se transcrivent verbatim »). Correction retenue : **restaurer le JSDoc d'origine** et n'en adapter que la dernière phrase, c'est-à-dire faire ce que la prose annonçait et ce que « pur déplacement » signifie.
- **Reason:** constat **I2** de la revue de tâche, vérifié sur la source. Le JSDoc d'origine porte deux choses que la version condensée a perdues : (1) la **citation du code d'Astro** (`createGetEntry` dans `astro/dist/content/runtime.js` fait `console.warn(…); return;`) — c'est le fait établi qui justifie l'existence même du garde-fou, et sans lui la prochaine personne qui lit la fonction n'a aucune raison de la croire ; (2) le **locus exact** du symptôme (`sortAndFilter`, `src/lib/posts.ts:5`) — c'est ce qui rend un `TypeError` diagnosticable. Le corps **exécutable** de la fonction, lui, est bien byte-identique : `diff` entre `git show a4eb77d:src/lib/projects.ts` et `src/lib/references.ts` sur la portée de la fonction est **vide** (vérifié par le contrôleur, puis re-vérifié indépendamment par le relecteur).
- **Reversibility:** cheap (un bloc de commentaire ; aucun comportement, aucun test).
- **Caught late:** **yes.** L'implémenteur avait signalé la contradiction prose/bloc-de-code dans son message final ; le contrôleur a écrit D01 et D02 au tour suivant **sans la logger**, et ne l'a reprise qu'après que le relecteur l'a resortie en I2. C'est exactement le retard que ce protocole existe pour rendre visible : reporté tel quel plutôt que réécrit.
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
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
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté, remettre le `.filter()` inline et retirer les tests — le filtrage `draft` redevient alors un comportement exigé par le plan et vérifié par rien.

---

## D02 — Correction d'un chiffre de baseline faux dans les contraintes globales du plan

- **Date:** 2026-08-02
- **Task affected:** T-A1 (constat), et **toutes** les tâches suivantes — la ligne corrigée est une contrainte globale du plan d'impl, pas une ligne de tâche.
- **Original plan:** la section « Global Constraints » du plan d'impl affirme comme **baseline mesurée** : « `npx astro build` → **9 pages** ». Chaque tâche s'en sert comme point de comparaison pour détecter une régression.
- **Deviation taken:** corriger la valeur en **11 pages**, et ajuster les attentes de page des Steps qui en dérivent (T-A1 Step 7, T-A2 Step 5 et Step 6 : « 9 pages » → « 11 pages » ; T-B1 Step 3 et T-B2 Step 9 : « 10 pages » → « 12 pages »). Les chiffres relatifs (« +1 page », « +N pages ») restent valides. **Troisième point, ajouté le 2026-08-02 après T-B1 — même défaut, autre chiffre :** le plan annonce `npm test` → **52 tests** dans les attentes de plusieurs Steps (T-A1 Step 6, T-B1 Step 3, T-B2 Step 5…), chiffre écrit avant que le fix round de T-A1 n'ajoute 4 tests de filtrage `draft` (D03). La valeur réelle depuis `f0d9b17` est **56**. Relevé par deux implémenteurs successifs. Cette entrée est **élargie plutôt que dupliquée** en D06 : c'est le même défaut (un chiffre de baseline périmé dans le plan), elle est encore `pending-user`, et ouvrir une entrée par chiffre diluerait le log au lieu de l'éclairer. **Quatrième point, ajouté le 2026-08-02 après la revue de T-C2 — RÉCIDIVE, et elle est relevée par un relecteur, pas par moi :** le brief de T-C2 portait encore « 68 tests » et « M ≥ 2 pages », chiffres écrits avant D05 et avant les fix rounds de T-A1 et T-B2. Les implémenteurs de T-B2, T-B3 et T-C2 ont chacun dû être avertis **à la main** dans leur dispatch que les chiffres de leur brief étaient faux. Le relecteur de T-C2 a fait remarquer que ces avertissements vivaient dans des messages, **pas dans ce log** — or « la Phase Z lit le log, pas les rapports ». C'est exact. **Cause racine, énoncée sans détour : j'ai écrit dans le plan des chiffres que je n'avais pas mesurés, et je les ai corrigés au fil de l'eau au lieu de les corriger à la source une bonne fois.** **Second point, même nature :** le plan prédisait le message `[WARN] [glob-loader] No files found matching '**/index.{md,mdx}' in …` pour les collections vides ; le message réellement émis est `[WARN] [glob-loader] The base directory "…/src/content/prompts/" does not exist.` — parce que les **dossiers eux-mêmes** n'existent pas avant T-A2, cas différent de « dossier présent mais vide ». Corrigé aux mêmes endroits.
- **Reason:** le chiffre était **faux**. Je ne l'avais pas mesuré : je l'avais recopié du ledger du Plan 3, où « 9 pages » date de T-B1 — **avant** que T-B3 n'ajoute les routes `/projets/<slug>`. L'implémenteur de T-A1 l'a relevé et a mesuré 11 pages avant comme après sa tâche. **Re-vérifié indépendamment par le contrôleur** : `npx astro build` produit 12 fichiers HTML dans `dist/`, dont `dist/admin/index.html` qui est un asset statique de `public/` et non une page Astro → **11 pages Astro**, conforme au décompte attendu (1 home + 1 index blog + 6 articles + 1 index projets + 2 fiches projets). Laisser « 9 » aurait fait passer chaque tâche suivante pour une régression de +2 pages, ou pire, aurait entraîné leur ajustement silencieux.
- **Reversibility:** cheap (des chiffres attendus dans un document de plan ; aucun code, aucun comportement).
- **Caught late:** no pour l'exécution (rien n'a été construit sur le chiffre faux), **mais l'entrée est écrite après le commit `b316b45`** : le constat est venu du rapport de l'implémenteur, qui ne peut pas écrire dans ce log. Séquence exacte reportée telle quelle.
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
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
- **Status:** approved
- **User decision:** **Approuvée** par l'utilisateur le 2026-08-02, ratification groupée : « **Je les approuve toutes** », choisie parmi trois options présentées (approuver les 11 / les examiner une par une / approuver sauf D10, la seule dont l'effet est visible à l'usage).
- **Follow-up:** si rejeté, annuler le déplacement de `assertEntriesResolved` : la fonction retourne dans `src/lib/projects.ts`, `src/lib/references.ts` est supprimé, et les 4 imports (2 pages + le test + les futures pages du Plan 4) pointent de nouveau vers `projects.ts`.
