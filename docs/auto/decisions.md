# Decisions — autonomous run

Append-only. `⚑ à relire` marks entries the user should re-read.

## D1 · Plan 8 · cadrage — Pattern first: tabs fed only by existing content
Choice: a §5.2 tab (or E7–E9 feature) ships only where current content feeds it; otherwise omitted, never shown empty · Alternatives: unfreeze the schema (new optional fields + CMS config); always show every prototype tab with an empty state · Reversibility: cheap · Why: user's answer at cadrage (option A); keeps contract §9 intact and needs no content from the user.

## D2 · Plan 8 · authoring — Skill body goes in a first tab labelled "Aperçu"   ⚑ à relire
Choice: skills show Aperçu (body) · Infos · Alternatives: body outside the tabs, or inside Infos (both leave skills with a single tab, so no tab row) · Reversibility: cheap · Why: the prototype's skill tabs (Déclencheurs, Versions) have no data; "Aperçu" is the label the prototype already uses for a body on project pages.

## D3 · Plan 8 · authoring — A guide prompt's body goes under "Pourquoi"
Choice: the body of every prompt, fiche or guide, is the Pourquoi panel · Alternatives: a separate "Guide" label for `format: guide` · Reversibility: cheap · Why: one label set per page type, as §5.2 lists; a guide's body explains the why and the how of the prompt.

## D4 · Plan 8 · authoring — A `No content` body counts as content   ⚑ à relire
Choice: `macos-clone` and `superpowers` (body = literal `No content`, kept on purpose per the plan-4 ledger) show that text in their body tab · Alternatives: treat it as blank — the entry then has one tab, no tab row, and R0 ("on every existing entry") fails, which would be a scope escalation · Reversibility: cheap · Why: the rule "a tab appears only when content can feed it" is applied literally; replacing the placeholder text is content work, frozen here.

## D5 · Plan 8 · authoring — A single `version` value lives in Infos, no Versions tab
Choice: no Versions tab; `version` is a row of Infos · Alternatives: a one-row Versions tab · Reversibility: cheap · Why: a history of one is not a history; D1 omits tabs without real data.

## D6 · Plan 8 · authoring — The prompt block stays above the tab row
Choice: the copyable prompt (fiche prompts) stays always visible above the tabs, with its Copier button · Alternatives: its own tab · Reversibility: cheap · Why: the prompt is what the page is for; hiding it behind a tab adds a click to the main action.

## D7 · Plan 8 · authoring — Header metadata chips move into Infos   ⚑ à relire
Choice: prompts' format, tool, model, tags, related skills and skills' type, name, version, tags, related prompts move from the header into the Infos panel; repo/demo links stay in the header · Alternatives: keep them in the header as well (duplicated) · Reversibility: cheap · Why: Infos is the prototype's home for that metadata; showing it twice would make Infos redundant. Visible change to existing pages.

## D8 · Plan 8 · authoring — The skill install command lives in the Infos panel
Choice: `installCmd` with its Copier button sits in Infos · Alternatives: above the tabs, like the prompt block · Reversibility: cheap · Why: installation is reference information, not the page's main action; R10 proves the copy still works from a panel hidden at load.

## D9 · Plan 8 · authoring — No fifth pattern class; tabs styled with utilities
Choice: the tab row uses Tailwind utilities in a shared `DetailTabs.astro` component; `@layer components` keeps its 4 classes (R13) · Alternatives: a `.tab` class shared with the nav pills · Reversibility: cheap · Why: contract §4 says "four patterns and only four"; a single shared component already gives one source of truth for the three pages. Closes the open question carried over from plans 6–7.

## D10 · Plan 8 · authoring — WAI-ARIA tabs keyboard model with automatic activation
Choice: roving tabindex, arrows wrap and activate, Home/End, Tab moves into the panel · Alternatives: manual activation (arrows move focus, Enter activates) · Reversibility: cheap · Why: the APG default for tabs whose panels are already rendered (no fetch on switch).

## D11 · Plan 8 · authoring — No-JS fallback via a `data-js` flag, first tab server-selected
Choice: BaseLayout's head script sets `data-js`; without it the tab row is hidden and every panel shows; the server renders the first tab selected so nothing flashes · Alternatives: plan 7's "server hides, script reveals" (all panels flash at load); no fallback · Reversibility: cheap · Why: static site, content must survive without JS, and no layout flash on the common path.

## D12 · Plan 8 · authoring — Tabs and panels sit inside a `surface` card
Choice: `.card` wrapper so the selected `card` tab is exactly one level above its background (R6) · Alternatives: tab row directly on `bg` — a surface-level jump, the V2 defect deferred from plan 7 · Reversibility: cheap · Why: do not add a new V2 violation while V2 is still open.

## D13 · Plan 8 · authoring — Fewer than 2 tabs: no tab row
Choice: a single panel renders without a tab row · Alternatives: a row with one tab · Reversibility: cheap · Why: a one-tab row is a control that does nothing. No current entry hits this.

## D14 · Plan 8 · authoring — First tab selected on load; selection not kept in the URL
Choice: no hash/query state · Alternatives: `#tab-…` deep links · Reversibility: cheap · Why: not in §5.2; heading anchors already use the hash.

## D15 · Plan 8 · authoring — A committed check script, `scripts/check-detail-tabs.mjs`
Choice: the build-output check behind R2/R8 lives in the repo · Alternatives: one-off shell commands in the plan · Reversibility: cheap · Why: the verifier and any later plan can re-run it verbatim.

## D16 · Plan 8 · authoring — New test names in English
Choice: `detailTabs.test.ts` uses the English names cited verbatim in R1/R3/R7 · Alternatives: French names like the repo's existing tests · Reversibility: cheap · Why: the criteria measure by test name and run artifacts are in English (brief); renaming later is a mechanical edit.
