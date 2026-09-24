/*
 * audit-rendered.js — rendered audit instrument (plan 11, T5; tooling for R7–R10).
 *
 * A CLASSIC browser script: no module syntax, no dependency, nothing runs at
 * load except the definition of two globals on `window`:
 *
 *   window.__audit(doc = document, opts = {})
 *     → { theme, overflow: { iw, sw, ok }, contrast: [...], offToken: [...],
 *         v2: [...], tokens: { source, count, names }, notes: [...] }
 *   window.__auditLib — the pure helpers (colour parsing, oklab → sRGB,
 *     compositing, WCAG ratio, token matching…), exported for the unit tests
 *     (src/lib/auditRendered.test.ts).
 *
 * HOW TO LOAD IT
 * - In the page itself (DevTools console, Playwright `page.evaluate`, a
 *   bookmarklet…): evaluate the file text, then call it.
 *       eval(scriptText);            // or page.addScriptTag({ path })
 *       window.__audit();            // audits `document`
 * - In a same-origin iframe (D49: one tab, each state loaded in an iframe of
 *   the preview so the viewport width is the iframe's width, e.g. 375 px):
 *   either evaluate in the iframe's window
 *       frame.contentWindow.eval(scriptText);
 *       frame.contentWindow.__audit();
 *   or keep the script in the parent and pass the iframe's document — every
 *   measure uses `doc.defaultView` (getComputedStyle, innerWidth), never the
 *   parent's window:
 *       window.__audit(frame.contentDocument);
 * - Theme: set `localStorage.theme` and reload (the site's own switch), or
 *   flip `<html data-theme>`; `theme` in the result is what was audited.
 *   Search dialog: open it (loupe button / ⌘K, type `devops`), then audit.
 * - `opts`: `{ tokens: { name: 'css colour', … } }` replaces the probed token
 *   values (tests, experiments); `{ pseudo: false }` skips `::before`/`::after`
 *   /`::marker`; `{ limit: n }` caps each report list (default: no cap).
 *
 * WHAT IT MEASURES (plan 11 "Measurement rules", decision D54)
 * - overflow — `doc.documentElement.scrollWidth <= innerWidth` of the doc's window.
 * - contrast — every visible element owning a non-whitespace text node that is
 *   not emoji-only, plus every visible empty field showing a `::placeholder`
 *   (the search input): its `color` (alpha kept) composited over the stack of
 *   ancestor `background-color`s down to the first opaque one (else the root's
 *   `bg` token, else white), WCAG 2.x ratio; large text = ≥ 24 px, or
 *   ≥ 18.66 px at weight ≥ 700 (3:1), else 4.5:1. Reports failures only:
 *   `{ sel, text, ratio, need, fg, bg, ariaHidden }`.
 * - offToken — every visible element's `color` (reported where it first
 *   differs from the parent, not on every inheriting child), `background-color`,
 *   border colours (width > 0, style ≠ none), outline colour (style ≠ none),
 *   SVG `fill`/`stroke` on shapes (≠ none), text-decoration colour (line ≠
 *   none), `::placeholder` colour, `::before`/`::after` (content set) and
 *   `::marker` colour/background, and each open modal dialog's `::backdrop`
 *   background. Normalised to sRGB (rgb(), rgba(), hex, color(srgb | srgb-linear
 *   | display-p3 | xyz …), oklab(), oklch() — Chrome returns oklab for
 *   Tailwind's `color-mix(in oklab, …)` `/NN` modifiers), a value passes when
 *   fully transparent or when its RGB is within ±2 per channel of one of the
 *   active theme's contract colours, at any alpha. Reports
 *   `{ sel, prop, value }`; an unparsable value is reported too.
 * - v2 — dark theme only (the four surface levels are distinct only there; in
 *   light the result is [] with a note): an element whose background is the
 *   `card` token and whose nearest painted ancestor (nearest non-transparent
 *   `background-color`) is `bg`, or `rail` on `surface`. An element carrying
 *   `data-rail` (an explicit rail of the prototype — the /blog rail, a
 *   derived row thumbnail; D74, plan 12) may paint `rail` on `surface`: the
 *   rail-on-surface rule skips it, the card-on-bg rule still holds. Reports
 *   `{ sel, level, on, under }` (`under` = the painted ancestor's path).
 *
 * TOKENS — the contract colour set is 37 `--color-` values (D55: the plan's
 * "38" counted `--shadow`). Their NAMES are enumerated from the stylesheets:
 * the `--color-*` properties declared in the theme-override rule
 * (`:root[data-theme=…]`), which re-declares every contract colour and
 * nothing else. The `:root, :host` block of Tailwind's `@layer theme` is NOT
 * used for names: it also carries Tailwind's own palette (`--color-black`,
 * `--color-amber-500`… whenever a palette utility is used), which would make
 * a palette colour look "on token". If enumeration yields nothing (cross-
 * origin sheets, other markup), the 37 names of src/styles/global.css below
 * are used (`tokens.source` says which). VALUES are always read by probing:
 * an element with `color: var(--color-<name>, <sentinel>)` is inserted in the audited
 * document, its computed colour read, and the probe removed — so the values
 * are those the page actually resolves in its current theme.
 *
 * WHAT IT IGNORES, AND WHY (D54 — a narrowed, explicit reading of R0)
 * - `background-image` (the `hatch` texture is decoration), `box-shadow`,
 *   images, emoji glyphs (emoji-only text nodes), `opacity` (not composited).
 * - Visually hidden content: `display: none`, `visibility: hidden`,
 *   `opacity: 0`, zero-size boxes, `sr-only` / clip-hidden (1 px clipped
 *   boxes, `clip`, `clip-path: inset(50%)`), closed `<details>`/`<dialog>`.
 * - Hover, focus and pressed states: rest state only (audit with the focus
 *   where it lies — `outline` is reported only when an outline is drawn).
 * - Native UI the page does not paint: open `<select>` popup, scrollbars,
 *   `::selection`, form-control internals.
 * - The DOM stacking vs. visual stacking gap: the background stack follows
 *   DOM ancestors (a positioned element is judged against its DOM parents);
 *   a modal dialog's `::backdrop` is inserted below the dialog in the stack.
 */
