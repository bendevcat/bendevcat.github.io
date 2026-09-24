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

## D17 · Plan 8 · T1 — Shape of the pure tab API
Choice: tab ids `apercu`, `stack`, `articles-lies`, `pourquoi`, `infos`; tab functions take one object argument; an `undefined` body counts as blank; `computeTabState` falls back to the first tab on an out-of-range index; empty tab list → `[]` / `null`; ArrowUp/ArrowDown ignored (horizontal row) · Alternatives: label-derived ids, positional arguments, throwing on bad input, vertical arrows mirroring horizontal ones · Reversibility: cheap · Why: named fields stop T2/T3 from swapping two counts; a panel always shows; D10's horizontal keyboard model.

## D18 · Plan 8 · T2 — Component mechanics of `DetailTabs.astro`
Choice: panel content passed as named slots rendered with `Astro.slots.render`; the component imports `detail-tabs.ts` itself; tablist `aria-label` per page type ("Sections du projet"…); the cover moves inside Aperçu; panels are focusable (`tabindex="0"`, `outline-ink` ring); the check script keeps a `PENDING_FAMILIES` set that T3 must empty · Alternatives: `<slot name={id} />`, a per-page script import, a family counted as migrated once any page has tabs · Reversibility: cheap · Why: one import point for the three pages; an explicit pending list cannot let a whole family silently lose its tabs.

## D19 · Plan 8 · T2 — No-JS-only section headings before each panel   ⚑ à relire
Choice: an `h2` (`// aperçu`, `// stack`, `// articles liés`) precedes each panel and is hidden when JS runs; it sits outside the panel · Alternatives: no headings (the stacked no-JS panels are unlabelled, and the old `// articles liés` heading text disappears from the page) · Reversibility: cheap · Why: labels the no-JS reading order and keeps the page's existing words (R11) without putting text inside a panel that could hide an empty one.

## D20 · Plan 8 · T4 — Rendered measurements are run by the orchestrator in the built-in browser
Choice: T4's browser measures (R4–R7, R9–R12) are executed by the orchestrator; the implementer is dispatched only for fixes · Alternatives: add Playwright as a devDependency so the implementer can measure headlessly · Reversibility: cheap · Why: implementers have no browser; adding a test dependency for one pass widens the diff and `package.json` is a shared resource.

