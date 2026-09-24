# Fidelity inventory — prototype vs site (2026-09-24)

Input for the plan authors of run 3 (plans 12–18). Produced at cadrage by reading the whole prototype
`bencat_ Prototype cliquable.dc.html` (project `bb013596-0cd6-4e70-afad-e92b42d3f7f6`, 1811 lines, read
with the `claude-design` MCP `read_file`) and every list/detail page of the repo. Prototype line numbers
are cited so a plan author can re-read the exact markup.

Legend for data fields: **E** = exists in `src/content.config.ts` · **D** = derivable from existing
content, no schema change · **M** = missing (new optional schema field and/or new content).

Prototype map: header 29–55 · home 57–161 · blog list 163–227 · article 230–342 · projects list 344–431 ·
project detail 433–522 · prompts list 524–580 · prompt detail 582–736 · skills list 738–793 · skill detail
795–923 · about 925–1005 · footer 1007–1011 · data/logic 1016–1811 (`renderVals` ~1301).

---

## 0. Shared shell

- **Container**: prototype `max-width:1180px; margin:0 auto; padding:0 24px` on every page, root
  `padding-bottom:80px`. Site: `max-w-5xl` (1024) on lists/home, `max-w-3xl` (768) on detail pages.
- **List page header** (164–168, identical on the 4 lists): `padding:56px 24px 0; gap:14px`; breadcrumb mono
  13 accent `~/ blog`; h1 44px/700/`-.03em`; filter bar `padding-top:22px`; content 18px below (26 on blog).
  Site: `py-16`, h1 `text-4xl sm:text-5xl` + `mt-4`.
- **Header** (29–55): `padding:20px 0 0`, **no bottom border**, three separate pills,
  `justify-content:space-between; flex-wrap:wrap`.
  - Logo pill: `bg var(--nav)`, 1px `--line`, radius 999, `padding:8px 18px 8px 12px`; a 28×28 radius-9
    `accentSoft` tile holding a 3-bar accent mark (widths 100/60/82 %, opacity 1/.7/.45); `bencat` mono 15
    ink + accent `_`.
  - Nav pill: container `padding:6px; gap:4px`, nav bg, line border. Items `padding:8px 14px`, radius 999,
    14px, 15px icon. **Active: accent text on `accentSoft`, weight 600**; inactive muted, transparent, hover
    `--chip`/ink.
  - Actions pill: `padding:6px; gap:6px`; three 34×34 round buttons (search, GitHub, theme) on **`--chip`**,
    muted, hover nav/ink; theme icon sun (light) / moon (dark).
  - **Order rendered: Blog · Projets · Skills · Prompts · À propos** (markup 36–40).
  - Site today: `border-b border-line`, `py-4`; logo is `.pill` (no 28 px tile); active item neutral
    (`bg-nav border-line text-ink`); no wrapping nav pill; 32 px transparent action buttons; extra `⌘K` kbd;
    order Blog · Projets · Prompts · Skills.
- **Footer** (1007–1011): `max-width:1180; margin:60px auto 0; padding:24px; border-top:1px solid
  var(--line2)`, space-between; left `bencat_ — …`, right `Astro · GitHub Pages · Sveltia CMS`, both mono 11
  `--dim`. **The site has no footer at all.** (The left text `prototype cliquable` is demo copy.)
- **Dropdown** (sort, techno, outil, tag): trigger = transparent text button, mono 11 muted, icon +
  `label :` + value ink/500 + caret. Popover absolute `top:calc(100%+10px)`, right-aligned, min-width 216
  (236 for sort), `max-height:300; overflow:auto`, `padding:6px`, radius 14, surface, line border, shadow.
  Options `padding:9px 11px` radius 10; selected = `✓` + accent + 8 % accent bg + 600; right-aligned dim 10
  counts. Closes on outside click and Escape (`closeSort` ~1283). Site: native `<select>`.
