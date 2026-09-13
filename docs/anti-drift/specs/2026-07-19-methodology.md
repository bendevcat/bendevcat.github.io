# Site perso benCat — Multi-session execution methodology · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** ancien site Hugo + Decap CMS (`bencat-website`) ; spec de design [`2026-07-19-site-perso-design.md`](./2026-07-19-site-perso-design.md)
**Target:** methodology shared across plans 1–8 (vague 1 : plans 1–5 ; vague 2 — refonte visuelle : plans 6–8, voir §4.2)

---

## 1. Why this methodology

Le site perso de benCat passe de **Hugo + Decap CMS** à une stack **Astro v5 + Tailwind v4 + Sveltia CMS**, déployée sur **GitHub Pages + domaine custom**. La vision (voir la [spec de design](./2026-07-19-site-perso-design.md)) dépasse largement une seule session : 4 collections de contenu (blog, projets, prompts, skills), un CMS headless, un thème sur-mesure « dark editorial-dev », la migration des ~15 articles existants, et un déploiement avec domaine.

**Gap actuel :** greenfield → site complet.

Sans cadre, ce type de build multi-sessions **perd du périmètre en silence** : une page à moitié faite, une collection oubliée, un critère validé « à peu près ». Cette méthodologie découpe la vision en **5 slices verticaux** — chacun livrant un résultat observable par l'utilisateur final — pour que rien ne se perde entre les sessions.

## 2. The 5 locks (verrous)

Each lock has ONE canonical artifact. This section names the rules; the detailed wording lives in the artifact and is not restated here — restated rules drift.

### 2.1 Lock 1 — Binary specs

**Rule:** every spec contains pass/fail measurable acceptance criteria, an explicit list of non-goals, and a testable user story. No vague verbs (`improve`, `support`, `handle`, `polish`, `optimize`) — only concrete actions (`add column X`, `render <Y> when state Z`, `return error E when input I`).

**Canonical artifact:** the plan spec template (`docs/anti-drift/specs/*-plan-N-*.md` all follow it).

### 2.2 Lock 2 — Anti-silent-arbitrage

**Rule:** every deviation from the spec or plan is logged BEFORE being executed, always with status `pending-user` — the only status an agent may write. Only the user approves or rejects. Subagent reports must explicitly list "what I did NOT do and why".

**Canonical artifact:** the bootstrap prompt pasted at the start of every execution session. It carries the binary "is this a deviation?" test, the status rule, the reversibility protocol (cheap → proceed while pending; expensive → stop), and the rationalization counters. Do not paraphrase those rules here or anywhere else.

### 2.3 Lock 3 — Scope ledger

**Rule:** one file per plan tracks every requirement's status in real time (`Done` / `In progress` / `Pending` / `Deferred` / `Cut`). Updated and committed after EVERY task — end-of-session batches are reconstructions, not records.

**Canonical artifact:** `docs/anti-drift/handoffs/plan-N-ledger.md` (see ledger template).

### 2.4 Lock 4 — Verification phase

**Rule:** the last phase of every plan is a non-skippable audit. It is the only path to the release script and the milestone tag, and it fails on any `pending-user` deviation.

**Canonical artifact:** `/anti-drift-planning:verify N` — the audit steps (mechanical lint first, then spec coverage, user-story walkthrough, tests, visual smoke, deviations review) live in that command and nowhere else.

### 2.5 Lock 5 — Mechanical invariants

**Rule:** what is countable is counted by code, never by prose review — spec ↔ ledger coverage in both directions, status vocabularies, deviation references, required files per plan, unfilled placeholders, commit SHAs that must resolve. Code counts; prose keeps judgment. The check runs as the first step of the verification phase, and on demand mid-plan. **Guardrail:** a new check is added only for a failure observed in a real run — a linter grown speculatively becomes a cost nobody reads.

**Canonical artifact:** `/anti-drift-planning:lint [N]`. The checks themselves live in `scripts/anti_drift_lint.py` (its `CHECKS` tuple) and nowhere else — their number and their content are that file's business, not this document's.

## 3. Bootstrap prompt per session

Generate it with `/anti-drift-planning:start-session N` and paste it as the first message of each fresh execution session. Fresh context per plan is deliberate: it prevents drift inherited from prior conversations.

**Session chaining:** after the first plan you rarely run `start-session` by hand. When a plan's Phase Z passes, `/anti-drift-planning:verify N` automatically emits the next actionable step — the next plan's bootstrap if its spec exists, otherwise `/anti-drift-planning:new-plan N+1`, and when N is the last plan, the cross-plan audit `/anti-drift-planning:status`, which announces project completion. A plan interrupted mid-execution is resumed with `/anti-drift-planning:resume N`. Emission happens only on a PASS verdict — a failed or pending plan never hands off forward.

## 4. Decomposition into 8 plans (vertical slicing)

| Plan | Topic | User-facing goal (binary) | Spec path |
|---|---|---|---|
| **P1** | socle-blog-deploye | « Le blog est en ligne (github.io) et lisible, en thème dark editorial-dev » | [`…-plan-1-socle-blog-deploye.md`](./2026-07-19-plan-1-socle-blog-deploye.md) |
| **P2** | cms-sveltia | « Je publie/édite les articles sans toucher au code (Sveltia CMS) » | [`…-plan-2-cms-sveltia.md`](./2026-07-19-plan-2-cms-sveltia.md) |
| **P3** | vitrine-projets | « On peut parcourir mes fiches projets » | [`…-plan-3-vitrine-projets.md`](./2026-07-19-plan-3-vitrine-projets.md) |
| **P4** | librairies-prompts-skills | « Mes prompts et mes skills sont parcourables et copiables » | [`…-plan-4-librairies-prompts-skills.md`](./2026-07-19-plan-4-librairies-prompts-skills.md) |
| **P5** | recherche-et-pages | « On cherche et on découvre (recherche, tags, à-propos, transparence-IA) » | [`…-plan-5-recherche-et-pages.md`](./2026-07-19-plan-5-recherche-et-pages.md) |
| **P6** | socle-design-system | « Tout le site a la nouvelle peau — tokens, polices, nav en pilules, clair et sombre — et aucune page n'a changé de structure » | [`…-plan-6-socle-design-system.md`](./2026-09-12-plan-6-socle-design-system.md) |

