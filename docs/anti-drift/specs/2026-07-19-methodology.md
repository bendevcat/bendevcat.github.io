# Site perso benCat — Multi-session execution methodology · Design

**Date:** 2026-07-19
**Author:** Benoît Catillon (bendevcat)
**Predecessor:** ancien site Hugo + Decap CMS (`bencat-website`) ; spec de design [`2026-07-19-site-perso-design.md`](./2026-07-19-site-perso-design.md)
**Target:** methodology shared across plans 1–5

---

## 1. Why this methodology

Le site perso de benCat passe de **Hugo + Decap CMS** à une stack **Astro v5 + Tailwind v4 + Sveltia CMS**, déployée sur **GitHub Pages + domaine custom**. La vision (voir la [spec de design](./2026-07-19-site-perso-design.md)) dépasse largement une seule session : 4 collections de contenu (blog, projets, prompts, skills), un CMS headless, un thème sur-mesure « dark editorial-dev », la migration des ~15 articles existants, et un déploiement avec domaine.

**Gap actuel :** greenfield → site complet.

Sans cadre, ce type de build multi-sessions **perd du périmètre en silence** : une page à moitié faite, une collection oubliée, un critère validé « à peu près ». Cette méthodologie découpe la vision en **5 slices verticaux** — chacun livrant un résultat observable par l'utilisateur final — pour que rien ne se perde entre les sessions.

## 2. The 4 locks (verrous)

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

**Canonical artifact:** `/anti-drift-planning:verify N` — the five audit steps (spec coverage, user-story walkthrough, tests, visual smoke, deviations review) live in that command and nowhere else.

## 3. Bootstrap prompt per session

Generate it with `/anti-drift-planning:start-session N` and paste it as the first message of each fresh execution session. Fresh context per plan is deliberate: it prevents drift inherited from prior conversations.

**Session chaining:** after the first plan you rarely run `start-session` by hand. When a plan's Phase Z passes, `/anti-drift-planning:verify N` automatically emits the next actionable step — the next plan's bootstrap if its spec exists, otherwise `/anti-drift-planning:new-plan N+1`, and when N is the last plan, the cross-plan audit `/anti-drift-planning:status`, which announces project completion. A plan interrupted mid-execution is resumed with `/anti-drift-planning:resume N`. Emission happens only on a PASS verdict — a failed or pending plan never hands off forward.

## 4. Decomposition into 5 plans (vertical slicing)

| Plan | User-facing goal (binary) | Spec path |
|---|---|---|
| **P1** | « Le blog est en ligne (github.io) et lisible, en thème dark editorial-dev » | [`…-plan-1-socle-blog-deploye.md`](./2026-07-19-plan-1-socle-blog-deploye.md) |
| **P2** | « Je publie/édite les articles sans toucher au code (Sveltia CMS) » | `…-plan-2-cms-sveltia.md` *(à créer)* |
| **P3** | « On peut parcourir mes fiches projets » | `…-plan-3-vitrine-projets.md` *(à créer)* |
| **P4** | « Mes prompts et mes skills sont parcourables et copiables » | `…-plan-4-librairies-prompts-skills.md` *(à créer)* |
| **P5** | « On cherche et on découvre (recherche, tags, à-propos, transparence-IA) » | `…-plan-5-recherche-et-pages.md` *(à créer)* |

**Order:** strictly sequential (each plan builds on the previous). Each plan is executed in its own fresh Claude Code session.

**Implementation plans:** only the first plan's impl plan is written upfront. Subsequent impl plans are written at the start of their execution session, from the spec + the real state of the repo after the previous plan.

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

## 7. Out of scope (of the methodology itself)

- Automated CI enforcement (no hooks blocking commits) — discipline comes from the bootstrap prompt + verification phase
- Multi-author sync — solo, sequential workflow
- Time tracking — measurable a posteriori via git log if needed
- Cost budget per plan — observed but not capped

---

**Related artifacts:**
- Design spec: [`docs/anti-drift/specs/2026-07-19-site-perso-design.md`](./2026-07-19-site-perso-design.md)
- Specs: `docs/anti-drift/specs/2026-07-19-plan-N-…md`
- Ledgers: `docs/anti-drift/handoffs/plan-N-ledger.md`
- Deviations: `docs/anti-drift/handoffs/plan-N-deviations.md`