(function (root) {
  'use strict';

  /** The 37 contract colour names of src/styles/global.css (D55) — fallback only. */
  var CONTRACT_COLOR_NAMES = [
    'bg', 'surface', 'card', 'rail',
    'line', 'line2',
    'ink', 'body', 'muted', 'dim',
    'accent', 'accentInk', 'accentSoft',
    'chip', 'panel', 'panelLine', 'badgeBg', 'badgeInk', 'nav', 'cardHover', 'code', 'hatch',
    'tagGreenBg', 'tagGreenInk', 'tagGreenLine',
    'tagBlueBg', 'tagBlueInk', 'tagBlueLine',
    'tagVioletBg', 'tagVioletInk', 'tagVioletLine',
    'tagAmberBg', 'tagAmberInk', 'tagAmberLine',
    'tagRoseBg', 'tagRoseInk', 'tagRoseLine'
  ];

  var TOLERANCE = 2;
  var AA_NORMAL = 4.5;
  var AA_LARGE = 3;

  // ---------------------------------------------------------------- colours

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /** One numeric component; `pct` = value of 100 %; `none` = 0. */
  function num(token, pct) {
    if (token === undefined) return NaN;
    if (token === 'none') return 0;
    if (/%$/.test(token)) return (parseFloat(token) / 100) * pct;
    return parseFloat(token);
  }

  /** Hue in degrees from `<angle>` or number. */
  function hue(token) {
    if (token === 'none') return 0;
    var v = parseFloat(token);
    if (/grad$/.test(token)) return v * 0.9;
    if (/rad$/.test(token) && !/grad$/.test(token)) return (v * 180) / Math.PI;
    if (/turn$/.test(token)) return v * 360;
    return v;
  }

  /**
   * Splits `a b c / d` into { main: [a, b, c], alpha: d }; with `legacy`
   * (rgb/rgba/hsl/hsla), the comma form `a, b, c, d` is read too.
   */
  function splitArgs(body, legacy) {
    var parts = body.split('/');
    var main = parts[0].trim().split(/[\s,]+/).filter(Boolean);
    var alpha = parts.length > 1 ? parts[1].trim() : undefined;
    if (legacy && alpha === undefined && main.length === 4) alpha = main.pop();
    return { main: main, alpha: alpha };
  }

  function alphaOf(token) {
    if (token === undefined) return 1;
    return clamp(num(token, 1), 0, 1);
  }

  /** Linear-light channel (0–1) → sRGB 0–255. */
  function gammaEncode(c) {
    var s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return clamp(s, 0, 1) * 255;
  }

  /** sRGB 0–255 → linear-light channel 0–1. */
  function gammaDecode(v) {
    var s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }

  /** Linear sRGB (0–1) → { r, g, b } 0–255, gamut-clamped. */
  function fromLinear(lr, lg, lb, a) {
    return { r: gammaEncode(lr), g: gammaEncode(lg), b: gammaEncode(lb), a: a };
  }

  /** OKLab (L 0–1) → sRGB 0–255 (Björn Ottosson's reference matrices). */
  function oklabToSrgb(L, A, B, alpha) {
    var l_ = L + 0.3963377774 * A + 0.2158037573 * B;
    var m_ = L - 0.1055613458 * A - 0.0638541728 * B;
    var s_ = L - 0.0894841775 * A - 1.291485548 * B;
    var l = l_ * l_ * l_;
    var m = m_ * m_ * m_;
    var s = s_ * s_ * s_;
    return fromLinear(
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
      alpha === undefined ? 1 : alpha
    );
  }

  /** sRGB 0–255 → OKLab { L, a, b } (inverse of the above; used by tests). */
  function srgbToOklab(r, g, b) {
    var lr = gammaDecode(r);
    var lg = gammaDecode(g);
    var lb = gammaDecode(b);
    var l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    var m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    var s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return {
      L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    };
  }

  /** CIE XYZ (D65) → linear sRGB. */
  function xyzToSrgb(X, Y, Z, a) {
    return fromLinear(
      3.2409699419 * X - 1.5373831776 * Y - 0.4986107603 * Z,
      -0.9692436363 * X + 1.8759675015 * Y + 0.0415550574 * Z,
      0.0556300797 * X - 0.2039769589 * Y + 1.0569715142 * Z,
      a
    );
  }

  /** Display-P3 (gamma-encoded 0–1) → sRGB 0–255. */
  function p3ToSrgb(r, g, b, a) {
    var lr = gammaDecode(r * 255);
    var lg = gammaDecode(g * 255);
    var lb = gammaDecode(b * 255);
    var X = 0.4865709486 * lr + 0.2656676932 * lg + 0.1982172852 * lb;
    var Y = 0.2289745641 * lr + 0.6917385218 * lg + 0.0792869141 * lb;
    var Z = 0.0 * lr + 0.0451133819 * lg + 1.0439443689 * lb;
    return xyzToSrgb(X, Y, Z, a);
  }

  /**
   * Parses a computed CSS colour into { r, g, b (0–255, unrounded), a (0–1) },
   * or null when the value is not a colour this script understands.
   */
  function parseColor(value) {
    if (typeof value !== 'string') return null;
    var v = value.trim().toLowerCase();
    if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    var hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
    if (hex) {
      var h = hex[1];
      if (h.length <= 4) h = h.split('').map(function (c) { return c + c; }).join('');
      var byte = function (i) { return parseInt(h.slice(i, i + 2), 16); };
      return { r: byte(0), g: byte(2), b: byte(4), a: h.length === 8 ? byte(6) / 255 : 1 };
    }
    var fn = /^([a-z-]+)\(\s*([^()]*)\)$/.exec(v);
    if (!fn) return null;
    var name = fn[1];
    var args = splitArgs(fn[2], /^(rgba?|hsla?)$/.test(name));
    var m = args.main;
    var a = alphaOf(args.alpha);
    var out = null;
    if ((name === 'rgb' || name === 'rgba') && m.length === 3) {
      out = { r: num(m[0], 255), g: num(m[1], 255), b: num(m[2], 255), a: a };
    } else if ((name === 'hsl' || name === 'hsla') && m.length === 3) {
      var H = ((hue(m[0]) % 360) + 360) % 360;
      var S = num(m[1].replace(/%$/, '') + '%', 1);
      var Lh = num(m[2].replace(/%$/, '') + '%', 1);
      var f = function (n) {
        var k = (n + H / 30) % 12;
        return Lh - S * Math.min(Lh, 1 - Lh) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      };
      out = { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a: a };
    } else if (name === 'oklab' && m.length === 3) {
      out = oklabToSrgb(num(m[0], 1), num(m[1], 0.4), num(m[2], 0.4), a);
    } else if (name === 'oklch' && m.length === 3) {
      var C = num(m[1], 0.4);
      var rad = (hue(m[2]) * Math.PI) / 180;
      out = oklabToSrgb(num(m[0], 1), C * Math.cos(rad), C * Math.sin(rad), a);
    } else if (name === 'color' && m.length === 4) {
      var space = m[0];
      var c1 = num(m[1], 1);
      var c2 = num(m[2], 1);
      var c3 = num(m[3], 1);
      if (space === 'srgb') out = { r: c1 * 255, g: c2 * 255, b: c3 * 255, a: a };
      else if (space === 'srgb-linear') out = fromLinear(c1, c2, c3, a);
      else if (space === 'display-p3') out = p3ToSrgb(c1, c2, c3, a);
      else if (space === 'xyz' || space === 'xyz-d65') out = xyzToSrgb(c1, c2, c3, a);
    }
    if (!out) return null;
    if (![out.r, out.g, out.b, out.a].every(isFinite)) return null;
    out.r = clamp(out.r, 0, 255);
    out.g = clamp(out.g, 0, 255);
    out.b = clamp(out.b, 0, 255);
    return out;
  }

  /** `top` (maybe translucent) over `bottom` — CSS "source over". */
  function composite(top, bottom) {
    var a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    var mix = function (t, b) { return (t * top.a + b * bottom.a * (1 - top.a)) / a; };
    return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: a };
  }

  /** Layers from the lowest (opaque) to the highest. */
  function flatten(layers) {
    var acc = layers[0];
    for (var i = 1; i < layers.length; i++) acc = composite(layers[i], acc);
    return acc;
  }

  function relativeLuminance(c) {
    return 0.2126 * gammaDecode(c.r) + 0.7152 * gammaDecode(c.g) + 0.0722 * gammaDecode(c.b);
  }

  /** WCAG ratio of `text` (maybe translucent) on an opaque `background`. */
  function contrastRatio(text, background) {
    var fg = text.a < 1 ? composite(text, background) : text;
    var l1 = relativeLuminance(fg);
    var l2 = relativeLuminance(background);
    var hi = Math.max(l1, l2);
    var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  /** WCAG large text: ≥ 24 px, or ≥ 18.66 px at weight ≥ 700. */
  function isLargeText(fontSizePx, fontWeight) {
    return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  }

  function requiredRatio(fontSizePx, fontWeight) {
    return isLargeText(fontSizePx, fontWeight) ? AA_LARGE : AA_NORMAL;
  }

  /** Emoji-only text: pictographs, keycaps, flags, modifiers, joiners, spaces. */
  var EMOJI_PARTS =
    /[#*0-9]️?⃣|\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|[︎️‍⃣]/gu;
  function isEmojiOnly(text) {
    var t = String(text).replace(/\s+/g, '');
    if (t === '') return false;
    return t.replace(EMOJI_PARTS, '') === '';
  }

  function isBlank(text) {
    return String(text).trim() === '';
  }

  function toHex(c) {
    var h = function (v) {
      var s = Math.round(clamp(v, 0, 255)).toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    var base = '#' + h(c.r) + h(c.g) + h(c.b);
    return c.a < 1 ? base + h(c.a * 255) : base;
  }

  function sameRgb(c, t, tol) {
    var k = tol === undefined ? TOLERANCE : tol;
    return Math.abs(c.r - t.r) <= k && Math.abs(c.g - t.g) <= k && Math.abs(c.b - t.b) <= k;
  }

  /** Name of the first token whose RGB matches `c` (any alpha), or null. */
  function matchToken(c, tokens) {
    for (var name in tokens) {
      if (Object.prototype.hasOwnProperty.call(tokens, name) && tokens[name] && sameRgb(c, tokens[name])) {
        return name;
      }
    }
    return null;
  }

  /** Same colour as a token: RGB ±2 and alpha within 0.02. */
  function equalsToken(c, t) {
    return !!c && !!t && sameRgb(c, t) && Math.abs(c.a - t.a) <= 0.02;
  }

  /** Verdict for the token rule: 'transparent' | token name | null (off-token). */
  function tokenVerdict(value, tokens) {
    var c = parseColor(value);
    if (!c) return null;
    if (c.a === 0) return 'transparent';
    return matchToken(c, tokens);
  }

  // ------------------------------------------------------- stylesheet names

  function eachRule(rules, visit) {
    if (!rules) return;
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.selectorText !== undefined && r.style) visit(r);
      var inner = null;
      try { inner = r.cssRules; } catch (e) { inner = null; }
      if (inner && inner.length) eachRule(inner, visit);
    }
  }

  /**
   * `--color-*` names declared in theme-override rules (`:root[data-theme=…]`)
   * of `styleSheets` — the contract set, without Tailwind's palette.
   */
  function enumerateTokenNames(styleSheets) {
    var seen = {};
    var names = [];
    for (var i = 0; styleSheets && i < styleSheets.length; i++) {
      var rules = null;
      try { rules = styleSheets[i].cssRules; } catch (e) { rules = null; }
      eachRule(rules, function (rule) {
        if (!/\[data-theme/.test(rule.selectorText)) return;
        for (var j = 0; j < rule.style.length; j++) {
          var prop = rule.style[j];
          var m = /^--color-(.+)$/.exec(prop || '');
          if (m && !seen[m[1]]) {
            seen[m[1]] = true;
            names.push(m[1]);
          }
        }
      });
    }
    return names;
  }

  // -------------------------------------------------------------- selectors

  function simpleClasses(el) {
    var cls = typeof el.className === 'string' ? el.className : el.getAttribute ? el.getAttribute('class') || '' : '';
    return cls.split(/\s+/).filter(function (c) { return /^-?[a-zA-Z_][\w-]*$/.test(c); });
  }

  /** `tag#id.class.class` for one element (two simple classes at most). */
  function stepOf(el) {
    var s = String(el.localName || el.tagName || '?').toLowerCase();
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return s + '#' + el.id;
    var cls = simpleClasses(el).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    if (el.parentElement) {
      var same = 0;
      var index = 0;
      var kids = el.parentElement.children || [];
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].localName === el.localName) {
          same++;
          if (kids[i] === el) index = same;
        }
      }
      if (same > 1) s += ':nth-of-type(' + index + ')';
    }
    return s;
  }

  /** Short CSS path, 3 levels at most, stopping at an id. */
  function shortPath(el) {
    var steps = [];
    var cur = el;
    while (cur && steps.length < 3) {
      var step = stepOf(cur);
      steps.unshift(step);
      if (step.indexOf('#') !== -1) break;
      var tag = String(cur.localName || '').toLowerCase();
      if (tag === 'body' || tag === 'html') break;
      cur = cur.parentElement;
    }
    return steps.join(' > ');
  }

  // ------------------------------------------------------------ the audit

  var SKIP_TAGS = { head: 1, script: 1, style: 1, template: 1, noscript: 1, title: 1, meta: 1, link: 1, base: 1 };
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_SHAPES = { path: 1, circle: 1, rect: 1, ellipse: 1, line: 1, polyline: 1, polygon: 1, text: 1, tspan: 1, textPath: 1, use: 1 };

  /**
   * V2: the surface a level must not sit on directly — `card` on `bg`, `rail`
   * on `surface` — or null when the pair is allowed. An explicit rail
   * (`data-rail`, D74) may sit on `surface`.
   */
  function v2Jump(level, explicitRail) {
    if (level === 'card') return 'bg';
    if (level === 'rail') return explicitRail ? null : 'surface';
    return null;
  }

  function isExplicitRail(el) {
    return !!(el && typeof el.hasAttribute === 'function' && el.hasAttribute('data-rail'));
  }

  function audit(doc, opts) {
    doc = doc || root.document;
    opts = opts || {};
    var win = doc.defaultView;
    var html = doc.documentElement;
    var notes = [];
    var styleCache = new Map();
    var cs = function (el) {
      var s = styleCache.get(el);
      if (!s) {
        s = win.getComputedStyle(el);
        styleCache.set(el, s);
      }
      return s;
    };
    var theme = html.getAttribute('data-theme') || 'light';
    var limit = opts.limit || Infinity;

    // -- tokens: names enumerated (or fallback), values probed in `doc`
    var names = enumerateTokenNames(doc.styleSheets);
    var source = 'stylesheet';
    if (names.length === 0) {
      names = CONTRACT_COLOR_NAMES.slice();
      source = 'fallback';
      notes.push('token names: none enumerated from the stylesheets, using the 37 names of global.css');
    } else {
      var missing = CONTRACT_COLOR_NAMES.filter(function (n) { return names.indexOf(n) === -1; });
      var extra = names.filter(function (n) { return CONTRACT_COLOR_NAMES.indexOf(n) === -1; });
      if (missing.length || extra.length) {
        notes.push('token names differ from global.css: missing [' + missing.join(' ') + '] extra [' + extra.join(' ') + ']');
      }
    }
    var tokens = {};
    if (opts.tokens) {
      Object.keys(opts.tokens).forEach(function (n) { tokens[n] = parseColor(opts.tokens[n]); });
      source = 'opts';
    } else {
      var probe = doc.createElement('span');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
      (doc.body || html).appendChild(probe);
      names.forEach(function (n) {
        // the sentinel fallback shows through only when the token is undefined
        probe.style.color = 'var(--color-' + n + ', rgba(1, 2, 3, 0.5))';
        var value = win.getComputedStyle(probe).color;
        var c = parseColor(value);
        if (!c || (Math.round(c.r) === 1 && Math.round(c.g) === 2 && Math.round(c.b) === 3 && c.a === 0.5)) {
          notes.push('token ' + n + ': probe unresolved (' + value + ')');
        } else {
          tokens[n] = c;
        }
      });
      probe.remove();
    }
    var bgToken = tokens.bg && tokens.bg.a >= 1 ? tokens.bg : null;

    // -- visibility
    var clipCache = new Map();
    function clipHidden(el) {
      if (!el || el.nodeType !== 1) return false;
      if (clipCache.has(el)) return clipCache.get(el);
      var s = cs(el);
      var positioned = s.position === 'absolute' || s.position === 'fixed';
      var hidden = !!(el.classList && el.classList.contains('sr-only'));
      if (!hidden && /inset\(\s*50%/.test(s.clipPath || '')) hidden = true;
      if (!hidden && positioned && s.clip && s.clip !== 'auto') {
        // rect(top, right, bottom, left): an empty or 1 px window hides the box
        var nums = (s.clip.match(/-?[\d.]+/g) || []).map(Number);
        hidden = nums.length === 4 && (nums[2] - nums[0] <= 1 || nums[1] - nums[3] <= 1);
      }
      if (!hidden && positioned && /hidden|clip/.test(s.overflow || '')) {
        var r = el.getBoundingClientRect();
        hidden = r.width <= 1 && r.height <= 1;
      }
      if (!hidden) hidden = clipHidden(el.parentElement);
      clipCache.set(el, hidden);
      return hidden;
    }

    function visible(el) {
      var s = cs(el);
      if (s.display === 'none' || s.display === 'contents') return false;
      if (typeof el.checkVisibility === 'function') {
        var ok = el.checkVisibility({
          checkOpacity: true, opacityProperty: true,
          checkVisibilityCSS: true, visibilityProperty: true
        });
        if (!ok) return false;
      } else if (s.visibility !== 'visible' || s.opacity === '0') {
        return false;
      }
      if (el.getClientRects().length === 0) return false;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return !clipHidden(el);
    }

    // -- background stack
    function isModal(el) {
      try { return el.localName === 'dialog' && el.matches(':modal'); } catch (e) { return false; }
    }
    function backdropColor(dialog) {
      return parseColor(win.getComputedStyle(dialog, '::backdrop').backgroundColor);
    }
    function backgroundUnder(el) {
      var layers = [];
      for (var cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
        var c = parseColor(cs(cur).backgroundColor);
        if (c && c.a > 0) {
          layers.push(c);
          if (c.a >= 1) return flatten(layers.reverse());
        }
        if (isModal(cur)) {
          var bd = backdropColor(cur);
          if (bd && bd.a > 0) {
            layers.push(bd);
            if (bd.a >= 1) return flatten(layers.reverse());
          }
        }
      }
      layers.push(bgToken || { r: 255, g: 255, b: 255, a: 1 });
      return flatten(layers.reverse());
    }
    function nearestPainted(el) {
      for (var cur = el.parentElement; cur; cur = cur.parentElement) {
        var c = parseColor(cs(cur).backgroundColor);
        if (c && c.a > 0) return { el: cur, color: c };
      }
      return null;
    }

    // -- collect elements
    var all = [html].concat(Array.prototype.slice.call(html.querySelectorAll('*')));
    var els = all.filter(function (el) {
      if (SKIP_TAGS[el.localName]) return false;
      if (doc.head && doc.head.contains(el)) return false;
      return visible(el);
    });

    var contrast = [];
    var offToken = [];
    var v2 = [];
    function pushOff(el, prop, value, suffix) {
      if (offToken.length >= limit) return;
      if (tokenVerdict(value, tokens) === null) {
        offToken.push({ sel: shortPath(el) + (suffix || ''), prop: prop, value: value });
      }
    }
    function measure(el, style, text, suffix) {
      var fg = parseColor(style.color);
      if (!fg) {
        notes.push('contrast: unparsable colour ' + style.color + ' on ' + shortPath(el));
        return;
      }
      var bg = backgroundUnder(el);
      var ratio = contrastRatio(fg, bg);
      var need = requiredRatio(parseFloat(style.fontSize), parseFloat(style.fontWeight));
      if (ratio < need && contrast.length < limit) {
        var hidden = false;
        for (var p = el; p; p = p.parentElement) {
          if (p.getAttribute && p.getAttribute('aria-hidden') === 'true') { hidden = true; break; }
        }
        contrast.push({
          sel: shortPath(el) + (suffix || ''),
          text: text.replace(/\s+/g, ' ').trim().slice(0, 40),
          ratio: Math.round(ratio * 100) / 100,
          need: need,
          fg: style.color,
          bg: toHex(bg),
          ariaHidden: hidden
        });
      }
    }

    els.forEach(function (el) {
      var s = cs(el);
      var isSvg = el.namespaceURI === SVG_NS;

      // contrast: own text nodes
      if (!isSvg || el.localName === 'text' || el.localName === 'tspan') {
        var own = '';
        var counts = false;
        for (var n = el.firstChild; n; n = n.nextSibling) {
          if (n.nodeType === 3) {
            own += n.nodeValue;
            if (!isBlank(n.nodeValue) && !isEmojiOnly(n.nodeValue)) counts = true;
          }
        }
        if (counts) measure(el, s, own);
      }
      var tag = el.localName;
      if ((tag === 'input' || tag === 'textarea') && el.getAttribute('placeholder') && el.value === '') {
        var ph = win.getComputedStyle(el, '::placeholder');
        if (ph && ph.color) {
          measure(el, ph, el.getAttribute('placeholder'), '::placeholder');
          pushOff(el, 'color', ph.color, '::placeholder');
        } else {
          notes.push('placeholder colour unreadable on ' + shortPath(el));
        }
      }

      // token colour
      var parent = el.parentElement;
      if (!parent || cs(parent).color !== s.color) pushOff(el, 'color', s.color);
      pushOff(el, 'background-color', s.backgroundColor);
      ['top', 'right', 'bottom', 'left'].forEach(function (side) {
        var w = parseFloat(s.getPropertyValue('border-' + side + '-width'));
        var st = s.getPropertyValue('border-' + side + '-style');
        if (w > 0 && st !== 'none' && st !== 'hidden') {
          pushOff(el, 'border-' + side + '-color', s.getPropertyValue('border-' + side + '-color'));
        }
      });
      if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) pushOff(el, 'outline-color', s.outlineColor);
      if (isSvg && SVG_SHAPES[tag]) {
        if (tag !== 'line' && s.fill && s.fill !== 'none') pushOff(el, 'fill', s.fill);
        if (s.stroke && s.stroke !== 'none' && parseFloat(s.strokeWidth) !== 0) pushOff(el, 'stroke', s.stroke);
      }
      var line = s.textDecorationLine || s.getPropertyValue('text-decoration-line');
      if (line && line !== 'none') pushOff(el, 'text-decoration-color', s.textDecorationColor);

      if (opts.pseudo !== false && !isSvg) {
        ['::before', '::after'].forEach(function (pseudo) {
          var ps = win.getComputedStyle(el, pseudo);
          if (!ps || ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') return;
          pushOff(el, 'color', ps.color, pseudo);
          pushOff(el, 'background-color', ps.backgroundColor, pseudo);
        });
        if (s.display === 'list-item' && s.listStyleType !== 'none') {
          var mk = win.getComputedStyle(el, '::marker');
          if (mk && mk.color) pushOff(el, 'color', mk.color, '::marker');
        }
      }

      // V2 (dark)
      if (theme === 'dark') {
        var bg = parseColor(s.backgroundColor);
        if (bg && bg.a > 0) {
          var level = equalsToken(bg, tokens.card) ? 'card' : equalsToken(bg, tokens.rail) ? 'rail' : null;
          if (level) {
            var under = nearestPainted(el);
            var jump = v2Jump(level, isExplicitRail(el));
            if (jump && under && equalsToken(under.color, tokens[jump]) && v2.length < limit) {
              v2.push({ sel: shortPath(el), level: level, on: jump, under: shortPath(under.el) });
            }
          }
        }
      }
    });

    // open modal dialogs: ::backdrop
    Array.prototype.forEach.call(doc.querySelectorAll('dialog[open]'), function (d) {
      if (isModal(d)) pushOff(d, 'background-color', win.getComputedStyle(d, '::backdrop').backgroundColor, '::backdrop');
    });

    if (theme !== 'dark') notes.push('v2: measured in dark only (the four surface levels are distinct only there)');

    var iw = win.innerWidth;
    var sw = html.scrollWidth;
    return {
      theme: theme,
      overflow: { iw: iw, sw: sw, ok: sw <= iw },
      contrast: contrast,
      offToken: offToken,
      v2: v2,
      tokens: {
        source: source,
        count: Object.keys(tokens).length,
        names: names
      },
      notes: notes
    };
  }

  root.__auditLib = {
    CONTRACT_COLOR_NAMES: CONTRACT_COLOR_NAMES,
    TOLERANCE: TOLERANCE,
    AA_NORMAL: AA_NORMAL,
    AA_LARGE: AA_LARGE,
    parseColor: parseColor,
    oklabToSrgb: oklabToSrgb,
    srgbToOklab: srgbToOklab,
    composite: composite,
    flatten: flatten,
    relativeLuminance: relativeLuminance,
    contrastRatio: contrastRatio,
    isLargeText: isLargeText,
    requiredRatio: requiredRatio,
    isEmojiOnly: isEmojiOnly,
    toHex: toHex,
    matchToken: matchToken,
    equalsToken: equalsToken,
    tokenVerdict: tokenVerdict,
    enumerateTokenNames: enumerateTokenNames,
    shortPath: shortPath,
    v2Jump: v2Jump,
    isExplicitRail: isExplicitRail
  };
  root.__audit = function (doc, opts) {
    return audit(doc || root.document, opts || {});
  };
})(typeof window !== 'undefined' ? window : this);
