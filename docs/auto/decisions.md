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

## D35 · Plan 9 · T1 — Featured post excluded from `latest` by identity
Choice: `pickHomePosts` compares the objects themselves, not an `id`; T2 must pass one array to it and use that array throughout · Alternatives: require an `id` field and compare ids · Reversibility: cheap · Why: keeps the helper generic over plain objects like `pickFeaturedEntry`, which returns an item of the array it received.

## D36 · Plan 9 · T2 — Row 1 details
Choice: derived placeholders carry `data-thumb-derived` (lists included; text and classes unchanged); the check matches `/blog`'s featured by distinct entry id (it has two `data-featured` elements); reading time from the existing `estimateReadingMinutes`, shown as `N min`; latest thumbnail right of the text; row 1 side by side from `lg` (1024 px), stacked below; the AI label stays in mono as on `ArticleCard`; featured cover keeps lazy loading · Alternatives: detect placeholders by class; `N min de lecture`; thumbnail on the left; side by side from `md`; AI label in Nebula Sans; `loading="eager"` · Reversibility: cheap · Why: prototype order and sizes, existing precedents, a 29 px title needs the width.

## D37 · Plan 9 · T3 — Section panels and banner details
Choice: badge right of the panel title (as `Derniers articles`); three columns from `lg`, stacked below; entry titles 17 px / 500, descriptions 13 px / 1.5 (§3.3 compact card and dense body); neutral format and version chips as on the list cards, status chip from `PROJECT_STATUS_META` unchanged; banner pairs joined by `Intl.ListFormat('fr', disjunction)` in `AI_USAGE_META` order with a non-breaking space before `:`; pill in mono; a section with no entry is not rendered · Alternatives: badge left; columns from `md`; accent `.pill` chips; hand-written join; an empty panel · Reversibility: cheap · Why: consistency with row 1 and the list cards; D26 (never show an empty block).

## D38 · Plan 9 · T4 — Rendered measurements by the orchestrator; lazy images unmeasurable in a hidden pane
Choice: T4's measures ran in the built-in browser (both themes, 375 / 768 / 1180); the only defect found (glued `·` in the featured meta) is fixed in `4552221` with a guard in `check-home.mjs`; image decoding could not be observed because the browser pane was hidden (`visibilityState: hidden` keeps lazy images unloaded — `/blog` behaves the same), so image presence is proven by the build check and a 200 `image/webp` on the `src` · Alternatives: force `loading="eager"` on the home · Reversibility: cheap · Why: D20 precedent; the environment, not the page, blocks decoding.