## D21 · Plan 8 · T3 — Infos panel as a definition list; replication details
Choice: Infos is a `<dl>` with lowercase mono labels (stacked on mobile, `8rem | 1fr` from `sm`); former `// installation`, `// skills liés`, `// prompts liés` headings become labels without `//`; install block uses `prose text-base [&_pre]:my-0!` (the `.prose` rules are unlayered); tablist labels "Sections du prompt" / "Sections du skill" (masculine, as the site's "skills liés"); `copy-code.ts` unchanged — `innerText` of an undisplayed element falls back to `textContent` · Alternatives: old header markup moved as-is into the panel; a new `global.css` rule; switching `copy-code.ts` to `textContent` · Reversibility: cheap · Why: stays inside T3's files; words and links preserved (R11 checked against base by the implementer); R10 confirmed in the browser at T4.

## D22 · Plan 8 · T4 — The no-JS panel override lives in `@layer base`
Choice: `html:not([data-js]) [data-detail-tabs] [role="tabpanel"][hidden] { display: block !important }` moves into `@layer base`, next to Tailwind's preflight `[hidden] { display: none !important }`; `check-detail-tabs.mjs` now fails if that rule leaves the layer · Alternatives: stop server-rendering `hidden` and hide inactive panels through a `data-*` state switched by JS (conflicts with R8 and changes the JS path) · Reversibility: cheap · Why: for `!important` declarations a layered rule beats an unlayered one whatever the specificity, so the unlayered override could never win — measured at T4: without JS only the first panel showed on all 7 pages; after the fix every panel shows.

## D23 · Plan 8 · E1 — Publish plan 8 as v1.3.0
Choice: fast-forward `main` to the integration branch, annotated tag `v1.3.0`, push `main`, `v1.3.0`, `milestone-plan-8` · Alternatives: wait · Reversibility: expensive (a published tag and a production deploy) · Why: user's answer "A" to escalation E1.

## D24 · Plan 10 · cadrage — Tag tones by a stable hash of the slug
Choice: each tag's tone (one of the 5 of contract §2.3) is a stable hash of `tagSlug(tag)`; same tag, same tone on every page · Alternatives: explicit table in code with hash fallback; a single neutral tone (drop E10) · Reversibility: cheap · Why: user's answer A at cadrage (settles contract §8.3); zero maintenance when a tag is added from the CMS.

## D25 · Run · cadrage — One publication at the end of the run
Choice: plans 9–11 integrate on `claude/anti-drift-auto-start-532f11` without publishing; one `publication` escalation after plan 11 (`v1.4.0`) · Alternatives: one escalation per plan; pre-authorised publication · Reversibility: cheap · Why: user's answer A at cadrage.

## D26 · Run · cadrage — No invented content on the home and about pages
Choice: a block or field is shown only when existing content, the author's existing texts or a derivation can feed it; the prototype's demo values (email, LinkedIn, `github.com/bencat`, stack list, quotes) are never copied; stack logos are self-hosted inline SVG · Alternatives: copy the prototype's values; ask the user for new copy · Reversibility: cheap · Why: the user's "aucune phrase inventée" rule (gate 2026-09-04), contract §9, and plan 8's "pattern first" (D1).

## D27 · Plan 9 · cadrage — The home hero goes; whoami moves to /a-propos   ⚑ à relire
Choice: the home page follows the prototype, which has no hero; the `~/ whoami` identity lives on `/a-propos`; the home AI banner links to `/transparence-ia/` · Alternatives: keep `Hero.astro` above the featured card · Reversibility: cheap · Why: the prototype is the single source of truth for structure (contract, header); stated in the validated brief.

## D28 · Plan 9 · authoring — `Derniers articles` is a `.card`, not a `.panel`
Choice: the latest-posts block is a `.card` (surface) on `bg` with a 28×28 badge right of its title · Alternatives: a tinted `.panel` like the section panels · Reversibility: cheap · Why: in the prototype only row 2 (Projets · Prompts · Skills) is tinted; row 1 is two surfaces side by side.

## D29 · Plan 9 · authoring — Two entries per section panel, list-page order
Choice: first 2 entries of each collection in the list pages' order (so `bootstrap-session-anti-drift` is not on the home) · Alternatives: every entry; 3 per panel · Reversibility: cheap · Why: the prototype shows 2 per panel; the title link leads to the full list.

## D30 · Plan 9 · authoring — Badges reuse the header glyphs
Choice: badges use `Icon.astro`'s existing `blog`, `projets`, `prompts`, `skills` glyphs · Alternatives: add the prototype's bubble and wrench icons · Reversibility: cheap · Why: one glyph per section across the site; the nav already teaches them.

## D31 · Plan 9 · authoring — AI banner sentence from the site's own words
Choice: « Chaque article déclare son niveau de contribution IA : » (already on `/transparence-ia`) followed by the three `emoji label` pairs read from `AI_USAGE_META` (« co-créé avec IA », not the prototype's « co-créé ») · Alternatives: the prototype's sentence « Chaque article affiche sa part d'IA… » · Reversibility: cheap · Why: D26 — author text or derivation only, never prototype copy.

## D32 · Plan 9 · authoring — A visually hidden `<h1>` on the home
Choice: `/` keeps exactly one `<h1>`, a visually hidden `bencat_` · Alternatives: the featured post's title as `<h1>` · Reversibility: cheap · Why: dropping the hero (D27) drops the page's only `<h1>`; the featured title changes with each post, the site name does not.

## D33 · Plan 9 · authoring — `Hero.astro` kept unused until plan 10
Choice: the component stays in place, unused, so plan 10 can reuse its author text on `/a-propos` · Alternatives: delete it now · Reversibility: cheap · Why: nothing is published before plan 10 ships (D25), so the hero's AI-transparency sentence is never missing from production.

## D34 · Plan 9 · authoring — Home field formats and extra contract checks
Choice: new additive `Thumbnail.astro` sizes (196 px header, 72 px square); project stack in mono joined by ` · `; skill meta `type · name` (or `type` alone); version chip `v<version>` only when set; `à la une` chip kept as a UI label; V2/V3/V4/V5/V6 and the type scale are checked on `/` in this plan, AA contrast left to plan 11 · Alternatives: stack as chips; home-only thumbnail markup; leave every contract check to plan 11 · Reversibility: cheap · Why: follows the prototype and plan 8's precedent of checking the contract on the pages a plan touches (D12).
