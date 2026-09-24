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
