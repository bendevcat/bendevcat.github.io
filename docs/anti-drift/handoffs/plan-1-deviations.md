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

## D03 — 3 covers distantes (Unsplash) non migrées (articles sans cover)

- **Date:** 2026-07-19 03:40
- **Task affected:** B2
- **Original plan:** §6.1 mapping `image → cover` (co-localiser le fichier image, chemin relatif). Implicite : l'`image` source est un fichier local. R6 : « les images d'articles s'affichent ».
- **Deviation taken:** 3 des 6 articles publiés (`docker-kubernetes-devops`, `linux-commandes-essentielles`, `meilleurs-vpn-2025`) ont un `image:` = **URL Unsplash distante**, pas un fichier local. Le schéma `cover: image()` (B1) n'accepte que du **local**. Ces 3 articles sont migrés avec `cover` **omis** (champ optionnel). Les 3 autres publiés (`bienvenue`, `comment-jutilise-github-actions`, `k9s`) ont des images **locales** → co-localisées normalement.
- **Reason:** (1) `image()` ne peut pas référencer une URL distante ; (2) rapatrier les images = **télécharger des fichiers externes**, ce qui requiert l'accord explicite de l'utilisateur (règle de sécurité). Aucun téléchargement non autorisé. R6 « images co-localisées rendues » reste satisfait pour les images réellement locales. R2 n'exige PAS de cover (titre/date/catégorie/description seulement) → cartes valides sans cover.
- **Reversibility:** cheap (par article : si l'utilisateur autorise, télécharger + co-localiser les 3 covers, ou les re-couvrir via le CMS au Plan 2).
- **Caught late:** no (loggé avant exécution de B2).
- **Status:** pending-user
- **User decision:** — (options : (a) m'autoriser à télécharger+co-localiser les covers Unsplash ; (b) re-couvrir via CMS au Plan 2 ; (c) laisser ces 3 sans cover)
- **Follow-up:** selon décision (a/b/c).

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
