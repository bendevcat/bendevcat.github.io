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
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## ✍️ Édition du contenu (Sveltia CMS)

Le blog s'édite depuis une interface web, sans toucher au code. Le CMS est servi
en statique sur `/admin/` — il n'y a **aucun backend** : le navigateur parle
directement à l'API GitHub.

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
2. Ouvrir <http://localhost:4321/admin/index.html> dans un navigateur Chromium.
   Le slash final (`/admin/`) ne fonctionne qu'en production ; en développement
   le serveur Astro ne résout pas l'index de répertoire pour les fichiers de
   `public/`, et renvoie une 404 — ce n'est pas une erreur de manipulation.
3. Cliquer **« Work with Local Repository »** et sélectionner le dossier racine
   du projet quand le navigateur le demande.
4. Éditer : les fichiers locaux sont modifiés directement.
5. Le CMS ne fait **aucune** opération Git en local — relire le diff, puis
   commiter et pousser à la main.

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

### Où atterrissent les fichiers

| Élément | Emplacement |
|---|---|
| Article | `src/content/blog/<slug>/index.md` |
| Images d'un article | dans le dossier de l'article, à côté de `index.md` |
| Schéma de référence | `src/content.config.ts` (collection `blog`) |
| Configuration du CMS | `public/admin/config.yml` |

Les champs du CMS sont alignés sur le schéma Zod ; `src/lib/cms-config.test.ts`
échoue si les deux divergent.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
