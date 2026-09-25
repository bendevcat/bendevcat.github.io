---
title: "Anti-Drift Planning"
name: anti-drift-planning
description: "Méthodologie de planification multi-sessions résistante à la dérive : specs binaires, anti-arbitrage silencieux, scope ledger, phase de vérification, lint mécanique."
type: claude-code
version: "0.4.0"
license: MIT
installCmd: "claude plugin marketplace add ~/workspace/anti-drift-planning && claude plugin install anti-drift-planning@anti-drift-marketplace"
tags: [anti-drift, planification, claude-code, méthodologie]
relatedPrompts: [bootstrap-session-anti-drift, decouper-un-projet-en-plans-anti-drift]
skillCount: 1
commandCount: 7
installNote: "La commande d'installation de cette fiche n'est pas exécutable en l'état."
highlights:
  - "Specs binaires. Chaque spec a une table de critères de succès avec une mesure pass/fail par exigence"
  - "Anti-arbitrage silencieux. Toute déviation est loggée avant d'être exécutée"
  - "Scope ledger. Un fichier par plan suit chaque exigence"
  - "Phase de vérification. La dernière phase de chaque plan est /anti-drift-planning:verify <N>"
  - "Invariants mécaniques. Ce qui est comptable est compté par du code"
triggers:
  - "roadmap"
  - "split into plans"
  - "multi-phase feature"
  - "avoid drift"
  - "session per plan"
  - "ne rien perdre entre les sessions"
  - "decompose into specs"
changelog:
  - version: "0.4.0"
    date: 2026-07-31
    text: "Lock 5 — mechanical invariants"
  - version: "0.3.0"
    date: 2026-06-27
    text: "Session chaining: /anti-drift-planning:verify N on a PASS verdict now emits the next actionable step automatically"
  - version: "0.2.0"
    date: 2026-06-11
    text: "Binary deviation test in the bootstrap prompt"
  - version: "0.1.0"
    date: 2026-05-10
    text: "Initial scaffold: plugin manifest, anti-drift-planning skill, 4 commands"
