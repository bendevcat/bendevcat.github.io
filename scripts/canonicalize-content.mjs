#!/usr/bin/env node
/**
 * Contenu dans la forme que Sveltia CMS 0.221 écrit (plan 22, T1, critères
 * R19 et R21 ; décisions D145, D148) :
 *
 *   node scripts/canonicalize-content.mjs --check [--root <dossier>]
 *   node scripts/canonicalize-content.mjs --write [--root <dossier>]
 *
 * Pour chaque entrée `<folder>/<dossier>/index.md` des collections de
 * public/admin/config.yml, calcule le fichier qu'une ouverture suivie d'un
 * **Save** sans modification écrirait :
 * - frontmatter — `sveltiaSave` de src/lib/cmsFrontmatter.ts (lecture,
 *   défauts à l'ouverture, ordre des champs, champs optionnels vides retirés,
 *   YAML de Sveltia, ligne vide avant le corps) ; un champ `datetime` dont
 *   l'instant a des secondes non nulles est ramené à la minute, comme le fait
 *   l'éditeur de Sveltia (plan 22, F1 ; D151), au fuseau local de ce
 *   processus (`TZ=Europe/Paris node …` pour celui du navigateur) ;
 * - corps (`widget: markdown`) — `normalizeBody` de src/lib/cmsCanonical.ts ;
 * - champs `widget: code` — `normalizeCodeField` (saut de ligne final retiré).
 * Ces deux fonctions ne réécrivent que la syntaxe dont le rendu du site ne
 * change pas (D145) ; le reste des écarts relevés par cmsCanonical.test.ts
 * est à trancher à la main.
 *
 * `--check` n'écrit rien : imprime `canonical: <n>/<N> entries`, puis sur
 * stderr chaque entrée qui changerait (première ligne différente) ; code de
 * sortie 1 s'il y en a une. `--write` réécrit ces entrées et imprime
 * `rewritten: <k>/<N> entries`. `--root` (défaut : la racine du dépôt) sert à
 * travailler sur une copie : les dossiers `folder` de la config y sont
 * résolus ; la config lue reste celle du dépôt.
 *
 * Les modules TypeScript sont chargés par un serveur Vite en mode SSR, comme
 * dans check-previews.mjs.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const args = process.argv.slice(2);
const mode = args.includes('--write') ? 'write' : args.includes('--check') ? 'check' : undefined;
const rootIndex = args.indexOf('--root');
const target = rootIndex === -1 ? ROOT : resolve(args[rootIndex + 1] ?? '');

if (!mode || (rootIndex !== -1 && !args[rootIndex + 1])) {
  console.error('usage: node scripts/canonicalize-content.mjs --check|--write [--root <dossier>]');
  process.exit(2);
}

/** Première ligne qui diffère, pour le détail sur stderr. */
function firstDifference(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `ligne ${i + 1}: ${JSON.stringify(a[i] ?? '<fin>')} → ${JSON.stringify(b[i] ?? '<fin>')}`;
  }
  return '';
}

const server = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});

let total = 0;
const changed = [];

try {
  const { parseCmsConfig, sveltiaSave } = await server.ssrLoadModule('/src/lib/cmsFrontmatter.ts');
  const { normalizeBody, normalizeCodeField } = await server.ssrLoadModule('/src/lib/cmsCanonical.ts');
  const config = parseCmsConfig(readFileSync(join(ROOT, 'public/admin/config.yml'), 'utf8'));
  const transforms = { markdown: normalizeBody, code: normalizeCodeField };

  for (const collection of config.collections) {
    const dir = join(target, collection.folder);
    if (!existsSync(dir)) continue;
    const suffix = `${(collection.path ?? '{{slug}}').replace('{{slug}}', '')}.${collection.extension ?? 'md'}`;
    for (const entry of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const file = join(dir, `${entry.name}${suffix}`);
      if (!existsSync(file)) continue;
      total += 1;
      const raw = readFileSync(file, 'utf8');
      const canonical = sveltiaSave(raw, collection, config.output, transforms);
      if (canonical === raw) continue;
      changed.push({ name: `${collection.name}/${entry.name}`, detail: firstDifference(raw, canonical) });
      if (mode === 'write') writeFileSync(file, canonical);
    }
  }
} finally {
  await server.close();
}

if (mode === 'write') {
  console.log(`rewritten: ${changed.length}/${total} entries`);
  for (const { name } of changed) console.error(`  ${name}`);
} else {
  console.log(`canonical: ${total - changed.length}/${total} entries`);
  for (const { name, detail } of changed) console.error(`  ${name} — ${detail}`);
  if (changed.length) process.exit(1);
}
