# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build le site puis génère l'index de recherche Pagefind dans `dist/pagefind/` (un `astro build` seul produit un site sans recherche) |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## ✍️ Édition du contenu (Sveltia CMS)

Le blog s'édite depuis une interface web, sans toucher au code. Le CMS est servi
sur `/admin/`, en développement comme en production, par une page Astro
autonome (`src/pages/admin/index.astro`, `noindex`, hors mise en page du site et
hors index Pagefind) — il n'y a **aucun backend** : le navigateur parle
directement à l'API GitHub.

### Version de Sveltia

Sveltia vient de npm, pas d'un CDN : le paquet `@sveltia/cms` est épinglé à la
version **exacte** `0.221.0` dans `package.json` (ni `^` ni `~`) et embarqué
dans le build par `src/admin/cms.ts`. Même chose pour l'Immutable.js avec lequel
Sveltia construit les entrées passées aux hooks : c'est une dépendance npm de
Sveltia, embarquée elle aussi — rien n'est chargé depuis un CDN à l'ouverture de
`/admin/`.

Pour monter de version :

1. `npm install --save-exact @sveltia/cms@<version>`
2. Mettre à jour la version attendue dans `src/lib/cms-config.test.ts` (le test
   « épingle @sveltia/cms à … exactement » la code en dur, il échoue sinon).
3. `npx vitest run`, puis `npm run build && node scripts/check-admin.mjs`
   (la ligne `sveltia:` affiche la version embarquée), puis un tour sur
   `/admin/?test-repo` (voir plus bas) avant de pousser.

### En production (publier / corriger un article)

1. Ouvrir <https://bendevcat.github.io/admin/>.
2. Cliquer **« Sign In Using Access Token »**. Ne pas utiliser le bouton
   **« Sign In with GitHub »** (OAuth) affiché juste à côté : ce site n'a
   aucun backend d'authentification, c'est un choix d'architecture assumé, et
   ce bouton ne peut pas fonctionner ici.
3. Suivre le lien proposé pour créer un *personal access token* GitHub — de
   préférence un token **fine-grained** limité au seul dépôt
   `bendevcat/bendevcat.github.io`, avec la permission **Contents: Read and write**
   et une **expiration de 90 jours**. Ce token peut écrire sur le dépôt qui publie
   le site et vit dans un navigateur : l'expiration est ce qui borne les dégâts en
   cas de fuite. GitHub prévient par mail avant l'échéance.
4. Coller le token. Il est conservé dans le `localStorage` du navigateur : à
   refaire une seule fois par navigateur, puis à chaque expiration.
   **Symptôme d'expiration** : la sauvegarde échoue sans message clair, parfois en
   plein milieu d'un article. Avant de chercher un bug, régénérer le token.
5. Éditer, puis **Save** : Sveltia commite directement sur `main`. Le workflow
   GitHub Actions `Deploy to GitHub Pages` se déclenche et le site est à jour en
   quelques minutes.

### En local (éditer sans publier)

Sveltia utilise la *File System Access API* : **aucun serveur proxy** n'est
nécessaire (ni `decap-server`, ni `netlify-cms-proxy-server`), mais un navigateur
**Chromium** est requis (Chrome, Edge, Brave — pas Firefox ni Safari).

1. `npm run dev`
2. Ouvrir <http://localhost:4321/admin/> dans un navigateur Chromium — la même
   adresse qu'en production. Si le port 4321 est déjà pris, Astro en choisit un
   autre : prendre celui qu'affiche la console.
3. Cliquer **« Work with Local Repository »** et sélectionner le dossier racine
   du projet quand le navigateur le demande.
4. Éditer : les fichiers locaux sont modifiés directement.
5. Le CMS ne fait **aucune** opération Git en local — relire le diff, puis
   commiter et pousser à la main.

### Tableau de démonstration (dev seulement)

Pour essayer le CMS sans jeton ni sélection de dossier — et sans aucun risque
pour le dépôt — ouvrir <http://localhost:4321/admin/?test-repo> sous
`npm run dev`, puis cliquer **« Work with Test Repository »**. On obtient le
vrai tableau, avec les entrées de `src/content/` : à chaque chargement de la
page, `src/admin/dev/testRepo.ts` recopie `src/content/**` dans le stockage
privé du navigateur (OPFS, dossier `sveltia-cms-test`), qui est **remis à zéro
à chaque chargement**. Les modifications, sauvegardes et suppressions faites là
ne touchent **jamais** les fichiers du dépôt et disparaissent au rechargement.

Ce mode n'existe qu'en développement : le code qui l'active est retiré du build
de production, où `/admin/?test-repo` affiche le même écran de connexion GitHub
que `/admin/` (contrôle : `node scripts/check-admin.mjs`, ligne `dev-only`).

### Aperçu : le style du site

Le volet d'aperçu du CMS affiche les articles avec la typographie et les
couleurs du site : `src/admin/cms.ts` y injecte le CSS du site
(`src/styles/global.css`, compilé par Tailwind), via `registerPreviewStyle`
et `src/admin/previewStyle.ts`, qui rend absolues les URL des polices. Aucune
feuille de style du site n'est chargée par la page `/admin/` elle-même.

### Séparateurs : toujours `---`