## D39 · Plan 10 · authoring — What counts as a tag chip
Choice: tag chips = `/tags` links, the header chip of each `/tags/<tag>` (new, makes "same tone everywhere" visible), `/skills` tag filter pills (`tous` stays neutral; pressed = ring in the tone's colour), tag lists on `/prompts` and `/skills` cards and in the Infos tabs; `<option>`s of the `/blog` and `/prompts` tag selects are not chips · Alternatives: neutral filter pills; no header chip on `/tags/<tag>` · Reversibility: cheap · Why: every element that looks like a tag pill gets its tone; a native `<option>` cannot be styled consistently.

## D40 · Plan 10 · authoring — AI levels drawn with tag tones
Choice: `none` green, `partial` amber, `full` blue, from the §2.3 tone tokens (the prototype's marker colours); the compact AI marker on article cards and the home stays emoji + label text · Alternatives: new AI-specific tokens outside the contract; colour the compact marker too (changes lists and home) · Reversibility: cheap · Why: settles P6 D02 inside the contract's palette; the tones already hold the three hues.

## D41 · Plan 10 · authoring — Tone tokens and classes
Choice: tokens `--color-tag<Tone><Bg|Ink|Line>` in `@theme static` (dark overrides under `[data-theme="dark"]`), literal utility strings in `src/lib/tones.ts`; one committed check script `scripts/check-secondary.mjs` for all secondary pages · Alternatives: CSS rules keyed on `data-tone`; one script per page · Reversibility: cheap · Why: utilities keep the pattern-class count at 4 (R15); literal strings survive Tailwind's class scanning.

## D42 · Plan 10 · authoring — About page composition from existing facts   ⚑ à relire
Choice: row 2 = `Qui je suis` + `Pourquoi ce site` cards (current author text; the prototype's `On parle ?` has no real contact channel); links `github.com/bendevcat` and `rss.xml` in row 1; AI panel titled with the author's heading « L'IA : une aide, pas un ghostwriter », markers described by `AI_USAGE_META`; terminal lines derived: `rôle` « ingénieur DevOps depuis 2019 », `lieu` « France », `terrain` = the 3 most used tags, `écrit` = published counts, `stack` = union of project stacks, `règle` « une aide, pas un ghostwriter »; a line with no source is dropped · Alternatives: an `Où me trouver` card repeating the links; drop `terrain` and `écrit`; the prototype's title « Ma règle sur l'IA » · Reversibility: cheap · Why: D26 — author text or derivation only.

## D43 · Plan 10 · authoring — Stack logos copied from Simple Icons (CC0)   ⚑ à relire
Choice: 7 SVG paths copied once from `simple-icons@16.31.0` into `src/lib/stackLogos.ts` (source and licence noted), drawn in `currentColor`, never brand colours; Sveltia CMS and SVU show as text; no dependency added · Alternatives: add `simple-icons` as a dependency; text-only toolbox · Reversibility: cheap · Why: D26 (self-hosted, no CDN); the files are CC0 but the logos are third-party trademarks (Astro, TypeScript, Go, GitHub…) — nominative use on a personal stack list, to re-read.

## D44 · Plan 10 · authoring — `Hero.astro` deleted; contract checks scoped to touched pages
Choice: `Hero.astro` is deleted once its text moves to `/a-propos` (D33's horizon); AA measured here only for the new tone and AI-level pairs, V2–V6 on the touched pages; the rest stays with plan 11 · Alternatives: keep `Hero.astro` unused; measure every pair now · Reversibility: cheap · Why: no dead component; plan 11 owns the site-wide sweep.

## D45 · Plan 10 · T1 — Tone hash and pinned tones
Choice: 32-bit FNV-1a of `tagSlug(tag)` mod 5 over `TONES` in §2.3 order (green, blue, violet, amber, rose); pinned by tests: `devops` green, `claude-code` amber, `kubernetes` rose, `anti-drift` green; the 30 current slugs use all 5 tones; §2.3 values and the 30 slugs are literals in the tests; `AI_USAGE_META` built from one level table so tone and banner classes cannot drift; `none` moves from neutral `bg-chip` to the green tone · Alternatives: djb2 or a character sum; tests parsing the spec; keep `none` neutral · Reversibility: cheap in code, but a new hash recolours every tag — hence the pin · Why: short, well-known, spreads well on the real tags; D40.

## D46 · Plan 10 · T2 — Tag chip details
Choice: the check counts chips outside the hidden duplicate featured cards (still checks them); `check-secondary.mjs` re-implements `tagSlug` + FNV-1a to check each chip's expected tone (drift caught by the pinned tests too); the `/tags/<tag>` header chip is a one-item `ul[aria-label="Tags"]`; pressed pills (tags and `tous`) get `ring-2 ring-current` without offset; the `/tags` count takes the chip's ink, not the accent · Alternatives: count every chip; only check tone consistency; `ring-offset-bg`; keep `text-accent` counts · Reversibility: cheap · Why: a white default ring offset breaks dark mode; accent on a tone background may miss 4.5:1 (R10).

## D47 · Plan 10 · T3 — Secondary pages details
Choice: 404 pills labelled `accueil →`, `blog →`, `tags →` (mono action pills like `tous les tags →`); the AI banner keeps its 20 px radius inside the 14 px `.card-inner` of `/transparence-ia` (to look at in T5); hover/focus on search results and tag entries changes the border colour, the browser focus outline is kept; the check covers every `/tags/<slug>/` page, all AI banners in `dist/`, and `/a-propos` for hand-drawn cards; `AiBanner` gains a `class` prop for its margin (default `mb-8`) · Alternatives: sentence labels in pills (prose in mono, V5); a 14 px banner everywhere; a filled hover; the plan's narrower page list · Reversibility: cheap · Why: `.pill` is always mono; a filled hover would hide the `card` level.

## D48 · Plan 10 · T4 — About page details   ⚑ à relire
Choice: stack items deduplicated by exact trimmed match (as the `/projets` filter); `écrit` singular at 1, a zero collection left out, the line dropped only when all four are 0; name, alias, role, place and rule held once in `ABOUT_FACTS` (the `<h1>` reads it too); the AI panel link gains a `→` like the site's text links; terminal lines are a `<dl>`; the `stackLogos.ts` header calls the use nominative, without affiliation or endorsement, without naming each trademark owner · Alternatives: case-insensitive dedup; always four counts; repeated literals; no arrow; name each owner · Reversibility: cheap · Why: one source per fact; the legal wording avoids unverifiable claims — to re-read with D43.

## D49 · Plan 10 · T5 — Rendered pass by the orchestrator, through same-origin iframes
Choice: T5's measures ran on `astro preview` in the built-in browser; pages × themes × widths were measured in same-origin iframes sized 375 / 768 / 1180 (the instrument was checked against injected defects: overflow, V2 jump, 7 px radius); no defect found; one stale comment fixed (`459ee43`); the default yellow `<mark>` of search excerpts (unchanged since plan 5) is carried to plan 11's "no colour outside the contract" · Alternatives: resize the pane for each measure · Reversibility: cheap · Why: 60 page states in one pass; iframes get their own viewport and media queries.

## D50 · Plan 10 · verification — GitHub Pages shows as text in the toolbox
Choice: the `githubpages` Simple Icons path is removed from `src/lib/stackLogos.ts`; GitHub Pages is a text-only pill like Sveltia CMS and SVU (6 logos, not 7); the plan's expected `toolbox` line is updated · Alternatives: keep it; draw a larger pill for it · Reversibility: cheap · Why: the verifier measured it as an unreadable grey smudge at 14 px in both themes — that mark is a written wordmark.

## D51 · Plan 11 · authoring — V2 on the lists: one `.card` frame, `.card-inner` entries
Choice: on each list, featured entry, grid and empty state sit in one `.card`; every entry card becomes a `.card-inner` (settles P7 D04 for real); the home's derived thumbnail on `surface` (never rendered today) is left and guarded by `check-finition.mjs`; failing `dim` text (list counters, thumbnail monogram) switches to `muted` — no token value changes · Alternatives: thumbnail placeholder on `chip` (P7 option 3); a card-level frame around the thumbnail; restructure the home now; move counters onto a surface · Reversibility: cheap · Why: same structure as `/tags/<tag>` and search; the contract's 20/14/10 radii nest in that order.

## D52 · Plan 11 · authoring — Syntax highlighting built from tokens   ⚑ à relire
Choice: a hand-written Shiki theme whose every colour is `var(--color-…)` — text `body`, comments `muted`, other scopes `accent` and the five tone inks — replaces github-light/dark · Alternatives: GitHub high-contrast themes (still outside the contract); leave code blocks out of R0 (narrows the roster goal → scope escalation) · Reversibility: cheap · Why: measured at base, comments `#6A737D` are 4.07:1 on dark `code` (138 on one article) and `#E36209` about 3:1 in light; the roster goal requires every rendered pair ≥ 4.5:1. Visibly changes code colours on 4 articles.

## D53 · Plan 11 · authoring — Status, backdrop, mark, focus ring
Choice: `wip` on the amber tone (as `partial` AI, D40), `actif` accent, `archivé` neutral; search backdrop on `bg` at ≥ 80 % with blur (a pale wash in light); search `<mark>` = `accent` on `accentSoft` (a V8 pair); a global 2 px `accent` `:focus-visible` outline in `@layer base`, the search input loses `outline-none`; `/tags` links get `aria-label="<label> <count>"`; the two featured covers load eagerly; AI markers become nowrap `data-ai-marker` elements; the live count is `aria-live="polite"` + `aria-atomic="true"` · Alternatives: neutral `wip`; `ink/40` backdrop in light; amber `mark`; keep the UA focus ring (off-contract, blue in Safari light); a visually hidden separator; keep lazy covers; `role="status"` · Reversibility: cheap · Why: every choice stays inside the 23 tokens + 5 tones.

## D54 · Plan 11 · authoring — What "every rendered pair" and "no colour outside the contract" measure   ⚑ à relire
Choice: contrast = every visible element owning text (+ the search placeholder), composited over ancestor backgrounds, `background-image` (hatch) ignored, WCAG large-text thresholds, emoji-only and `sr-only` text out, rest state only; token colour = RGB within ±2 of one of the theme's 38 values at any alpha (Tailwind `/NN` on a token counts), images, emoji, `box-shadow` and native UI the page does not paint (select popup, scrollbars, `::selection`) out; a committed browser audit script `scripts/audit-rendered.js`, proven on known base defects before being trusted; source-reading tests carry the static guarantees · Alternatives: stricter rules (hover states, shadows); an ad-hoc helper as in D49 · Reversibility: cheap · Why: a narrowed, explicit reading of the roster goal — to re-read.

## D55 · Plan 11 · T1 — Contract colour set and search dialog details
Choice: the contract colour set is 37 `--color-` values (the plan's "38" counted `shadow`, not a colour) — the audit compares against those; backdrop `bg` at 85 % + `backdrop-blur-sm`; `<mark>` styled by utilities on `#search-results` (`[&_mark]:bg-accentSoft [&_mark]:text-accent`); the palette scanner also covers `.js` and Tailwind's newer palettes; dead palette rules in the CSS bundle, generated because Tailwind scans class names written in `docs/**/*.md`, are left for T4 (`@source not`) · Alternatives: count `--shadow`; exactly 80 %; a `global.css` rule for `mark`; the plan's narrower scanner · Reversibility: cheap · Why: margin over R4's 0.8 threshold; keep the component self-contained.

## D56 · Plan 11 · T2 — Syntax roles on contract colours
Choice: theme `bencat-tokens` with `var(--color-…)` colours (Shiki 4.3.1 writes non-hex colours back verbatim): text / operators / punctuation `body`, comments `muted` italic, keywords `tagRoseInk`, strings `tagBlueInk`, constants and shell variables `tagAmberInk`, functions and types `tagVioletInk`, parameters, attributes and options `tagGreenInk`, keys, tags and headings `accent`; `dim` unused (4.15:1 on `code` in light); the `.astro-code` background rule kept as a guard · Alternatives: GitHub's hue families; split types from functions; `dim` for punctuation · Reversibility: cheap (one file) · Why: six roles on the six allowed colours, all ≥ 5.68:1 in light and ≥ 7.91:1 in dark; `accent` and `tagGreenInk` look close in light but rarely meet in these articles.

## D57 · Plan 11 · T3 — List frame details
Choice: `check-finition.mjs` judges V2 by the nearest ancestor that paints a background (pattern class or `bg-<token>`), stricter than the plan's any-ancestor wording; T4's lines are notes, not failures, until T4; inside the frame, flex `gap-6` replaces `mb-6`/`mt-8`; the frame carries `data-list-frame`; the list script's redundant meta rewrite on load (a possible screen-reader announcement) is guarded in T4 · Alternatives: the looser rule; failing on T4's lines; keep margins; find the frame by class · Reversibility: cheap · Why: catches a card on a `bg-bg` island inside a `.card`; a hidden block leaves no stray gap.

## D58 · Plan 11 · T4 — Leftovers details
Choice: Tailwind no longer scans `docs/` nor `*.test.ts` (`@source not`), which removes 37 dead rules (palette examples quoted in tests and docs); the fallback check requires every heading marked (15 in the build — one per tab on 7 pages; the plan's "16" corrected); `/tags` link names via a `label` prop used as `aria-label`; eager covers without `fetchpriority`; the focus ring lives in `@layer base` so a `focus-visible:` utility (the tabs' `ink` ring) can override it; the `ai-markers` check also requires nowrap and exact `emoji label` pairs · Alternatives: exclude `docs` only; require exactly 16; a hidden separator; `fetchpriority="high"`; an unlayered focus rule · Reversibility: cheap · Why: dead rules would trip any static scan of the CSS bundle; layering keeps utilities in control.

## D59 · Plan 11 · T5 — Audit instrument scope
Choice: token names enumerated from the dark-theme block only (Tailwind's `:root, :host` block also lists its own palette), falling back to the 37 names; ±2 per channel (light `chip` and `rail` then coincide for the off-token check; V2 compares exact tokens); pseudo-elements (`::before`, `::after`, `::marker`, every `::placeholder`) and `aria-hidden` non-emoji glyphs are measured too (stricter than the plan); an inherited `color` is reported once; `opacity` is not multiplied into contrast; validated on a base build of `05ceeff` served on :4322 — it reports the 4.19:1 `/skills` meta (light), `rail` on `surface` on `/projets` (dark), `#6A737D` comments at 4.07:1 (dark), the black `::backdrop` and the amber `wip` chip · Alternatives: the plan's narrower list; a tighter tolerance · Reversibility: cheap · Why: an instrument is trusted only once it finds known defects.

## D60 · Plan 11 · T6 — Rendered pass: transitions neutralised; header and tabs keep an `ink` focus ring   ⚑ à relire
Choice: the audit neutralises transitions before measuring (the first light run caught tab and filter colours mid-transition — a measuring artefact, not a defect); result: 34 states × 2 themes → 0 overflow, 0 contrast failure, 0 off-token colour, 0 V2 jump; 30 tag pages at 375 and 14 routes at 768 / 1180 → no overflow. R14 is read as "accent ring on content and the search input; the header controls (logo, nav pills, action buttons) keep their plan-6 `ink` ring, like the tabs" — `ink` is a contract token at ≥ 3:1 on its background · Alternatives: switch the header rings to `accent` (an accent ring around the accent logo pill) · Reversibility: cheap · Why: narrowed reading of R14 on a plan-6 precedent — to re-read.

## D61 · Plan 11 · verification 1 — R14 kept as written; header rings move to the accent (supersedes D60's reading)
Choice: the verifier refused D60's widened reading of R14; the criterion stays as written and the header's three `focus-visible:outline-ink` become `outline-accent` (F1); the empty-state spacing defect it found becomes F2 · Alternatives: amend R14 to allow `ink` in the header (a narrowed criterion, needs the user) · Reversibility: cheap · Why: fixing three classes is cheaper than a criterion amendment; one ring colour for every non-tab control.

## D62 · Plan 11 · F2 — The script hides an empty grid
Choice: `list-pattern.ts` sets `grid.hidden` whenever no card is visible, and `[data-list-grid][hidden]` joins the list-pattern `display: none !important` guards; the server never renders the grid hidden (no-JS unchanged) · Alternatives: a CSS `:has()` rule hiding a grid whose children are all hidden; a `gridEmpty` field in `computeListState` · Reversibility: cheap · Why: the script already knows the visible count; measured after the fix: the empty block sits 0 px from the frame's inner top and bottom on `/blog`, `/projets`, `/prompts`, both themes, and the grid returns when results do.

## D63 · Plan 10 · after the run — `/a-propos` confirmed by the user
Choice: D42 and D48 are re-read and kept — the user confirmed on 2026-09-24 that `/a-propos` matches what the prototype asked for · Alternatives: — · Reversibility: cheap · Why: user's review of the ⚑ decisions.

## D64 · Run · E1 — Publish wave 2 as v1.4.0
Choice: fast-forward `main` to the integration branch, annotated tag `v1.4.0`, push `main`, `v1.4.0`, `milestone-plan-9`, `milestone-plan-10`, `milestone-plan-11`, then a production check · Alternatives: wait · Reversibility: expensive (a published tag and a production deploy) · Why: user's answer "A" to escalation E1.

## D65 · Run 3 · cadrage — Schema unfrozen, sourced filling only (supersedes D1)
Choice: new optional fields in `src/content.config.ts` and `public/admin/config.yml`; values written into `src/content/{projects,prompts,skills}/**` only from a verifiable source, each file touched logged `⚑ à relire`; a block without data is omitted · Alternatives: fields only, left empty; keep the freeze · Reversibility: cheap · Why: user's answer A at cadrage — the freeze is what stripped the detail pages.

## D66 · Run 3 · cadrage — `No content` bodies: source or empty (supersedes D4)
Choice: `superpowers` body written from the plugin's README / SKILL.md (`⚑ à relire`); `macos-clone` body emptied, block hidden · Alternatives: empty both; leave as is · Reversibility: cheap · Why: user's answer A at cadrage.

## D67 · Run 3 · cadrage — The prototype outranks the contract text where they disagree   ⚑ à relire
Choice: contract §5.1 (four identical lists) and §8.2 (thumbnail + featured everywhere) are superseded by the prototype's per-list designs; the prototype's own radii (7, 8, 12, 16, 18, 24 px) join V6's set; always-dark windows get named tokens; D7/D8 are superseded where the prototype places metadata and the install command elsewhere · Alternatives: amend the prototype to the contract · Reversibility: cheap · Why: the contract names the artboard as its single source of truth; the user asked to align on the prototype.

## D68 · Run 3 · cadrage — One publication at the end of the run (v1.5.0)
Choice: a single `publication` escalation after plan 18 · Alternatives: per plan; two stages · Reversibility: cheap · Why: user's answer A at cadrage — production never shows a half-migrated site.

## D69 · Plan 12 · authoring — Shell in `BaseLayout`, 1180 px token, responsive padding
Choice: one `data-shell` wrapper in `BaseLayout` capped by a new `--container-shell: 1180px` token; side padding 24 px from 640 px, 16 px below; detail pages keep their inner column until plans 13/15–17 · Alternatives: a container per page; 24 px everywhere · Reversibility: cheap · Why: one source of truth for the width every later plan inherits; 16 px keeps the 375 px budget.

## D70 · Plan 12 · authoring — Footer copy from the site's own description   ⚑ à relire
Choice: left `bencat_ — site perso de Benoît Catillon` (home description), right `Astro · GitHub Pages · Sveltia CMS`, plain text · Alternatives: year / ©, links · Reversibility: cheap · Why: the prototype's left text is demo copy; no invented phrase. UX text with no precedent.

## D71 · Plan 12 · authoring — `muted` replaces the prototype's `dim` on small meta text
Choice: footer, rail labels and counts, dropdown counts use `muted` · Alternatives: keep `dim` · Reversibility: cheap · Why: `dim` measures 4.19:1 on `bg` and 3.93:1 on `rail` in light — below AA (V8).

## D72 · Plan 12 · authoring — Header details: no `⌘K` hint, CSS-switched sun/moon, nav on its own row below 640 px
Choice: the `⌘K` kbd goes (the shortcut stays); the theme icon swaps by CSS on `data-theme`; below 640 px the nav pill takes a full-width row · Alternatives: keep the hint; JS icon swap; scrolling pill or burger · Reversibility: cheap · Why: the prototype has no hint; no-JS parity; the prototype has no breakpoints.

## D73 · Plan 12 · authoring — Blog rail: tags link to their pages; tag select, `tous les tags →` and card-chip filter removed   ⚑ à relire
Choice: tag chips link to `/tags/<slug>/` with published-post counts; the tag `<select>`, the `tous les tags →` link and the row's category-pill filter (`blog-filters.ts`) are removed; below 768 px the rail stacks above the list; without JS the category rows and sort trigger are hidden · Alternatives: inert chips as in the prototype; keep the tag filter as a second dropdown · Reversibility: cheap · Why: the prototype has no tag filter on /blog; linking keeps tag pages reachable. Visible feature removal on an existing page.

## D74 · Plan 12 · authoring — Surface rule V2: an explicit rail may sit on `surface`   ⚑ à relire
Choice: an element marked `data-rail` may paint `rail` directly on `surface`, as the prototype's blog and article rails do; the audit scripts allow it · Alternatives: paint the rail as `surface`; insert a `card` layer · Reversibility: cheap · Why: D67 — the prototype outranks the contract; narrowed reading of V2 inherited by plans 13, 14, 18.

## D75 · Plan 12 · authoring — Dropdown and list-engine details
Choice: dropdown = button + listbox with focus on options, Tab closes, label `tri :`, default `plus récents`; meta line `5 articles · catégorie : Tout` at rest; site AI labels kept (`co-créé avec IA`); engine skips the featured entry when a page has none; `ListHeader.astro` used on /blog only (plan 14 adopts it); first row image eager · Alternatives: `aria-activedescendant`; prototype's shorter labels · Reversibility: cheap · Why: plan-author choices within the inventory; labels already validated on the site.

## D76 · Plan 12 · T1 — Shell wrapper is a `div`; 404 and transparence-ia lose their own side padding
Choice: `<div data-shell="main">` in `BaseLayout` (pages keep their `<main>`); `/404` and `/transparence-ia` keep `max-w-3xl` without `px-*`; `Header.astro` container widened in T1 · Alternatives: move `<main>` into the layout (touches every page); double padding · Reversibility: cheap · Why: minimal change that keeps `check-secondary`'s single-`<main>` assertion.

## D77 · Plan 12 · T2 — Header details the inventory leaves open
Choice: nav pill radius 20 px below 640 px (five items wrap to two rows; 999 would clip corners), 999 above; action icons 15 px like the nav; logo tile bars 3 px tall, 3 px gaps; actions pill on `nav` + `line` like the other two; unused `logo` glyph removed; theme button label unchanged · Alternatives: 999 at every width; 16 px icons; transparent actions container · Reversibility: cheap · Why: values the inventory does not fix; checked rendered at 1280 px against the prototype.

## D78 · Plan 12 · T3 — Dropdown component details
Choice: generic `Dropdown.astro` (label, options with counts, selected, minWidth, icon `sort|filter`, id) + `dropdown-change` event fired only on a real change; ✓ in a fixed left slot, rendered in the HTML; options in sans 13 px `body`, counts mono 10 `muted`; Lucide glyphs `sort`, `filter`, `chevron-down` typed in `Icon.astro`; id derived from the label slug (deterministic builds) · Alternatives: ✓ on the right or via CSS; random ids · Reversibility: cheap · Why: values the inventory leaves open; plan 14 reuses the component.

## D79 · Plan 12 · T4 — Engine options
Choice: `computeListState(..., { featured })` 5th argument; `[data-sort]` found page-wide (`<select>` or dropdown); reset returns a sort dropdown to its server value; the empty-state sentence keeps `label value`; an all-label facet keeps its declared position in the meta line; dropdown-driven facets deferred to plan 14 · Alternatives: flag on `ListLabels`; scope `[data-sort]` to `[data-list]` · Reversibility: cheap · Why: additive change, existing lists unchanged (check-finition identical to base).

## D80 · Plan 12 · T5 — Blog list details
Choice: `ListHeader` root is a `div` (one `<header>` per page); rail labels are `<p>` labelling their group; rows are h2 with a stretched link and declare only the `category` facet; chip text carries a real space (`devops 3`); `ArticleCard.astro` and `blog-filters.ts` deleted; open values (h1 lh 1.1, toolbar `pb-4`, rows gap 6 px, main `px-5` below 640 px) taken by the implementer; rendered at 1280 px dark and compared to the prototype by the orchestrator · Alternatives: keep dead code; h2 rail labels · Reversibility: cheap · Why: carries out D73.

## D81 · Plan 12 · T6 — Instruments: row lists named, explicit rails on surface or card
Choice: check-finition applies row rules to lists named in `ROW_LISTS` (`blog`; plan 14 adds its own); `rail column` counts non-thumbnail `data-rail` elements; an explicit rail may sit on `surface` or `card`, never on `bg`/`panel`; check-home fails on several `data-featured` rows · Alternatives: infer rows from `[data-rail]`; count every `data-rail` · Reversibility: cheap · Why: carries out D74 with the narrowest exemption.

## D82 · Plan 12 · F1 — `box-content` shell and top-aligned 47 px header pills
Choice: the three `[data-shell]` boxes are `box-content` (1180 content + padding outside, footer border spans 26–1254 at 1280 as in the prototype); header row `items-start`; nav items `flex` + `leading-[17px]` → nav pill 47 px. Measured at 1280: shells and card 50–1230 / 1180, pill tops 20/20/20; 375 px: scrollWidth 375 · Alternatives: padded outer wrapper; keep `items-center` · Reversibility: cheap · Why: reproduces the prototype's content-box wrapper exactly.

## D83 · Plan 12 · F2 — Popover slides to stay 8 px inside the viewport
Choice: pure `placePopover` (width capped at viewport − 16, right-aligned when it fits, otherwise slid just enough), re-run on open and resize. Measured: 375 → x 8–244, 0 clipped options; 1280 → right edges 1201/1201, gap 10.75, width 236 · Alternatives: left-align to the trigger; close on resize · Reversibility: cheap · Why: minimal movement keeps the popover near its trigger.

## D84 · Plan 12 · F3 — Sort options in mono 11 with the prototype's icons; token shadow kept
Choice: options JetBrains Mono 11 px with the prototype's 14 px stroke icons (✓ moves to the right end when an option has an icon); sort popover `minWidth` 250 = prototype's 236 content-box + padding + border (facet dropdowns in plan 14: 216 → 230 by the same sum); trigger icon redrawn from the prototype; shadow stays `var(--shadow)` (prototype colour is off-token, no dark variant). Measured: font JetBrains Mono 11px, width 250, 4 icons, right edges 1201/1201; 375 → x 8–258, 0 clipped · Alternatives: ✓ before the icon; a new shadow token · Reversibility: cheap · Why: fidelity within the token contract; the prototype's drawings are the site owner's own work.

## D85 · Plan 12 · F4 — Sort moves nodes; hidden entries go last
Choice: pure `domOrder(ids, visibleIds)` → visible entries in sort order, then hidden ones in server order, applied with `grid.append`; only direct grid children are entries; the first `featured: true` post's row carries `data-featured` (none today). Measured: after `plus anciens`, DOM order = visual order (docker → k9s → vpn → linux → comment) · Alternatives: leave hidden entries in place · Reversibility: cheap · Why: keyboard order must follow the visual order (WCAG 1.3.2).

## D86 · Plan 13 · authoring — Article layout choices
Choice: previous/next without wrap (précédent = next-older); category rows link to `/blog/?categorie=<value>` read once by the list engine; DOM order centre → right rail → left rail, three columns from 1024 px, stacked below (article first on a phone); article rail shows the whole blog's categories and tag cloud with counts, rows muted without active state; cover 210 px `object-cover`; prototype prose / code-block / Copier values apply site-wide; radius tokens 7, 12, 13, 16 px; related-post dates `muted` (D71); `Articles liés` hidden when empty, right rail dropped when empty; Projets liés shows the full title · Alternatives: circular wrap; plain `/blog/` links; left-rail first on mobile; 16:9 cover · Reversibility: cheap · Why: plan-author choices within the inventory; the prototype has no breakpoints.

## D87 · Plan 13 · authoring — The AI card replaces the top banner on articles   ⚑ à relire
Choice: the article's AI-usage declaration moves from `AiBanner` at the top to the prototype's AI-marker card at the end of the post (site emoji and labels, link `ma règle sur l'IA →` to `/transparence-ia/`); the header meta row also shows the AI marker, so the level stays visible above the fold · Alternatives: keep the banner at the top as well · Reversibility: cheap · Why: prototype placement; transparency content, so to re-read.

## D88 · Plan 13 · T4 — Cards may sit on an explicit rail   ⚑ à relire
Choice: `check-finition` (T5) accepts a `.card-inner` on `rail` when inside a `[data-rail]` element — the prototype's related-post and related-project cards sit on the article rails · Alternatives: drop the card style from rail cards (departs from the prototype) · Reversibility: cheap · Why: D67; second narrowing of V2 after D74, to re-read together.

## D89 · Plan 13 · T4 — Article page details
Choice: tile titles turn `accent` on hover; below 640 px the AI card's link wraps under the text; the AI card keeps `role="note"` + label from `AiBanner`; prose starts 34 px under the cover; related-post dates in long fr-FR form; checker hooks `data-article-*` · Alternatives: no hover; one squeezed row · Reversibility: cheap · Why: implementer choices within the plan.

## D90 · Plan 13 · verification 1 — R13 measured on article results only   ⚑ à relire
Choice: R13's search check becomes "query `ma règle sur l'IA` → no `/blog/<slug>/` result" — the verifier found 3 results (2 prompts, 1 skill) matched on scattered words, none an article · Alternatives: keep "0 results" and strip those words from other pages (content change, out of scope) · Reversibility: cheap · Why: the criterion's intent is "rails not indexed"; its literal measure assumed the phrase existed nowhere else. Narrowed reading.

## D91 · Plan 13 · F1–F2 — Audit exemption narrowed; rail insets from the prototype
Choice: the audit exempts a card only when its painted parent paints `rail` inside a non-thumbnail `[data-rail]` (fails closed without a rail token); rail labels `px-2` (8 px) and tag cloud `px-1.5` (6 px) as prototype lines 174/184/185 and 244/254/255 — measured x 24 / 22 on `/blog` and an article; `/blog` HTML now differs from plan 12 by these two classes · Alternatives: arbitrary px values; leave `/blog` untouched · Reversibility: cheap · Why: verification 1 findings 1–2.

## D92 · Plan 14 · authoring — Lists without an outer frame; no "prochain projet" card
Choice: on `/projets`, `/prompts`, `/skills` each entry is a `.card` on the page (D67 supersedes D51's frame + `.card-inner`); the prototype's dashed "prochain projet" card is not shipped (demo copy only); hero shows the cover or a hatched placeholder without badge; status pills keep the D53 colours; 24 px `--radius-feature` for the hero · Alternatives: keep the frame; ship the card with neutral copy · Reversibility: cheap · Why: prototype structure; no invented copy.

## D93 · Plan 14 · authoring — Facets, counts, labels and empty states
Choice: fixed counts over all published entries, zero-count segments kept (`Archivé 0` reaches the empty state); segments `Tous · Actif · WIP · Archivé`, `Tous · Fiche · Guide`, skill types as written; dropdown all-options `toutes` (techno) / `tous` (outil, tag); the prototype's empty-state sentences, with a slotted projects template; `[data-list-meta]` kept as a visually hidden live region; one shared `ListEmpty` component; grid 1 / 2 / 3 columns at < 640 / 640 / 1024, hero stacks below 768, segmented track wraps with radius 20 below 640; cards are `<article>` with a stretched h2 link; hero date `depuis <mois année>` · Alternatives: counts following the other facet; hiding zero segments; visible count line · Reversibility: cheap · Why: prototype behaviour; `aria-live` kept from plan 11.

## D94 · Plan 14 · authoring — Prompt stats and early schema fields
Choice: lines = newlines + 1 and tokens = chars / 4 rounded, measured on `prompt` (fiche) or the body (guide), trimmed; prompt `version` and `variables[{name, hint?, default?}]` added now, empty (no source), reused by plan 16; skill summary counts published related prompts only (commands / sub-skills → plan 17); superpowers content version left at 6.2.0 (→ plan 17) · Alternatives: count `{{placeholders}}`; defer fields to plan 16 · Reversibility: cheap · Why: derivable today, no invented values.

## D95 · Plan 14 · authoring — Skill licence `MIT` from the plugins' own LICENSE files   ⚑ à relire
Choice: new optional `license` field on skills (schema + Sveltia); `anti-drift-planning` → `MIT` (its LICENSE, © 2026 bendevcat, and `plugin.json`); `superpowers` → `MIT` (its LICENSE, © 2025 Jesse Vincent, and `plugin.json` in the 6.3.0 and 6.4.1 caches) · Alternatives: field left empty · Reversibility: cheap · Why: D65 sourced filling; legal content, so to re-read.

## D96 · Plan 14 · authoring — Third V2 narrowing: count badges on `chip` in a segmented track   ⚑ à relire
Choice: `check-finition` accepts a card-level count badge on `chip` inside `[data-segmented]` (the prototype's active-segment badge) · Alternatives: a class trick to dodge the static check · Reversibility: cheap · Why: D67; to re-read with D74 and D88.

## D97 · Plan 14 · T1 — Content files touched: two `license: MIT` lines   ⚑ à relire
Choice: `src/content/skills/anti-drift-planning/index.md` ← `~/workspace/claudeworkspaces/anti-drift-planning/LICENSE` l.1 "MIT License", l.3 "Copyright (c) 2026 bendevcat" + `.claude-plugin/plugin.json:10` `"license": "MIT"`; `src/content/skills/superpowers/index.md` ← `~/.claude/plugins/cache/claude-plugins-official/superpowers/{6.3.0,6.4.1}/LICENSE` l.1 "MIT License", l.3 "Copyright (c) 2025 Jesse Vincent" + `plugin.json:11`. CMS fields: prompts `variables` after `prompt`, `version` after `model`; skills `license` (free text) after `version`; `variables` optional without default, only `name` required inside · Alternatives: SPDX list; required sub-fields · Reversibility: cheap · Why: D65/D95 — orchestrator re-read both LICENSE files.

## D98 · Plan 14 · T2–T3 — Card helpers and engine additions
Choice: `listCards.ts` returns display strings with `null` for hidden slots (`1 variable` / `N variables`; hero date read in UTC; empty text → `0 l.` · `~0 tk`; blank version / licence hide their slot); engine `facetCounts` (fixed counts, `ALL` included), `[data-dropdown][data-facet-key]` facets, `data-list-empty-template` with `{key}` slots (unknown slots dropped, no template → historical sentence) · Alternatives: raw numbers; literal `{key}` left in · Reversibility: cheap · Why: additive, `/blog` and the article unchanged (six scripts identical).

## D99 · Plan 14 · T4 — Projects list details
Choice: grid-card title / description / chips as direct children with 14 px side padding; tile hatch = the hero's (prototype l.377); grid status pill same box as the hero pill with D53 tones; only `code source ↗` has a hover (no off-token opacity); inactive segment hover changes the background only; `check-lists.mjs` reads `data-card-field` / `data-card-*` / `data-hero-*` hooks; server empty sentence = template with no facet. Orchestrator render at 1280 dark matches the prototype's projects screen captured at cadrage · Alternatives: inner wrapper; older hatch · Reversibility: cheap · Why: prototype markup past line 400 unreadable (design scopes).

## D100 · Plan 14 · T5 — Prompts and skills cards details
Choice: fixed empty sentences passed as slot-less templates (keeps "Aucune skill"); `ouvrir la fiche →` is `aria-hidden` text (the stretched title link is the card's only link); pills 4/8 `leading-none`; prompt cards keep only `{format, tool}` facets (a `?tag=` link on /prompts is ignored); `Thumbnail` `size` now required; install command shown verbatim. Plan text R21 corrected 185 → 192 chips (the plan counted chips on hidden duplicates) · Alternatives: engine flag for fixed sentences; keep `tag` facet data · Reversibility: cheap · Why: prototype has no tag facet on /prompts.

## D101 · Plan 14 · F1–F2 — Schema-driven CMS test; reset focuses the filters
Choice: `cms-config.test.ts` reads each collection's keys from the exported `collections` (stand-in `image()` for blog / projects) and keeps the form-order checks as separate written-out tests — orchestrator re-ran the `license` removal: 1 failed / 48 passed, restored 49/49; after a reset, pure `resetFocusIndex` focuses the first group's `Tous`/`Tout` control (dropdown → its trigger), for keyboard and mouse alike — measured on `/projets`: focus on `Tous 2` (`aria-pressed="true"`) · Alternatives: parse the source text; focus only on keyboard resets · Reversibility: cheap · Why: verification 1 R6 and finding 2.

## D102 · Plan 15 · authoring — No project licence: field added, left empty   ⚑ à relire
Choice: optional `license` on projects (schema + Sveltia), empty on both entries; the sidebar licence row is omitted · Alternatives: fill a guessed licence · Reversibility: cheap · Why: no LICENSE file in this repo nor in any local `bencatlab/gha-svu` clone (checked by the orchestrator); D65 forbids unsourced values.

## D103 · Plan 15 · authoring — Code windows show whole real workflow files   ⚑ à relire
Choice: `snippet` + `snippetFile` in frontmatter; `site-bencat` ← this repo's `.github/workflows/deploy.yml` (35 lines, verbatim); `gha-svu` ← `check-pr.yml` from `~/workspace/tools/gha-svu` at `cbf8c36` (30 lines, verbatim) · Alternatives: gha-svu's README example (pins a non-existent `@v0.1.0` tag and reads an undefined step id); first body code block (none exists); no window · Reversibility: cheap · Why: prototype's code window fed from a real source; security flag because CI permissions and deploy steps are shown (both files already sit in public repos).

## D104 · Plan 15 · authoring — Stack roles quoted from the projects' own text
Choice: roles stored as a Sveltia-editable list `{ name, role }`, each a fragment quoted from the project's title, description or body (a test enforces it): Astro `statique`, Tailwind CSS `thème`, Sveltia CMS `écrire sans toucher au code`, GitHub Pages `déploiement`, GitHub Actions `action composite`, SVU `prochain numéro de version`; TypeScript, Bash, Go without role; a tech without a logo shows a monogram · Alternatives: no roles; roles from `action.yml` · Reversibility: cheap · Why: D65 sourced filling.

## D105 · Plan 15 · authoring — Project page layout details
Choice: Aperçu = whole body then the code window (first paragraph plays the "why"); the cover becomes the banner and no longer feeds Aperçu; `démo ↗` kept as a second sidebar button; 10 always-dark window colour tokens (identical in both themes, traffic lights = standard macOS values) + `--radius-aside: 18px`; one column below 1024 px, sidebar after the card; sidebar, window, labels and back link out of the search index; sidebar label "Le projet en bref" · Alternatives: first paragraph only; drop `démo ↗` · Reversibility: cheap · Why: plan-author choices within the inventory.

## D106 · Plan 15 · T2 — Content files touched: project roles and snippets   ⚑ à relire
Choice: `src/content/projects/site-bencat/index.md` ← roles quoted from its own body (l.14–16 "Astro en statique", "pour le thème", "pour écrire sans toucher au code"; l.24 "déclenche le déploiement sur GitHub Pages") + snippet = `.github/workflows/deploy.yml` verbatim (35 lines); `src/content/projects/gha-svu/index.md` ← roles from its body (l.16–17 "action composite", l.13 "prochain numéro de version") + snippet = `git -C ~/workspace/tools/gha-svu show cbf8c36:.github/workflows/check-pr.yml` verbatim (30 lines — orchestrator diffed it: equal); no `license`. CMS labels in French with hints to quote roles and to fill `license` only from a LICENSE file; `projectContent.test.ts` pins the role set and the absence of licence · Alternatives: fixture copy of the gha-svu file · Reversibility: cheap · Why: D65 / D103 / D104.

## D107 · Plan 15 · T3–T4 — Window tokens named `--color-window*`; underline tabs without `-mb-px`
Choice: 10 `--color-window*` tokens (generic, reused by plans 16–17) in both theme blocks, audit contract colours 37 → 47, contrast test also covers text on `windowLine`; underline tabs: the 2 px accent line sits above the 1 px `line2` row border (no `-mb-px`: `overflow-x-auto` would add a 1 px vertical scroll), focus ring inset (`-outline-offset-2`), 24 px above the row, selected count stays `muted`; prompt / skill pages byte-identical to base after hash normalisation · Alternatives: `-mb-px` with a 1 px scroll; inset-shadow row line · Reversibility: cheap · Why: implementer measurements; plan text amended in spirit (R10 underline still drawn).

## D108 · Plan 15 · T5 — Project page details
Choice: `<main>` wraps the article; h1 lh 1.15 / −.03em like the article; code window with a `windowLine` rule under the title bar, `aria-label="Extrait : <file>"`, dedicated `code-window.ts` Copier (copy-code skips `[data-code-window]`); stack tiles centred; related-post tiles change title colour on hover only; sidebar buttons without hover (no fitting token); meta-card shadow inline `var(--shadow)` so it follows the theme; banner eager; `check-project.mjs` uses the existing `yaml` dependency · Alternatives: `figcaption`; lift on hover · Reversibility: cheap · Why: values the inventory leaves open.

## D109 · Plan 16 · authoring — Bootstrap prompt stored as a template with 4 sourced variables   ⚑ à relire
Choice: `bootstrap-session-anti-drift`'s `prompt` gets `{N}` ×13, `{topic}` ×4, `{BASE_REF}` ×1, `{LANGUAGE}` ×1, only where the canonical `anti-drift-planning/skills/anti-drift-planning/references/bootstrap-prompt-template.md` has that placeholder; defaults = the stored instance's values, so the rendered default text is byte-identical to the old field; hints quoted in English from `commands/start-session.md` · Alternatives: no variables (the tab never appears); all 9 placeholders; French hints · Reversibility: cheap · Why: D65 sourced filling; the body says the instance is "non retouchée" — true of the rendered text, not of the stored field.

## D110 · Plan 16 · authoring — macos-clone reflowed from its own text; body emptied   ⚑ à relire
Choice: each ` - ` of the one-line `prompt` starts a new line, blank lines before `Exigences:` / `Important:`, flat list (48 lines, ~607 tk); the literal `No content` body is emptied (D66) and the CMS prompt `body` becomes `required: false` · Alternatives: keep one line; indent sub-items (judgement) · Reversibility: cheap · Why: whitespace-only derivation of the prompt's own text.

## D111 · Plan 16 · authoring — Prompt page structure
Choice: the guide's window shows its raw markdown body (plan 14 stats rule); a fiche's body feeds `décryptage`; no `sortie` / À utiliser / À éviter (no source, no fields added); optional `updated` field left empty; `.md` downloads the current text as `<id>.md`; 4 always-dark tokens (`windowAccent`, `windowAccentInk`, `windowVar`, `windowVarBg`, 47 → 51) with the dark highlight in both themes (the prototype's light value is ~2.4:1 on the dark window); counts fixed to the default text; related skills = declared + reverse `relatedPrompts`; related prompts = shared skill or tag, max 3; tag chips kept in Infos; single-tab pages show no track (D13); wrapped lines, no dots, no line numbers, empty input shows `{name}`; `~/ prompts` links to `/prompts/`; column label "Autour du prompt" · Alternatives: prose card for guides; live counts · Reversibility: cheap · Why: plan-author choices within the inventory.

## D112 · Plan 16 · T2 — Content files touched: two prompts   ⚑ à relire
Choice: `bootstrap-session-anti-drift/index.md` — `{N}` ×13, `{topic}` ×4, `{BASE_REF}` ×1, `{LANGUAGE}` ×1 at the canonical template's placeholders; defaults from the base instance (`4`, `librairies-prompts-skills`, `main`, `français`); hints verbatim from `commands/start-session.md` l.20, 21, 26, 27; rendered defaults `cmp`-identical to the base field (10952 bytes); body sentence "instance réelle et non retouchée" left as is. `macos-clone/index.md` — `prompt` reflowed to a 48-line `|-` block (whitespace-only, collapse check true); `No content` body emptied. CMS: `updated` datetime field, `body` optional, `{nom}` hints (implementer's French wording); tests pin SHA-256 of the base prompts rather than calling `git show`. Plan text T4 acceptance corrected: `check-detail-tabs` exits 1 on macos-clone until T5 (single panel) · Alternatives: move the single-panel rule into T4 · Reversibility: cheap · Why: D109 / D110.

## D113 · Plan 16 · T3–T5 — Prompt page details
Choice: track tabs `px-2 py-1.5` `flex-1` so four fit in 340 px, panels `card rounded-aside` with inline `var(--shadow)`, no-JS headings outside the cards; décryptage 14 px (headings 16/600) with important utilities over the unlayered `.prose`; meta row and tab labels stay indexed; variables padded 3 px; `.md` named `Télécharger <id>.md`; Copier failure label `Échec — copie manuelle`; inputs focus by `accent` border; values re-applied on bfcache restore. Orchestrator render: typing `12` in `{N}` updates all 13 highlighted segments live · Alternatives: wrapping labels; focus-visible outline · Reversibility: cheap · Why: values the inventory leaves open.

## D114 · Plan 16 · verification — Prompt window reuses plan 15's window colours
Choice: the prompt window paints `windowBg` `#0B1017` / `windowHead` `#111823` rather than the prototype's `#0E1319` / `#131A22` · Alternatives: two more tokens for a near-identical shade · Reversibility: cheap · Why: one family of always-dark windows across the site; the difference is below visual threshold and keeps the token count down.

## D115 · Plan 17 · authoring — Skill content sourced from the plugins   ⚑ à relire
Choice: 8 optional skill fields (schema + CMS) filled from the plugins: triggers (anti-drift: the 7 phrases of its SKILL.md `description`; superpowers: the 7 "Activates …" lines of its README Basic Workflow), changelog rows (CHANGELOG / RELEASE-NOTES, quoted), highlights (anti-drift: the five locks quoted in French from the site's own body; superpowers: the 4 README Philosophy bullets), install notes (anti-drift: quoted from its own body — "La commande d'installation de cette fiche n'est pas exécutable en l'état"), `skillCount` / `commandCount` from the plugin trees; superpowers `version` 6.2.0 → 6.4.1 (installed cache `plugin.json`; also changes the /skills card, home and Skills liés); superpowers `No content` body replaced by a French intro of sourced facts + the README "How it works" as verbatim English blockquotes · Alternatives: keep 6.2.0; English highlights; empty body · Reversibility: cheap · Why: D65 / D66 / D94.

## D116 · Plan 17 · authoring — File explorer snapshot in the repo, e-mails excluded   ⚑ à relire
Choice: `files[]` + `filesSource` in frontmatter (CMS-editable), excerpts ≤ 16 lines from commit `3dc3336` (anti-drift: `plugin.json`, 7 commands, SKILL.md) and the 6.4.1 cache (superpowers: `plugin.json`, `hooks.json`, `using-superpowers` + 8 Basic Workflow SKILL.md); excerpts stop before the first line holding an e-mail address (both `plugin.json` cut at line 6); single-entry folders merged, files are `aria-pressed` buttons; no-JS shows every preview · Alternatives: bundled files beside `index.md`; full tree · Reversibility: cheap · Why: CI cannot read local plugin paths; privacy.

## D117 · Plan 17 · authoring — Skill page structure
Choice: `maj.` = date of the changelog row of the displayed version (no stored field); content summary `N skill(s) · N commande(s) · N prompt(s)` on card and header; author body kept in a 4th left card `En détail`; install window shows the stored `claude plugin …` form, Copier copies `installCmd` verbatim; `RelatedPromptsCard` gains `label` / `headingId` / `tool` props; `code source ↗` and tag chips move into infos, `nom` row dropped; unused `pill` tab variant left for plan 18 · Alternatives: drop the body; prototype's `/plugin …` form · Reversibility: cheap · Why: plan-author choices within the inventory.

## D118 · Plan 17 · T2 — Content files touched: two skills   ⚑ à relire
Choice: `anti-drift-planning/index.md` ← `git show 3dc3336:` SKILL.md l.3 (7 triggers), CHANGELOG.md l.8/52/66/83 + texts l.19/56/70/87 (4 rows, Markdown marks stripped), counts from `ls-tree` (1 skill, 7 commands), 9 excerpts (plugin.json l.1–6, commands and SKILL.md l.1–16 or 15), highlights and install note quoted from the site's own body; `superpowers/index.md` ← 6.4.1 cache: plugin.json l.4/11 (version 6.4.1, MIT), README l.309–321 (7 triggers), RELEASE-NOTES l.3/62/101 + texts (3 rows), README l.368–371 (4 highlights), README l.62 (install note), 15 skills / no commands, 11 excerpts; body = French intro (implementer's wording, facts from plugin.json / README l.52–305, 333, 58) + 5 verbatim English blockquotes (README l.38–46) + skill groups (README l.341–364). `check-skill-sources.mjs` (local-only) re-run by the orchestrator: exit 0; no e-mail address in either file. CMS: date-only changelog dates, one input per highlight / trigger, `body` optional · Alternatives: keep Markdown in changelog texts; `lang="en"` blockquotes · Reversibility: cheap · Why: D115 / D116.

## D119 · Plan 17 · T4 — Skill page details; tag chips must link (F1)
Choice: `quoteLang` marks quoted triggers / highlights / notes `lang="en"` or `fr` by accents and function words; `copy-code.ts` skips the explorer; `check-detail-tabs` tolerates minifier-merged selectors; explorer no-JS rules in `@layer base`; `windowLine` under each preview bar; breadcrumb out of the index. Plan text R20 corrected (the token-line grep counted the diff's `---` header). T4 left the infos tag chips as plain text, but the plan's reachability names "tag chips › `/tags/<tag>/`" → fix task F1 · Alternatives: per-item `lang` field; leave chips inert · Reversibility: cheap · Why: plan conformance.

## D120 · Plan 17 · F1–F4 — Fixes after verification 1
Choice: F1 infos tag chips link to `/tags/<slug>/` (`aria-labelledby` on the `dt`); F2 boundary instants 23:30Z / 00:30Z pin UTC in `versionDate`, `updatedLabel`, `projectMetaRows`, `featuredSince` — red in Paris, New York and Tokyo when the option is removed (plan text corrected: under `TZ=UTC` the option is a no-op); F3 `data-pagefind-ignore` on every tab row (Pagefind query `Notes de version` no longer returns skill pages) and the skill aside capped at `calc(100vh - 40px)` with internal scroll from 1024 px, padded 8 px sides / 20 px bottom so focus rings and shadows are not clipped (aside box 356 px, content 340); F4 superpowers README quotes wrapped in `<blockquote lang="en">` with the quoted line unchanged (content file touched ⚑ markup only), English description / install note get `lang="en"` via `quoteLang` · Alternatives: inner scrolling wrapper; full-HTML quotes · Reversibility: cheap · Why: verification 1 findings.

## D121 · Plan 18 · authoring — Finishing scope and exclusions
Choice: home rows / columns gap 16, home panel titles right-aligned next to the badge (prototype `row-reverse` + `flex-start`); about gets the 3 px accent border on "Pourquoi ce site" (links already github / rss only); other home pixel differences and about spacing left out (about markup not cached); theme toggle hidden without JS by an `html:not([data-js])` rule; prompt variables show `défaut : <value>` without JS; `lang="en"` on every English entry description site-wide (skill descriptions on `/skills`, home, `/tags/<tag>`); macos-clone whitespace guard test added; search Escape keeps the native two-step (clear, then close) with focus back on the loupe; `DetailTabs` `variant` required (`underline | track`), unused `pill` and `ProjectAside` `class` removed; skill aside `scroll-padding-bottom: 8px`; rail label gap 10 px on both `BlogRail` variants; PromptInfos tag chips linked. R13 (side by side) falls back to smoke and R14 (structure vs the inventory, 10 screens) carries the proof · Alternatives: close every pixel difference; escalate R13 as blocked · Reversibility: cheap · Why: carried items from plans 12–17, each named or excluded.

## D122 · Plan 18 · T1–T7 — Finishing details
Choice: home headers keep DOM order title → badge with `justify-end` + `flex-1 text-right` (reading order title first; prototype uses `row-reverse`); "Pourquoi ce site" `border-l-3 border-l-accent`; `lang="en"` decided by `quoteLang` on the description element of SkillCard, SectionEntry, RelatedSkillsCard and `/tags/[tag]` (5 renderings); one unlayered no-JS rule hides `#theme-toggle` without `data-js` and hides `défaut : <value>` lines with it; PromptInfos chips linked like SkillInfos; macos-clone double-space guard (`\S\s{2,}\S`); rail label gap `gap-2.5`; skill aside `lg:scroll-pb-2`; `DetailTabs` `variant` required, pill code and `.mt-10` removed; `check-fidelity.mjs` reads spacing from the built CSS and the English rule from `skillDetail.ts`; R17: 11 instruments identical to base, HTML diff limited to the 15 listed pages · Alternatives: literal `row-reverse`; explicit `lang` field (schema) · Reversibility: cheap · Why: plan 18 tasks.

## D123 · Run 3 · E1 — Publish wave 3 as v1.5.0
Choice: fast-forward `main` to the integration branch, annotated tag `v1.5.0`, push `main`, `v1.5.0`, `milestone-plan-12` … `milestone-plan-18`, then a production check · Alternatives: wait · Reversibility: expensive (a published tag and a production deploy) · Why: user's answer "A" to escalation E1.

## D124 · Plan 19 · T5 — Test backend opt-in through `?test-repo`   ⚑ à relire
Choice: in dev only, `/admin/?test-repo` loads Sveltia's `test-repo` backend seeded from `src/content/**` (OPFS); plain `/admin/` keeps the README's "Work with Local Repository" flow; `scripts/check-admin.mjs` proves the seeding code is absent from the production build · Alternatives: test backend by default in dev; a separate dev route · Reversibility: cheap · Why: agents cannot type the PAT nor use the native directory picker (brief, Smoke surfaces), and the author's local workflow must not change.

## D125 · Plan 19 · T3 — Preview CSS through `?inline`, root URLs made absolute
Choice: `global.css?inline` (Tailwind-compiled) registered with `registerPreviewStyle(css, { raw: true })`, root-relative `url()` rewritten to the page origin · Alternatives: `?url` (proven broken at authoring: the emitted URL has no file in `dist/`); a hand-copied stylesheet in `public/` (forbidden by Architecture B) · Reversibility: cheap · Why: a raw style is served from a `blob:` URL where `/_astro/…woff2` does not resolve.

## D126 · Plan 19 · T4 — `preSave` hook writes thematic breaks back as `---`
Choice: a `preSave` hook rewrites `***`/`___` rules of the body as `---` (outside code fences) and inserts a blank line before a `---` that follows text · Alternatives: adopt `***` as the canonical rule; accept that a CMS save turns the guard test red · Reversibility: cheap · Why: Sveltia's Lexical serialiser writes every rule as `***`; CI runs the tests before deploying.

## D127 · Plan 19 · T6 — `delete: true` set from source evidence, proven by walkthrough   ⚑ à relire
Choice: re-enable `delete` on the four collections because Sveltia 0.221's `deleteEntries` → `planCascadeDelete` removes the deleted slug from referencing optional relation fields in the same commit; R16 walkthrough + scratch build must prove it, otherwise the fix round sets `false` back (D08 maintained) · Alternatives: keep `false` until the walkthrough passed · Reversibility: cheap to flip, but a wrong `true` in production could break a deploy · Why: brief roster row 19; D08's cause (no back-reference cleanup) no longer holds in 0.221 source.

## D128 · Plan 19 · T2 — SRI dropped with the CDN; integrity rests on the npm lockfile   ⚑ à relire
Choice: `@sveltia/cms` 0.221.0 exact in `dependencies`, bundled by Vite; no CDN script, hence no SRI attribute (Plan 2's `68e854a`) · Alternatives: none compatible with Architecture B · Reversibility: expensive (going back means the CDN architecture) · Why: user-chosen Architecture B; `package-lock.json` integrity hashes replace the SRI.

## D129 · Plan 19 · T2 — Shared `svgo` raised to 4.1.0 by Sveltia's peer range
Choice: accept the lockfile bump `svgo` 4.0.2 → 4.1.0 (with `css-select` 6, `css-what` 7, `sax` 1.6.1) pulled by `@sveltia/cms@0.221.0`; the 51 site pages are byte-identical to the base build · Alternatives: lockfile overrides against Sveltia's `^4.1.0` requirement · Reversibility: expensive · Why: Architecture B needs the npm package; no visible change on the site. The ~2.1 MB admin chunk warning is left as is (admin-only bundle, 1/52 pages).

## D130 · Plan 19 · T4 — `preSave` returns the entry Map; Immutable.js comes from npm
Choice: `normalizeBodyBeforeSave` returns `entry.setIn(['data','body'], …)` (Sveltia 0.221 `types/public.d.ts` `AppEventListener`: an Immutable `MapOf<ApiEntry>`; runtime replaces the default-locale content when a Map is returned) and the same entry when nothing changes · Alternatives: return `undefined` when unchanged · Reversibility: cheap · Why: plan 19 R13. The implementer's flag that hooks load Immutable.js from unpkg holds only for the CDN build (`dist/sveltia-cms.mjs`); the npm build we bundle resolves it with `import('immutable')` (orchestrator check of `npm/index.js`), so no third-party fetch at save time.

## D131 · Plan 19 · F3 — Content pins stop blocking the author's CMS deletes and edits   ⚑ à relire
Choice: keep the wave-3 content tests' generic invariants (sourced roles verbatim, variables present, no `No content`, excerpt limits, changelog order, paths, no e-mail) and make the entry-specific snapshots conditional on the entry still holding its wave-3 sourced value (or drop those that only restate the source) · Alternatives: keep the pins and let every CMS delete/edit of a pinned entry block the CI deploy; exclude the content tests from `npm test` · Reversibility: cheap · Why: plan 19 verification finding 2 — with `delete: true`, deleting `gha-svu` turns 6 tests red and CI refuses to deploy; the same pins would block ordinary edits, contrary to the brief's "complete, simple board". The pins guarded agent-sourced filling (D65); the author now owns the content.

## D132 · Plan 19 · F1 — Pre-bundle `@sveltia/cms` in Vite's dep optimiser
Choice: `vite.optimizeDeps.include: ['@sveltia/cms']` in `astro.config.mjs` · Alternatives: document "restart the dev server after the first /admin visit" · Reversibility: cheap · Why: verification attempt 1, R7 — a cold dep cache made the first `/admin/` visit re-optimise and answer 504 on the dev toolbar until restart (plan T2 already allowed this edit).

## D133 · Plan 19 · F2–F3 — What the content tests still guard after D131   ⚑ à relire
Choice: the test board counts `index.md` files on disk (no literal 13); content tests keep generic rules only — stack roles name a tech of the stack and are verbatim from the project's own text, snippets of this repo's projects are a contiguous run of their file, declared variables occur in their prompt, no `No content` body, changelog newest-first holding the declared version, excerpts ≤ 16 lines without e-mail, unique relative paths — each proven red on a planted defect; dropped: per-entry snapshots (gha-svu/site-bencat roles, bootstrap SHA/129 lines, macos-clone 48 lines and whitespace, superpowers 6.4.1, `license` unset D102, `updated` empty D111) · Alternatives: keep the pins (CI blocks CMS edits); downgrade the remaining rules to warnings · Reversibility: cheap · Why: D131. ⚑ because D102 (no licence without a source) is now enforced by the author, not a test; and because the remaining rules still block a deploy for, e.g., a version bump without a changelog row (stated in README).

## D134 · Plan 20 · — Brouillons/Publiés only where a `draft` field exists; a draft's site link points to its future URL   ⚑ à relire
Choice: the Brouillons / Publiés filter pair goes on articles, prompts and skills (projects have no `draft` field, and Sveltia 0.221 rejects a filter on an undeclared field); "every entry has a working view-on-site link" is measured on published entries — a draft's link targets the URL it will have once published (404 until then) · Alternatives: add `draft` to projects (schema + site, a new feature); serve drafts in dev; hide the link on drafts · Reversibility: cheap · Why: the brief's "everywhere" and "every entry" cannot hold literally for these two cases (narrowed reading of R0, not a dropped goal).

## D135 · Plan 20 · — Navigation config choices
Choice: `site_url` unset (Sveltia uses the current origin: localhost in dev, production in prod); logo = `public/admin/logo.svg` redrawn from the header's 28×28 accent tile, both themes' accent tokens via `prefers-color-scheme`, tied to `global.css` by a test; `ajv@8.20.0` exact devDependency (already in the lock) to validate `config.yml` against Sveltia's shipped JSON schema; summaries use `ternary` for separators, versions `v<version>`, prompt format by its select label; project status filters labelled like the site's badges; year groups `pattern: '^\d{4}'` on `pubDate`; prompts sort by `updated` desc as the brief says (no prompt has it today); admin `<title>` = `benCat · Studio`; new tests in `src/lib/cms-navigation.test.ts`; check-admin counts entries from disk · Alternatives: see plan 20 · Reversibility: cheap · Why: plan 20 authoring.