- **Segmented control** (projects / prompts / skills lists): track `padding:5px`, `--chip`, line border,
  radius 999, gap 4. Items `padding:8px 16px`, 14px. Active `--card` + line border + ink + 500 with a count
  badge on `--chip`; inactive transparent muted, badge on `--card`, hover `--panel`. Badge min 20×20, radius
  999, mono 11 muted. Site: separate bordered mono pills, no counts.
- **Levels**: page `bg` → surface blocks (radius 20) → nested `card` (radius 12–14, shadow); rails `--rail`.
- **Responsive**: the prototype has **no breakpoints**; only header and filter rows wrap. Mobile is ours.

## 1. Blog list (163–227)

- One surface card, radius 20, `overflow:hidden`, grid **`250px | 1fr`**.
- **Left rail** (`--rail`, `border-right line2`, `padding:22px 16px`, gap 22):
  - **Catégories**: mono 10 uppercase `.12em` label; rows `padding:8px 10px` radius 10 14px, label left,
    mono 11 count right; active = accent on 10 % accent; first row "Tout".
  - **Tags**: wrapping chip cloud (`padding:4px 9px`, **radius 8** — ∉ contract V6 set, see brief), mono 10,
    one of the 5 tag tones, label carries its count (`devops 3`). Visual only in the prototype.
- **Main** (`padding:24px 28px 30px`): toolbar with bottom `line2` — meta left (`N articles · catégorie : X`,
  mono 12 muted), sort dropdown right: plus récents · plus anciens · lecture la plus courte · lecture la plus
  longue (no "par défaut").
- **Row**: grid `76px | 1fr`, gap 16, `padding:20px 0`, `border-bottom line2`. Thumb 76×64 radius 10
  (`--rail` + hatch — use the real `cover` when present). Meta (mono 11): category pill (`accentSoft`) ·
  `date · N min` · AI `emoji label`. Title 19/600. Description 14 muted.
- **No featured entry, no tag filter** in the prototype; no empty state drawn.
- Data: all **E/D** (`category`, counts by grouping, `pubDate`, `estimateReadingMinutes`, `aiUsage` via
  `AI_USAGE_META` — prototype label "co-créé" vs site "co-créé avec IA", `tags` + `collectTagIndex` +
  `tagTone`, `cover`).
- Site today: category pills, sort `<select>` with "par défaut", tag `<select>`, featured card + 3-col card
  grid with `Thumbnail` inside one `.card`, empty state, "tous les tags →". No rail, no counts, no tag cloud.

## 2. Article (230–342)

- Header above the card (`padding-top:56`): breadcrumb `~/ blog / article`; h1 40px lh 1.12 `max-width:860`;
  meta row mono 12: category pill · `date · N min` · AI marker (13 px icon in tone ink + label).
- One surface card radius 20, grid **`250px | 1fr | 230px`**:
  - **Left rail** (`--rail`): Catégories list, Tags cloud, `<hr>`, **Articles liés** (header + 22 px badge
    radius 7; 3 nested `card`s `padding:12` radius 12 with category mono 10 accent, title 13/500,
    `date · read` mono 10 dim), "Plus d'articles →".
  - **Center** (`padding:34px 40px 44px`): lead description 17 muted; hero image 210 px radius 16; prose h2
    23/700, body 16/1.75 `--body`; code blocks radius 12 `--code` + Copier chip; **AI marker card** at the
    bottom (`card`, radius 16, shadow, hover lift; 40×40 radius-13 tone tile with icon, label 15.5/600,
    explanation 13.5 muted, link "ma règle sur l'IA →" — on the site, link to `/transparence-ia/`);
    **prev/next** 2-col `card` tiles radius 14 ("← précédent" / "suivant →", title).
  - **Right rail** (`--rail`, `border-left`): **Sommaire** (12 px muted, h3 indented 14 px); **Projets liés**
    card (6 px accent dot, name, status accent mono 10, 12 px description).