Dans le corps d'un article, un séparateur horizontal s'écrit **uniquement**
`---`, sur sa propre ligne entre deux lignes vides. L'éditeur riche de Sveltia
réécrit pourtant tout séparateur en `***` à la sauvegarde : un hook `preSave`
(`src/admin/hooks.ts`) les remet en `---` avant l'écriture du fichier.

Le test `src/lib/thematicBreaks.test.ts` est le garde-fou : il échoue si un
séparateur autre que `---` (`***`, `___`, `- - -`, `* * *`…) apparaît dans
`src/content/**` — et comme la CI lance les tests avant de déployer, un tel
séparateur bloque la publication. Si ce test casse après une édition, remplacer
la ligne signalée par `---`.

### Images de couverture : deux pièges

**Garde les couvertures légères — de l'ordre de 30 à 100 Ko.** Sveltia envoie le
commit par l'API GraphQL de GitHub, avec le fichier encodé en base64 **à
l'intérieur de la requête**. Une image lourde produit une requête que GitHub
rejette par un **502**, et le navigateur affiche alors un message trompeur parlant
de CORS — la cause est le 502, pas une histoire de CORS. Une affiche pleine
résolution échoue ; 40 Ko passe sans problème. Redimensionne avant de téléverser :
Astro se charge ensuite de l'optimisation et de la conversion en `.webp`.

**Si une sauvegarde échoue, va voir l'onglet Actions avant de réessayer.**
L'article et son image partent dans **deux commits séparés**. Si le premier passe
et le second échoue, l'article se retrouve à référencer une image qui n'existe pas
dans le dépôt : le déploiement casse (`image-not-found`) et **rien dans le CMS ne
te le signale**. Le correctif est de re-sauvegarder l'article avec une image qui
passe, ce qui corrige les deux dans le même commit.

### Supprimer une entrée

Le bouton **« Supprimer »** est **actif** sur les quatre collections
(`delete: true` dans `public/admin/config.yml`). Depuis la version 0.221,
Sveltia retire le slug de l'entrée supprimée des champs relation des autres
entrées, **dans le même commit** que la suppression : supprimer le projet
`gha-svu` l'enlève aussi de `relatedProjects` sur les articles qui le citaient,
supprimer un prompt l'enlève de `relatedPrompts` sur les skills, et ainsi de
suite (`relatedPosts`, `relatedSkills`). Aucune référence morte ne reste pour
casser le build.

Ce nettoyage suppose que ces quatre relations restent **optionnelles** : si un
champ relation devenait `required` (ou recevait un `min`), Sveltia refuserait
la suppression dès qu'elle viderait ce champ. Le test « garde les quatre
relations optionnelles » de `src/lib/cms-config.test.ts` le surveille.

Ce que Sveltia ne nettoie **pas** : les liens écrits **dans le texte** d'un
article (un lien Markdown vers `/blog/<slug>/` au milieu d'un paragraphe, par
exemple). Ils ne cassent pas le build, mais pointent vers une page disparue :
après une suppression, un `grep` sur le slug dans `src/content/` les retrouve.

Le garde-fou `assertEntriesResolved` reste en place au build : si une référence
morte arrivait malgré tout dans un champ relation (édition à la main, ancienne
version de Sveltia), `npm run build` échouerait avant de déployer quoi que ce
soit. Pour une suppression faite à la main, hors CMS : supprimer le dossier de
l'entrée, retirer son slug des champs relation qui la citent, puis vérifier
avec `npm run build` avant de pousser.

La CI lance aussi `npm test` avant de déployer : un test rouge bloque la mise
en ligne. Les tests de contenu (`src/lib/projectContent.test.ts`,
`promptContent.test.ts`, `skillContent.test.ts`) ne vérifient plus que des
**règles génériques**, vraies pour toute entrée — rôle d'une techno lu mot pour
mot dans le texte du projet et présent dans sa `stack`, extrait de code
recopié en lignes contiguës de son fichier quand ce fichier est dans ce dépôt,
variable déclarée présente dans son prompt, corps jamais `No content`, journal
des versions du plus récent au plus ancien et contenant la version déclarée,
extraits de 16 lignes au plus et sans adresse e-mail, chemins de fichiers
relatifs et uniques. Aucune valeur figée d'une entrée nommée : supprimer ou
modifier n'importe quelle entrée depuis le CMS ne bloque jamais le déploiement,
tant que l'entrée modifiée respecte ces règles (monter la version d'un skill,
par exemple, demande d'ajouter la ligne correspondante au journal).

### Où atterrissent les fichiers

| Élément | Emplacement |
|---|---|
| Article | `src/content/blog/<slug>/index.md` |
| Projet | `src/content/projects/<slug>/index.md` |
| Prompt | `src/content/prompts/<slug>/index.md` |
| Skill | `src/content/skills/<slug>/index.md` |
| Images d'un article | dans le dossier de l'article, à côté de `index.md` |
| Schéma de référence | `src/content.config.ts` (collections `blog`, `projects`, `prompts`, `skills`) |
| Configuration du CMS | `public/admin/config.yml` |
| Page admin | `src/pages/admin/index.astro` + `src/admin/` (initialisation, aperçu, hook de sauvegarde, tableau de démonstration) |

Les champs du CMS sont alignés sur le schéma Zod ; `src/lib/cms-config.test.ts`
échoue si les deux divergent.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
