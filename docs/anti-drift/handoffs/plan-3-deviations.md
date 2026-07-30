# Plan 3 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut. Un statut assorti d'un commentaire (« approved, mais… ») n'est pas un statut valide : la Phase Z le ré-audite comme `pending-user`._

---

## D03 — Durcissement du `pattern` de `repoUrl` / `demoUrl` (constat Important de la revue T-C1)

- **Date:** 2026-07-31
- **Task affected:** T-C1 (correctif post-livraison, round de fix 1)
- **Original plan:** plan d'impl, T-C1 Step 5, YAML imposé verbatim : `pattern: ['^https?://', 'Doit être une URL complète commençant par http:// ou https://']` sur `repoUrl` et `demoUrl`.
- **Deviation taken:** remplacer ce motif par un motif **ancré des deux côtés**, et ajouter un test qui confronte le motif au schéma Zod réel plutôt qu'à une liste d'exemples choisis.
- **Reason:** constat **Important** de la revue de tâche, **établi sur le bundle épinglé** puis reproduit en Node — pas déduit de la doc. Le validateur de champ `string` de Sveltia 0.175.1 fait `_A(n[0]).test(String(i))` : un `RegExp.test` **non ancré à droite**, qui ne vérifie donc qu'un préfixe. Conséquence mesurée : `https://`, `http://`, `https:///` et `http://exa mple.com` **passent** la validation du CMS et sont écrits dans le frontmatter, alors que `z.string().url()` les **rejette** — `astro build` échoue alors avec une `ZodError` sur `repoUrl`, après le commit. C'est exactement la classe de valeurs que ce `pattern` était censé arrêter : il donne aujourd'hui une fausse impression de garde-fou. Le défaut vient du plan lui-même, pas de l'implémenteur (le YAML a été repris verbatim).
- **Reversibility:** cheap (une expression régulière et un test).
- **Caught late:** no (loggé avant exécution du correctif).
- **Status:** pending-user
- **User decision:** —
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
- **Status:** pending-user
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
- **Status:** pending-user
- **User decision:** —
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
