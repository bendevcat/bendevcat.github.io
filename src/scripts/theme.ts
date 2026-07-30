// Logique de bascule du toggle de thème (clic → flip + persistance localStorage).
// L'état initial (avant hydratation) est posé par le script anti-flash inline
// dans BaseLayout.astro — ce module ne fait que gérer le clic.
const btn = document.getElementById('theme-toggle');

btn?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});