- Data: title, description, cover, category **E**; TOC **D** (`headings` h2/h3); related articles **D**
  (same category, not self, top 3); prev/next **D** (neighbours by `pubDate`; circular wrap is a choice);
  related projects **E** `relatedProjects`.
- Site today: single column `max-w-3xl`; no meta row; `AiBanner` at the top; TOC inline card; related
  projects as a plain list; no rails, no related articles, no prev/next.

## 3. Projects list (344–431)

- Filters: **segmented status** (Tous / Actif / WIP / Archivé + counts) + **"techno :" dropdown** right
  (sorted stack, counts, "toutes"). No meta line.
- **Featured** (no filter active): surface radius 24 (∉ V6 — see brief), grid `1fr | 1.1fr`; left hatched
  `--rail` visual `min-height:300` with badge; right `padding:34px 36px`: status pill + `depuis … · à la une`,
  h3 30/600, description 15, stack chips (radius 8), buttons **démo ↗** (solid accent / `accentInk`) and
  **code source ↗** (outlined).
- **Grid** 3 columns gap 18: surface cards radius 20 `padding:8px 8px 22px`; 120 px thumb radius 14 with the
  status pill inside; h4 18; 13 px description; stack chips radius 7. Ends with a dashed **"prochain projet"**
  placeholder card (its copy is demo text).
- **Empty state**: dashed, centered, 38 px icon tile, `Aucun projet {statut} {en techno} pour l'instant.`,
  "voir tous les projets →" resets both.
- Data: all **E/D** (`status`, `stack`, `startDate`, `featured`, `demoUrl`, `repoUrl`, `cover`).
- Site today: facets inverted (stack = pills, status = `<select>`), count meta line, featured = full-width
  `ProjectCard` without buttons, everything inside an outer `.card`.

## 4. Project detail (433–522)

- Grid **`1fr | 280px`**, gap 26, `padding-top:40`.
- **Main surface card** radius 20: 150 px hatched banner (real `cover` when present); header
  `padding:28px 32px 0` — "← tous les projets" mono 11, h1 32, description 16 `max-width:600`; **underline
  tabs** (row `padding:0 32px` + `border-bottom line2`; tab `padding:12px 16px` 14 px + mono 11 dim count;
  active ink 600 + `border-bottom:2px solid accent`): **Aperçu · Stack (n) · Articles liés (n)**.
  - Aperçu: "why" paragraph 16/1.75, then a **dark code window** (fixed `#0B1017`, header `#111823`, traffic
    lights, filename chip, copier; line numbers gutter 46; `key:` `#93C5FD`, values `#7EE7B0`).
  - Stack: `// ce qui fait tourner le projet` + `auto-fill minmax(180px)` grid of `card` tiles radius 16 —
    88 px logo slot, name 15/600, role mono 10 dim.
  - Articles liés: `// écrit à propos de ce projet` + `card` tile (article, title 17/500, "Lire →").
- **Sidebar**: meta card (surface radius 18 shadow — statut pill, depuis, licence; full-width accent
  **code source ↗** radius 12); **Articles liés** card.
- Data: status, since, title, description, stack, related posts **E**; logos **D** (`src/lib/stackLogos.ts`);
  tab counts **D**; why **D** (first body paragraph) or **M**; code snippet + filename **D** (first fenced
  block of the body) or **M**; **licence M** (`license`); stack role **M** (role map).
- Site today: single column; pill tabs in a separate `.card`; Aperçu = cover + prose; Stack = text pills;
  no sidebar, banner, licence, code window, tab counts.

## 5. Prompts list (524–580)

- Filters: **segmented format** (Tous / Fiche / Guide + counts) + **"outil :" dropdown** with counts. No tag
  facet.
