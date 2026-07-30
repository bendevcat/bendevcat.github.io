# Plan 2 — Deviations log

_Append entries here whenever a task cuts scope, changes approach, or hits a blocker — BEFORE executing anything else (methodology §2.2)._

_Le seul statut qu'un agent écrit est `pending-user` ; seul l'utilisateur passe une entrée en `approved` / `rejected`. Il n'existe pas de troisième statut._

## D01 — En développement local, l'URL du CMS est `/admin/index.html` et non `/admin/`

- **Date:** 2026-07-30 21:05
- **Task affected:** T-A1 (constat) → impacte T-B2 (Step 1) et T-C1 (bloc README du workflow local)
- **Original plan:** spec §3 R7 « Suivre le README : `astro dev` → `/admin` → "Work with Local Repository" » ; plan d'impl T-B2 Step 1 « Ouvrir `http://localhost:4321/admin/` » ; plan d'impl T-C1, bloc README « Ouvrir <http://localhost:4321/admin/> ».
- **Deviation taken:** la documentation du workflow **local** indiquera `http://localhost:4321/admin/index.html`. L'URL de **production** reste `https://bendevcat.github.io/admin/`, inchangée.
- **Reason:** mesuré côté contrôleur, serveur de dev Astro 7 (`npx astro dev`) : `/admin` → **404**, `/admin/` → **404**, `/admin/index.html` → **200**. Le serveur de dev (middleware statique Vite) ne résout pas l'index de répertoire pour les fichiers de `public/`. En production-like (`astro build` + `astro preview`, même service de fichiers que GitHub Pages) les quatre URL répondent **200** — donc **R1 n'est pas affecté** et le critère « ouvrir `/admin` » reste vrai là où l'utilisateur final l'ouvre. Seul le pas-à-pas local est concerné. Alternatives écartées : (a) ajouter une redirection Astro `/admin` → `/admin/index.html` collisionne avec le fichier statique `dist/admin/index.html` et modifierait `astro.config.mjs` (interdit par les contraintes globales) ; (b) documenter une URL qui renvoie 404 rendrait R7 invérifiable en le suivant.
- **Reversibility:** cheap (une URL dans le README + une étape de T-B2 ; aucun code applicatif, aucun contenu).
- **Caught late:** no (loggé avant l'exécution de T-B2 et T-C1).
- **Status:** pending-user
- **User decision:** <renseigné après décision explicite de l'utilisateur>
- **Follow-up:** si rejeté, il faut choisir explicitement une autre issue : soit documenter `/admin/` en local en acceptant le 404 (R7 devient invérifiable), soit ouvrir `astro.config.mjs` pour tenter une redirection (au risque d'un conflit avec le fichier statique).

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
