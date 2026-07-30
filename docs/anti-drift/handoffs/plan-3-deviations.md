# Plan 3 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut. Un statut assorti d'un commentaire (« approved, mais… ») n'est pas un statut valide : la Phase Z le ré-audite comme `pending-user`._

---

## D01 — T-C1 (CMS) exécutée avant T-A2, qui est bloquée côté utilisateur

- **Date:** 2026-07-31
- **Task affected:** ordre d'exécution du plan (T-A2 ↔ T-C1)
- **Original plan:** dernière ligne du plan d'impl — « **Ordre d'exécution :** T-A1 → T-A2 → T-B1 → T-B2 → T-B3 → T-B4 → T-C1 → T-C2 → Z1 ».
- **Deviation taken:** T-C1 (collection `projects` dans le `config.yml` Sveltia + garde-fou de test) est exécutée maintenant ; T-A2 reprend dès que les fiches réelles sont disponibles, puis T-B1 → T-B4, puis T-C2.
- **Reason:** l'utilisateur a retiré `resumexyz` du périmètre des fiches (« laisse tomber pour resumexyz, je vais voir pour push quelques projets locaux pour avoir de vrais exemples ») ; la 2ᵉ fiche réelle exigée par R1 dépend donc d'un **push que seul l'utilisateur peut faire**. T-A2 est bloquée, et T-B1→T-B4 le sont avec elle : leurs critères d'acceptation se vérifient sur des cartes et des fiches rendues (« la page rend ≥ 2 cartes », « ouvrir une fiche »), donc sans contenu il n'y a rien à vérifier. **T-C1 est la seule tâche du plan qui ne touche à aucun contenu** : elle ne modifie que `public/admin/config.yml` et `src/lib/cms-config.test.ts`, et ses assertions portent sur la config, pas sur des entrées. La faire maintenant ne consomme aucune décision future.
- **Reversibility:** cheap — aucune tâche n'est supprimée ni fusionnée, seul l'ordre change ; rien dans T-A2/T-B1-4 ne dépend d'un livrable de T-C1, et rien dans T-C1 ne dépend d'un contenu. Si l'utilisateur rejette, il suffit de reprendre l'ordre initial : le travail de T-C1 reste valable tel quel.
- **Caught late:** no (loggé avant exécution).
- **Status:** pending-user
- **User decision:** —
- **Follow-up:** si rejeté, aucun code n'est à défaire — seul l'ordre des tâches restantes serait à rétablir. T-C2 (création réelle d'un projet via `/admin`) reste de toute façon **après** T-A2 : elle a besoin que la collection ait déjà des entrées pour que la relation « Articles liés » soit choisissable dans le CMS.

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