filesSource: "3dc3336"
files:
  - path: .claude-plugin/plugin.json
    lines: 20
    excerpt: |-
      {
        "name": "anti-drift-planning",
        "description": "Drift-resistant multi-session planning methodology — 5 locks (binary specs, anti-silent-arbitrage, scope ledger, verification phase, mechanical lint) for shipping multi-phase projects without losing scope between sessions",
        "version": "0.4.0",
        "author": {
          "name": "bendevcat",
  - path: commands/init.md
    lines: 31
    excerpt: |-
      ---
      description: Bootstrap the anti-drift methodology + folder structure in the current project. Creates <base>/{specs,plans,handoffs}/ (default docs/anti-drift/) and writes the methodology spec.
      allowed-tools: ["Read", "Write", "Bash", "Glob", "AskUserQuestion", "Skill"]
      ---

      # `/anti-drift-planning:init` — bootstrap a project

      Bootstraps this project to use the anti-drift planning methodology.

      ## Steps

      1. **Load the `anti-drift-planning` skill** first to absorb the methodology context.
      2. **Check current state** of the project — git status, existing `docs/` structure, CLAUDE.md if any. If a methodology spec already exists anywhere under `docs/*/specs/*-methodology.md`, abort with a clear message instead of overwriting (this command is idempotent).
      3. **Ask the user** (via `AskUserQuestion`):
         - What is the project's high-level vision or current gap to close?
         - Where should specs/plans/handoffs live? Default: `docs/anti-drift/`
  - path: commands/lint.md
    lines: 53
    excerpt: |-
      ---
      description: Check the mechanical invariants of the plan artifacts — spec/ledger coverage, deviation references, status vocabularies, required files, unfilled placeholders. Reports only; exits non-zero on any violation.
      allowed-tools: ["Bash", "Read", "Glob"]
      ---

      # `/anti-drift-planning:lint [N]` — check the mechanical invariants

      Methodology lock 5: what is countable is counted by code, not by prose review. This
      command runs that code. It never asks the user anything and never edits a file.

      ## Argument

      - `[N]` — optional plan number. Omitted, every plan in the roster is checked.

      ## Steps
  - path: commands/new-plan.md
    lines: 36
    excerpt: |-
      ---
      description: Write a new plan spec from the anti-drift template. Args - N (plan number) and topic (kebab-case). Prompts the user for goal, success criteria, and scope.
      allowed-tools: ["Read", "Write", "Bash", "Glob", "AskUserQuestion", "Skill"]
      ---

      # `/anti-drift-planning:new-plan <N> <topic>` — author a new plan spec

      Generate a new plan spec following the anti-drift binary-criteria format.

      ## Arguments

      - `<N>` — plan number (e.g., `5`)
      - `<topic>` — kebab-case short label (e.g., `agents-and-chat`)

      ## Steps
  - path: commands/resume.md
    lines: 30
    excerpt: |-
      ---
      description: Regenerate a resume prompt for a plan interrupted mid-execution (handoff). Reads the ledger to find where to continue. Outputs a ready-to-paste prompt.
      allowed-tools: ["Read", "Bash", "Glob"]
      ---

      # `/anti-drift-planning:resume <N>` — resume an interrupted plan

      Produce the prompt to paste as the first message of a fresh session that CONTINUES plan N from where the last session stopped (handoff: low context, or an `expensive` deviation that blocked progress).

      ## Argument

      - `<N>` — plan number to resume

      ## Steps

      1. **Resolve the base dir:** glob `docs/*/specs/*-methodology.md`. If no match, instruct the user to run `/anti-drift-planning:init` first and stop.
  - path: commands/start-session.md
    lines: 36
    excerpt: |-
      ---
      description: Generate the bootstrap prompt for a fresh execution session of plan N. Outputs a ready-to-paste prompt with paths and substitutions filled in.
      allowed-tools: ["Read", "Bash", "Glob"]
      ---

      # `/anti-drift-planning:start-session <N>` — prepare a fresh execution session

      Produce the bootstrap prompt to paste as the first message of a new Claude Code session for plan N.

      ## Argument

      - `<N>` — plan number to execute

      ## Steps

      1. **Resolve the base dir:** glob `docs/*/specs/*-methodology.md`. If no match, instruct the user to run `/anti-drift-planning:init` first and stop.
  - path: commands/status.md
    lines: 36
    excerpt: |-
      ---
      description: Cross-plan dashboard — per-plan ledger status, deviations, and milestone tags. Announces project completion when every plan has shipped clean.
      allowed-tools: ["Read", "Bash", "Glob"]
      ---

      # `/anti-drift-planning:status` — cross-plan dashboard & project-end audit

      Show the status of every plan in the project, and announce the project complete when all plans have shipped through Phase Z with zero pending decisions.

      ## Steps

      1. **Resolve the base dir:** glob `docs/*/specs/*-methodology.md`. If no match, instruct the user to run `/anti-drift-planning:init` first and stop.
      2. **Read the decomposition roster:** parse §4 of the methodology spec (the plan table). This is the authoritative list of planned plans. If §4 is empty, report "no plans defined yet — run `/anti-drift-planning:new-plan 1 <topic>`" and stop.
      3. **For each plan N in the roster:**
         - Locate the spec: glob `<base>/specs/*-plan-<N>-*.md`. If missing → status `not started (no spec)`.
         - Locate the ledger: `<base>/handoffs/plan-<N>-ledger.md`. If missing → status `not started`.
  - path: commands/verify.md
    lines: 70
    excerpt: |-
      ---
      description: Run the Phase Z verification audit for plan N. Runs the mechanical lint first, re-reads spec, marks every requirement Done/Deferred/Cut, checks deviations log has zero pending-user, runs the test suite, prompts for user-story walkthrough.
      allowed-tools: ["Read", "Edit", "Write", "Bash", "Glob", "AskUserQuestion", "Skill"]
      ---

      # `/anti-drift-planning:verify <N>` — run the Phase Z audit

      Execute the verification phase of plan N. **This command is the canonical implementation of Phase Z** (methodology lock 4) — the five audit steps live here and nowhere else. Non-skippable; the only path to the release script and the milestone tag.

      ## Argument

      - `<N>` — plan number to verify

      ## Steps

      1. **Load the `anti-drift-planning` skill** for context.
  - path: skills/anti-drift-planning/SKILL.md
    lines: 90
    excerpt: |-
      ---
      name: anti-drift-planning
      description: Use when a project must ship multiple features across separate sessions and the user wants to avoid silent scope cuts, invisible work-in-progress, or work going missing between sessions. Triggers on "roadmap", "split into plans", "multi-phase feature", "avoid drift", "session per plan", "ne rien perdre entre les sessions", "decompose into specs", or when a previously shipped milestone silently missed planned scope.
      ---

      # Anti-Drift Planning

      A methodology for shipping multi-phase projects across separate Claude Code sessions without losing scope, silently cutting features, or shipping incomplete work.

      ## When to use this skill

      Activate when:

      - The project's vision is significantly larger than one session can ship (multiple features, multiple subsystems)
      - The user is recovering from a previous cycle where work was lost silently
      - The user will run 2+ plan execution sessions sequentially and each must know what came before
---

Un plugin Claude Code — une skill et sept commandes — pour livrer un projet en
plusieurs sessions sans en perdre des morceaux en route. C'est la méthode avec
laquelle ce site est construit, plan par plan.

## Les cinq modes de panne qu'il ferme

1. **Plans trop haut niveau** — l'agent invente les détails manquants et dérive
   de décision en décision.
2. **Coupes de périmètre silencieuses** — l'agent arbitre « pas pertinent » sans
   remonter la décision.
3. **Aucune visibilité en cours de route** — impossible de dire ce qui est fait
   et ce qui a été sauté.
4. **Aucun contrôle final** — du travail incomplet ship sans qu'on le voie.
5. **Des faits comptables laissés à la relecture en prose** — une ligne de ledger
   supprimée, un log manquant, une entrée fantôme passent inaperçus.

À chaque mode de panne, un verrou. Et **chaque verrou a exactement un artefact
canonique** : ses règles détaillées ne sont jamais reformulées ailleurs, parce
qu'une règle reformulée dérive.

## Les cinq verrous

**1 · Specs binaires.** Chaque spec a une table de critères de succès avec une
mesure pass/fail par exigence — une commande, une sortie attendue, une manip de
démo. Verbes vagues interdits (`améliorer`, `supporter`, `gérer`, `peaufiner`,
`optimiser`).

**2 · Anti-arbitrage silencieux.** Toute déviation est loggée **avant** d'être
exécutée, toujours avec le statut `pending-user` — le seul qu'un agent ait le
droit d'écrire. Un défaut dans le texte du plan lui-même n'est *pas* une
déviation : il se corrige sur place et se note au ledger. Au-delà de trois
entrées en attente simultanément, c'est le plan qu'il faut refaire.

**3 · Scope ledger.** Un fichier par plan suit chaque exigence
(`Done` / `In progress` / `Pending` / `Deferred` / `Cut`), mis à jour et committé
après **chaque** tâche.

**4 · Phase de vérification.** La dernière phase de chaque plan est
`/anti-drift-planning:verify <N>`. C'est le seul chemin vers la mise en ligne et
le tag de milestone, et elle échoue sur toute déviation restée `pending-user`.

**5 · Invariants mécaniques.** Ce qui est comptable est compté par du code :
couverture spec↔ledger, vocabulaires de statuts, intégrité des références de
déviations, fichiers requis, placeholders non remplis, SHAs cités. 13 contrôles,
lancés comme première étape de `/verify`. Le code compte, la prose garde le
jugement.

Les verrous se couvrent mutuellement. En pressure test, les agents respectent
« logger avant d'agir » puis inventent des statuts plus doux — « resolved »,
« non-blocking » — pour passer le gate. D'où le verrou 2 qui fige le vocabulaire
et le verrou 4 qui l'audite.

## Le cycle d'une session

- **Phase A — audit et découpage.** Constater l'écart entre ce qui est livré et
  la vision, puis le découper en tranches **verticales** : 3 à 5, chacune livrant
  un résultat observable par l'utilisateur final. Chaque tranche devient un plan.
- **Phase B — écrire les artefacts.** `/anti-drift-planning:init` une fois, puis
  une spec par tranche. Seul le plan d'implémentation du **premier** plan est
  écrit maintenant : écrire les autres d'avance fabrique de la surface
  d'invalidation.
- **Phase C — passer la main.** Une session neuve par plan, démarrée par le
  prompt de bootstrap. C'est ce prompt qui porte le verrou 2. Ensuite la chaîne
  s'auto-propage : chaque `/verify` qui passe émet l'étape suivante.
- **Phase D — récap post-ship.** Compte de tests et statut du lint, comptes finaux
  du ledger, déviations avec leurs résolutions, et les reports éventuels — chacun
  tracé dans la spec du plan suivant, jamais en « todo » vague.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `/anti-drift-planning:init` | Bootstrappe la méthodologie et l'arborescence dans le projet |
| `/anti-drift-planning:new-plan <N> <topic>` | Écrit une spec de plan depuis le template |
| `/anti-drift-planning:start-session <N>` | Génère le prompt de bootstrap d'une session d'exécution |
| `/anti-drift-planning:verify <N>` | Lance l'audit de vérification ; sur PASS, émet l'étape suivante |
| `/anti-drift-planning:lint [N]` | Vérifie les invariants mécaniques ; sort en code ≠ 0 sur violation |
| `/anti-drift-planning:status` | Tableau de bord inter-plans ; annonce la fin du projet |
| `/anti-drift-planning:resume <N>` | Régénère le prompt de reprise d'un plan interrompu |

## La méthode a un budget

C'est la leçon qui a coûté le plus cher. La vérification doit coûter moins que
la dérive qu'elle évite — en décisions humaines (trois entrées en attente
maximum) comme en code (un contrôle de lint n'existe qu'après un échec
réellement observé). Une itération précédente de ce plugin a ignoré ce budget et
a produit un linter forensique dont son propre auteur a fini par ne plus lire la
file d'approbation. Les tags `archive/v0.4.0-*` la conservent comme
contre-exemple.

## Ce que ça donne en vrai

La méthode a été développée sur un autre projet, puis appliquée à ce site. Sur
ses trois premiers plans : 9, 7 et 7 critères, tous `Done` ; 27 déviations
loggées dont 3 rejetées ; zéro entrée laissée `pending-user` à la sortie.

## Installation

Le dépôt n'est pas accessible publiquement pour l'instant — c'est pourquoi tu ne
trouveras pas de lien vers lui sur cette fiche. Conséquence directe : **la
commande d'installation de cette fiche n'est pas exécutable en l'état**. Il lui
manque l'étape qui la précède, le `git clone` du dépôt vers un chemin local —
et c'est précisément cette étape-là que le 404 rend impossible.

Le reste décrit le fonctionnement réel : le clone fait office de marketplace à
lui tout seul, la commande enregistre cette marketplace puis installe le plugin
depuis elle, et il faut redémarrer Claude Code pour que la skill et les sept
commandes se chargent.
