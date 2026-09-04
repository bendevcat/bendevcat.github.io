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

  let api: PagefindApi | null = null;
  let loadFailed = false;
  let token = 0; // anti-course : seule la dernière recherche a le droit d'écrire

  const message = (text: string) => {
    output.replaceChildren();
    const p = document.createElement('p');
    p.className = 'font-mono text-xs text-muted';
    p.textContent = text;
    output.append(p);
  };

  const loadApi = async (): Promise<PagefindApi | null> => {
    if (api || loadFailed) return api;
    try {
      // `import.meta.env.BASE_URL` vaut '/' (base du site, spec §6.3) et
      // rend l'URL non analysable statiquement par Vite — sans quoi le build
      // échouerait sur un fichier qui n'existe pas encore.
      const url = `${import.meta.env.BASE_URL}pagefind/pagefind.js`;
      const mod = (await import(/* @vite-ignore */ url)) as PagefindApi;
      mod.init();
      api = mod;
    } catch {
      loadFailed = true; // en dev (`astro dev`), dist/pagefind/ n'existe pas
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
      heading.className = 'font-mono text-xs uppercase tracking-wide text-acc';
      heading.textContent = `${group.label} (${group.results.length})`;
      const list = document.createElement('ul');
      list.className = 'mt-2 flex flex-col gap-1';
      for (const result of group.results) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = result.url;
        link.className = 'block rounded-lg px-2 py-2 hover:bg-acc-dim focus-visible:bg-acc-dim';
        const title = document.createElement('span');
        title.className = 'block text-sm text-text';
        title.textContent = result.title; // texte, jamais innerHTML
        const excerpt = document.createElement('span');
        excerpt.className = 'mt-0.5 block font-mono text-xs text-muted';
        excerpt.innerHTML = result.excerpt; // Pagefind y met des <mark>
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
    if (term.trim().length < 2) {
      message('Tapez au moins 2 caractères.');
      return;
    }
    const pagefind = await loadApi();
    if (!pagefind) {
      message('Index de recherche indisponible — lancez `npm run build`.');
      return;
    }
    message('Recherche…');
    const raw = await pagefind.search(term);
    const loaded = await Promise.all(raw.results.slice(0, 20).map((r) => r.data()));
    if (current !== token) return; // une frappe plus récente a pris la main
    const results: SearchResult[] = loaded.map((d) => ({
      url: d.url,
      title: d.meta?.title ?? d.url,
      excerpt: d.excerpt,
    }));
    render(groupResultsByCollection(results), term);
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

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); // ⌘K est pris par la barre d'adresse de certains navigateurs
      open();
    }
  });

  for (const trigger of triggers) trigger.hidden = false;
}
