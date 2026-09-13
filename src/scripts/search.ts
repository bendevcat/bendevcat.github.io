import {
  groupResultsByCollection,
  type SearchGroup,
  type SearchResult,
} from '../lib/search';

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-input');
const output = document.querySelector<HTMLElement>('#search-results');
const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-search-open]'));

if (dialog && input && output) {
  type PagefindResult = { data: () => Promise<{ url: string; excerpt: string; meta?: { title?: string } }> };
  type PagefindApi = { init: () => void; search: (t: string) => Promise<{ results: PagefindResult[] }> };

  // Vite réécrit TOUT `import()` dont il croit pouvoir deviner la cible — y
  // compris à travers `import.meta.env.BASE_URL`, qu'il remplace à la
  // compilation. Le spécificateur redevient alors une constante, Vite route
  // l'import par son helper `__vitePreload` et laisse le placeholder
  // `__VITE_PRELOAD__` non remplacé : le référencer lève une ReferenceError,
  // que le `catch` ci-dessous transformait en « index indisponible » — en
  // production comme en dev. `/* @vite-ignore */` n'y change rien.
  // `new Function` construit l'import HORS du graphe de modules : c'est le
  // seul moyen mesuré de charger un fichier que seul le build Pagefind
  // produit. Aucune CSP n'est servie par GitHub Pages, donc rien ne le bloque.
  const importPagefind = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<PagefindApi>;

  let api: PagefindApi | null = null;
  let token = 0; // anti-course : seule la dernière recherche a le droit d'écrire

  const message = (text: string) => {
    output.replaceChildren();
    const p = document.createElement('p');
    p.className = 'font-mono text-xs text-muted';
    p.textContent = text;
    output.append(p);
  };

  const loadApi = async (): Promise<PagefindApi | null> => {
    if (api) return api;
    try {
      const url = `${import.meta.env.BASE_URL}pagefind/pagefind.js`;
      const mod = await importPagefind(url);
      mod.init();
      api = mod;
    } catch (error) {
      // En dev (`astro dev`), dist/pagefind/ n'existe pas — c'est attendu.
      // En production, c'est un incident réseau : le visiteur ne doit pas
      // lire une consigne de build, elle ne le concerne pas.
      console.warn('Pagefind indisponible (lancer `npm run build` en dev) :', error);
    }
    return api;
  };

  const render = (groups: SearchGroup[], term: string) => {
    output.replaceChildren();
    if (groups.length === 0) {
      message(`Aucun résultat pour « ${term} ».`);
      return;
    }
    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'mb-4';
      const heading = document.createElement('h2');
      heading.className = 'font-mono text-xs uppercase tracking-wide text-accent';
      heading.textContent = `${group.label} (${group.results.length})`;
      const list = document.createElement('ul');
      list.className = 'mt-2 flex flex-col gap-1';
      for (const result of group.results) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = result.url;
        link.className = 'block rounded-lg px-2 py-2 hover:bg-accentSoft focus-visible:bg-accentSoft';
        const title = document.createElement('span');
        title.className = 'block text-sm text-ink';
        title.textContent = result.title; // texte, jamais innerHTML
        const excerpt = document.createElement('span');
        excerpt.className = 'mt-0.5 block font-mono text-xs text-muted';
        // Pagefind n'échappe rien : ni à l'indexation, ni dans `build_excerpt`.
        // Du contenu réel de ce site contient déjà des jetons comme `<!--`,
        // `<N>` ou `<command>` : injectés tels quels, le navigateur les lit
        // comme du balisage et avale le reste de l'extrait. On échappe donc
        // tout, puis on ré-autorise le seul balisage attendu, `<mark>`.
        excerpt.innerHTML = result.excerpt
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&lt;mark&gt;/g, '<mark>')
          .replace(/&lt;\/mark&gt;/g, '</mark>');
        link.append(title, excerpt);
        item.append(link);
        list.append(item);
      }
      section.append(heading, list);
      output.append(section);
    }
  };

  const run = async (term: string) => {
    const current = ++token;
    // Vrai dès qu'une frappe plus récente a pris la main : plus aucune
    // écriture dans le DOM n'est légitime après ça.
    const stale = () => current !== token;

    if (term.trim().length < 2) {
      message('Tapez au moins 2 caractères.');
      return;
    }
    const pagefind = await loadApi();
    if (stale()) return;
    if (!pagefind) {
      message('La recherche est momentanément indisponible.');
      return;
    }
    message('Recherche…');
    try {
      const raw = await pagefind.search(term);
      if (stale()) return;
      const loaded = await Promise.all(raw.results.slice(0, 20).map((r) => r.data()));
      if (stale()) return;
      const results: SearchResult[] = loaded.map((d) => ({
        url: d.url,
        title: d.meta?.title ?? d.url,
        excerpt: d.excerpt,
      }));
      render(groupResultsByCollection(results), term);
    } catch (error) {
      // Pagefind charge ses chunks d'index paresseusement, au moment même de
      // la recherche : une coupure réseau ici rejette la promesse. Sans ce
      // catch, le modal restait figé sur « Recherche… » indéfiniment.
      if (stale()) return;
      message('La recherche est momentanément indisponible.');
      console.warn('Échec de la recherche Pagefind :', error);
    }
  };

  let timer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const term = input.value;
    timer = setTimeout(() => void run(term), 150);
  });

  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
  };

  for (const trigger of triggers) trigger.addEventListener('click', open);

  // Le bouton de fermeture est explicite depuis qu'il n'y a plus de
  // <form method="dialog"> : ce formulaire faisait de la touche Entrée une
  // soumission, qui fermait le modal en jetant la recherche en cours.
  for (const closer of document.querySelectorAll<HTMLElement>('[data-search-close]')) {
    closer.addEventListener('click', () => dialog.close());
  }

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); // ⌘K est pris par la barre d'adresse de certains navigateurs
      open();
    }
  });

  for (const trigger of triggers) trigger.hidden = false;
}