- Grid 3 columns gap 16; surface cards radius 20 `padding:22px 22px 18px`, hover `--cardHover`. Top row
  mono 10: format pill (accentSoft), tool pill (chip), spacer, **version** dim. h4 18/600. Description 13.5
  muted `flex:1`. Footer with `line2` top border mono 10.5 dim: **`N variables`** (accent) · `N l.` · `~N tk`
  · spacer · "ouvrir la fiche →". **No thumbnail, no tags, no featured entry.**
- Empty state: "Aucun prompt ne correspond à ce filtre." + "réinitialiser les filtres →".
- Data: format, tool **E**; counts, line count, token estimate (chars/4) **D**; version **M**; variables
  **M** (no current prompt has placeholders).
- Site today: facets inverted (tool = pills; format + tag = `<select>`), featured card, thumbnails, tag chips.

## 6. Prompt detail (582–736)

- Header (no card, `padding-top:40`, gap 12): `~/ prompts`; h1 34 `max-width:760`; description 16
  `max-width:640`; meta mono 11: format pill (accent), tool pill, model pill, `· vN — updated`,
  `· N lignes · ~N tokens`.
- Grid **`1fr | 340px`**, gap 22.
- **Left — prompt window, dark in both themes**: radius 18; header `#131A22` (`file.md · N l. · ~N tk`,
  ".md" button, **Copier** `#4ADE80` on `#06210F` → "Copié" 1.4 s); body `#0E1319` mono 13 lh 1.95; `##`
  lines `#93C5FD`/600; **variable segments highlighted inline and updated live from the inputs**. The prompt
  text keeps its line breaks.
- **Right column** (gap 12): **4-pill tab track** on chip — variables · décryptage · sortie · infos (active
  `card` + line + ink + 500, mono 11); panel card (surface radius 18 shadow `padding:20`):
  - variables: "N variables" + "réinitialiser"; per variable label mono 11 accent `<plan>`, input (`--code`
    bg radius 10, accent border on focus, rewrites the prompt live), hint 11.5 muted; divider; **À utiliser**
    / **À éviter** texts.
  - décryptage: "N décisions d'écriture", numbered items (`01` accent mono), title 13.5/600 + text.
  - sortie: "Exemple de sortie", `--code` block with toned lines (dim / ok / warn) + out-note.
  - infos: "Fiche technique" — format pill, outil, modèle, longueur, version · date; divider; "Vient du
    skill".
  - **Skills liés** card (nested cards: title, version accent, description) and **Prompts liés** card
    (format accent, title, tool) + "Tous les prompts →".
- Data: title, description, format, tool, model, prompt **E** (guide prompts have no `prompt`); filename
  (`${id}.md`), counts, "Vient du skill" (first `relatedSkills`), related prompts (shared skill/tags) **D**;
  version, updated, variables (+ placeholders), useWhen/avoidWhen, décryptage items, sample output **M**.
- Site today: single column; `// le prompt` `<pre>` only for `fiche`, stored on one line (overflows); tabs
  Pourquoi (body — renders the literal `No content` on `macos-clone`) + Infos; no sidebar, variables, sortie,
  counts, `.md` button.

## 7. Skills list (738–793)

- Filters: **segmented type** (Tous + each type + counts) + **"tag :" dropdown** with counts.
- Cards (same frame as prompts): type pill (accent), **licence** pill (chip), spacer, version dim; title;
  description; **install command** line (mono 11 accent, `word-break:break-all`); footer content summary
  (`N prompts · …`, accent) + "ouvrir la fiche →". No thumbnail, no featured, no tag chips.
- Empty state: "Aucune skill ne correspond à ce filtre." + "réinitialiser les filtres →".
- Data: type, tags, version, installCmd **E**; counts, prompt count **D**; licence **M**; commands /
  sub-skill counts **M** (or sourced from the plugin).
- Site today: facets inverted (tag = tone pills, type = `<select>`), featured card, thumbnails, tag chips.

## 8. Skill detail (795–923)