**Order:** strictly sequential (each plan builds on the previous). Each plan is executed in its own fresh Claude Code session.

**Implementation plans:** only the first plan of a wave has its impl plan written upfront. Subsequent impl plans are written at the start of their execution session, from the spec + the real state of the repo after the previous plan. Same rule for the spec itself from P7 onward: it is authored with `/anti-drift-planning:new-plan <N>` when the wave reaches it, and its roster cell above is filled at that moment.

### 4.1 Vague 1 — construction du site (P1–P5)

Greenfield → site complet. Livrée : `v1.0.0`, tag `milestone-plan-5`.

### 4.2 Vague 2 — refonte visuelle (P6–P8)

**Ajoutée le 2026-09-12.** Les verrous de la §2 s'appliquent à l'identique : ils ne sont pas redits ici.

**Gap :** le site `v1.0.0` est en ligne avec le thème « dark editorial-dev » du design initial. Un nouveau design complet a été produit dans Claude Design et fait désormais foi — voir [`2026-09-12-refonte-visuelle-design.md`](./2026-09-12-refonte-visuelle-design.md), qui remplace la couche visuelle de la spec de design d'origine sans toucher à sa vision ni à son modèle de contenu.

**Séquence de la vague** (les rosters P7 et P8 sont ajoutés à la table ci-dessus au moment où leur spec est écrite, pas avant) :

- **P7** `structures-v2` — « L'accueil et les quatre familles (blog, projets, prompts, skills) ont la structure de la maquette : à la une, panneaux, filtres, tri, onglets »
- **P8** `pages-restantes-et-finition` — « /transparence-ia, /tags, /404 et la recherche sont au nouveau design, en 375px, contrastes AA »

**Ordre interne :** P6 conditionne tout le reste — implémenter une structure de page avant que les tokens existent produit des valeurs codées en dur qu'il faut ensuite déterrer.

**Pourquoi trois plans et non cinq.** Un premier découpage en cinq a été resserré avant toute exécution : le surcoût de la méthodologie est **par plan** — un bootstrap, un ledger, un journal, une Phase Z chacun — et cinq plans le payaient cinq fois pour une vague dont trois tranches partageaient le même patron. Contrepartie assumée : P7 est lourd, son ledger est long, et son budget de décisions sature plus vite. `/anti-drift-planning:resume 7` est le filet prévu pour ça.

**Spécificité de cette vague :** le résultat est majoritairement **visuel**, donc non couvert par des tests unitaires. La Phase Z de chaque plan ajoute une vérification de rendu sur **375 / 768 / 1180 px** dans les deux thèmes, et le contrat visuel fournit 8 critères auditables (`V1`–`V8`, §10 de la spec de design). La logique nouvelle — filtres, tri, onglets — reste testée en vitest dans `src/lib/`, comme l'existant.

## 5. Artifact formats

- Spec skeleton: plan spec template (one per plan, in `docs/anti-drift/specs/`)
- Scope ledger: ledger template (one per plan, in `docs/anti-drift/handoffs/`)
- Deviations log: deviations template (one per plan, in `docs/anti-drift/handoffs/`)

## 6. Success criteria for the methodology itself

| Criterion | Measure |
|---|---|
| Each plan has a spec following the standard format | Required sections present in every spec file |
| Each plan has a ledger created before its first task | File exists at `docs/anti-drift/handoffs/plan-N-ledger.md` |
| Each plan has a deviations log created before its first task | File exists at `docs/anti-drift/handoffs/plan-N-deviations.md` |
| Each plan ends with a verification phase (no shortcut) | Phase Z present in the Work breakdown of every plan spec |
| Verification produces explicit Done/Deferred/Cut per criterion | Output = updated ledger committed by `/anti-drift-planning:verify` |
| No deviation entry carries an invented status | Every entry is `pending-user`, `approved`, or `rejected` — anything else is audited as `pending-user` |
| The plan artifacts hold together mechanically | `/anti-drift-planning:lint` exits `0` across all plans |

## 7. Out of scope (of the methodology itself)

- Automated CI enforcement (no hooks blocking commits) — discipline comes from the bootstrap prompt, the verification phase, and the mechanical lint run inside it. The lint is a read-only audit invoked by an agent or a human; it never gates a commit.
- Multi-author sync — solo, sequential workflow
- Time tracking — measurable a posteriori via git log if needed
- Cost budget per plan — observed but not capped

---

**Related artifacts:**
- Design spec: [`docs/anti-drift/specs/2026-07-19-site-perso-design.md`](./2026-07-19-site-perso-design.md)
- Specs: `docs/anti-drift/specs/2026-07-19-plan-N-…md`
- Ledgers: `docs/anti-drift/handoffs/plan-N-ledger.md`
- Deviations: `docs/anti-drift/handoffs/plan-N-deviations.md`
- Mechanical lint: `/anti-drift-planning:lint` (implementation: `scripts/anti_drift_lint.py` in the `anti-drift-planning` skill)
