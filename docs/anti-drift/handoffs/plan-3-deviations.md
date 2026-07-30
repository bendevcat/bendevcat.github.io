# Plan 3 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut. Un statut assorti d'un commentaire (« approved, mais… ») n'est pas un statut valide : la Phase Z le ré-audite comme `pending-user`._

**État au pré-flight : aucune entrée.**

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