- Header: `~/ skills / {name}`; h1 36; description 16.5 `max-width:660`; meta: type pill, version chip,
  licence chip, `· content summary`, `· maj. {date}`.
- Grid **`1fr | 340px`**, gap 22.
- **Left** (gap 16): (1) **install window** (dark chrome as the prompt window; "installation · Claude Code"
  + Copier; numbered lines `1. /plugin marketplace add …`, `2. /plugin install …`, dim install note);
  (2) **Ce que fait ce skill** (surface radius 18 `padding:26px 28px`, bullets with 15 px accent check
  icons); (3) **file explorer** (dark, radius 18, grid `236px | 1fr`; tree `#12161B`, `▸` dirs `·` files,
  selected `rgba(255,255,255,.08)` + accent icon; preview with path/meta bar and toned lines; **click an
  entry → preview swaps**).
- **Right** (`position:sticky; top:20px`): **3-pill tab track** déclencheurs · versions · infos; panel:
  déclencheurs = "Quand il se déclenche" + intro + `« phrase »` quote boxes on `--code`; versions = "Notes
  de version" rows (version accent min-width 44, text, date); infos = "Fiche technique" (type, version,
  licence, contenu, maj.) + tag chips. **Prompts du skill** card (nested cards: format, title).
- Data: title, name, description, type, version, tags, installCmd, relatedPrompts **E**; install split
  **D** where the command has both parts; licence, updated, install note, highlights, triggers, changelog,
  file tree + previews, command/sub-skill counts **M**.
- Sources available locally for sourced filling (user decision, brief): `~/workspace/claudeworkspaces/
  anti-drift-planning` (LICENSE MIT © bendevcat, CHANGELOG.md, skills/, commands/, git tags) and
  `~/.claude/plugins/cache/claude-plugins-official/superpowers/<version>/` (6.3.0, 6.4.1).
- Site today: single column; tabs Aperçu (body — renders `No content` on `superpowers`) + Infos; no install
  window, bullets, explorer, triggers, versions, sticky sidebar, licence, date.

## 9. Theme specifics beyond tokens (`renderVals` ~1301)

- Light tokens match `global.css` exactly.
- Nav active colours (accent on `accentSoft`); tag tones light/dark; AI tones (100 % humain `#0A5F45` /
  `#86EFAC`, co-créé `#8A4B1E` / `#FDBA74`, IA relue `#1B4E8C` / `#93C5FD`); prompt variable highlight
  (`rgba(11,107,76,.12)` / `rgba(74,222,128,.16)`, ink `#0A5F45` / `#86EFAC`); output tones ok / warn.
- **Always dark in both themes**: prompt window, skill install window, skill file explorer, project code
  window, about terminal (`#0E1319`, `#131A22`, `#12161B`, `#0B1017`). The article code block uses `--code`.

## 10. Home and about (small gaps)

- Home: site `gap-5` (20 px) vs prototype 16 px; home panel headers put the icon badge on the right
  (`row-reverse`).
- About: identity link row (github / rss — no invented mail/LinkedIn); 3 px accent left border on
  "Pourquoi ce site". The "On parle ?" contact card was dropped on purpose (D42) — keep it dropped.
- Site-only pages (`/tags`, `/tags/<tag>`, `/transparence-ia`, `/404`, search) are not in the prototype;
  they only follow the new shell (container, header, footer).

## 11. Schema additions implied (all optional; sourced filling only)

- **projects**: `license`; optional stack-role map; optional `snippet` + `snippetFile` (or first fenced block).
- **prompts**: `version`, `updated`, `variables[{name, hint, default}]`, `useWhen`, `avoidWhen`,
  `why[{title, text}]`, `output[{text, tone}]`, `outNote`.
- **skills**: `license`, `updated`, `installNote`, `highlights[]`, `triggers[]`,
  `changelog[{version, date, text}]`, `files[]` (or bundled files), command / sub-skill counts.
- **blog**: nothing.
