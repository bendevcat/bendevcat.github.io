# Plan 1 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`._

## D01 — Drapeau `--typescript strict` retiré de la commande de scaffold

- **Date:** 2026-07-19 02:27
- **Task affected:** A1
- **Original plan:** `npm create astro@latest -- --template minimal --no-install --no-git --typescript strict ./_astro_tmp`
- **Deviation taken:** commande exécutée sans `--typescript strict` (avec `--yes` par sécurité). Le drapeau `--typescript` **n'existe plus** dans `create-astro@5.2.2` (vérifié via `--help`) ; le passer corrompait le parsing (dossier parasite nommé `--typescript`). Le template `minimal` courant applique déjà `"extends": "astro/tsconfigs/strict"` par défaut → exigence « strict TS » satisfaite sans édition.
- **Reason:** la commande du plan est stale (CLI Astro a supprimé le drapeau en amont). Adaptation pré-autorisée par le contrôleur pour atteindre le **même** résultat.
- **Reversibility:** cheap (détail d'invocation CLI ; l'état final est identique en substance).
- **Caught late:** no
- **Status:** pending-user
- **User decision:** —
- **Follow-up:** si rejeté, aucune remédiation de code — corriger la ligne de commande dans le plan d'impl.

## D02 — `.gitignore` du repo conservé au lieu de celui du template

- **Date:** 2026-07-19 02:27
- **Task affected:** A1
- **Original plan:** `rsync -a --exclude .git _astro_tmp/ .` (seul `.git` exclu → le `.gitignore` du template écraserait celui du repo)
- **Deviation taken:** `rsync -a --exclude .git --exclude .gitignore _astro_tmp/ .` — le `.gitignore` pré-existant du repo est conservé intact.
- **Reason:** le `.gitignore` existant est un **sur-ensemble** de celui du template et il ignore notamment `.superpowers/` (contenu local réel `brainstorm/`). Laisser le template écraser aurait fait committer `.superpowers/` via le `git add -A` du Step 3 — changement non voulu. Vérifié après coup : `.superpowers/`, `dist/`, `node_modules/` restent ignorés ; seuls les 10 fichiers de scaffold légitimes sont committés.
- **Reversibility:** cheap (un seul fichier ; `cp` de la version template en < 1 min).
- **Caught late:** no
- **Status:** pending-user
- **User decision:** —
- **Follow-up:** si rejeté, copier le `.gitignore` du template et re-vérifier qu'aucun contenu local n'est balayé.

<!--
Template for a new deviation:

## D{{NN}} — <short title>

- **Date:** YYYY-MM-DD HH:MM
- **Task affected:** T{{NN}}
- **Original plan:** <quote from spec or plan>
- **Deviation taken:** <what was actually done>
- **Reason:** <why>
- **Reversibility:** cheap (≤ 1 tâche de rework) | expensive (plusieurs tâches / données / déjà publié)
- **Caught late:** no | yes
- **Status:** pending-user
- **User decision:** <renseigné après décision explicite de l'utilisateur>
- **Follow-up:** <si rejeté, la remédiation>
-->
