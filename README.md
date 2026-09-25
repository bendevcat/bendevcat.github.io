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
   `/admin/?test-repo` (voir plus bas) avant de pousser. Le réplica du
   frontmatter (`src/lib/cmsFrontmatter.ts`, voir « Forme canonique Sveltia »)
   décrit l'écriture de la 0.221 : ouvrir puis sauvegarder sans modification
   quelques entrées sur le tableau de démonstration, et vérifier que le fichier
   ne change pas.

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

### Tableau de bord

Tout ce qui suit est réglé dans `public/admin/config.yml` ; les tests de
`src/lib/cms-navigation.test.ts` le gardent (config validée contre le schéma
JSON livré par `@sveltia/cms`, filtres liés aux enums Zod, résumés liés aux
champs existants, `preview_path` liés aux vraies routes).

**Titre et logo.** Le CMS s'appelle **benCat · Studio** : titre de la page
d'entrée, de l'onglet du navigateur (`app_title`, et `<title>` de
`src/pages/admin/index.astro`). Le logo `public/admin/logo.svg` redessine la
tuile 28×28 du logo de l'en-tête du site (`src/components/Header.astro`) : fond
`accentSoft`, trois barres `accent`, couleurs des thèmes clair et sombre de
`src/styles/global.css` (suivant `prefers-color-scheme`). Il s'affiche sur la
page d'entrée, dans l'en-tête du tableau (`logo.show_in_header`, bouton
« Visiter le site en ligne ») et sert de favicon. Si les couleurs d'accent
changent dans `global.css`, le test du logo casse : reporter les nouvelles
valeurs dans le SVG.

**Icônes des collections** (Material Symbols, police livrée avec Sveltia) :
Articles `article`, Projets `rocket_launch`, Prompts `terminal`, Skills
`extension`.

**Résumé de chaque ligne** de liste — 📝 signale un brouillon (`draft`), ⭐
une entrée mise en avant (`featured`) ; une partie dont le champ est vide
n'apparaît pas :

| Collection | Ligne | Vignette | Tri par défaut |
|---|---|---|---|
| Articles | titre · date (`AAAA-MM-JJ`) · catégorie, 📝, ⭐ | couverture | date de publication, plus récent d'abord |
| Projets | titre · statut, ⭐ | couverture | date de début, plus récent d'abord |
| Prompts | titre · format · outil, `v<version>`, 📝 | aucune | date de mise à jour, plus récente d'abord |
| Skills | titre · `v<version>` · licence, 📝 | aucune | titre, A → Z |

Le tri choisi à la main (menu « Trier » / « Sort ») est mémorisé par le
navigateur et l'emporte ensuite sur ce tri par défaut.

**Filtres prédéfinis** (menu « Filtrer » / « Filter » de la barre d'outils de
la liste, un seul à la fois) :

- Articles, Prompts, Skills : **Brouillons** (`draft` coché) et **Publiés**
  (`draft` décoché ou absent).
- Articles : **Mis en avant**, **Sans couverture**, **IA partielle**
  (`aiUsage: partial`), **IA totale** (`aiUsage: full`).
- Projets : un filtre par statut — **actif**, **wip**, **archivé** (les
  valeurs de `PROJECT_STATUSES`). Pas de Brouillons / Publiés : les projets
  n'ont pas de champ `draft`, et Sveltia refuse un filtre sur un champ que la
  collection ne déclare pas.
- Prompts : **Fiches** et **Guides** (les valeurs de `PROMPT_FORMATS`).

Ajouter une valeur à `PROJECT_STATUSES` ou à `PROMPT_FORMATS`
(`src/content.config.ts`) sans ajouter son filtre fait échouer
`cms-navigation.test.ts`.

**Groupes** (menu « Grouper » / « Group ») : Articles par **Année** (les 4
premiers chiffres de `pubDate`) ou par **Catégorie** ; Projets par **Statut** ;
Prompts par **Outil**. Pas de groupe pour les Skills.

**« Afficher sur le site en ligne »** (« View on Live Site » en anglais), dans
la barre d'outils d'une entrée, ouvre sa page du site dans un nouvel onglet :
`/blog/<dossier>`, `/projets/<dossier>`, `/prompts/<dossier>`,
`/skills/<dossier>` (`preview_path`). L'adresse part de l'origine courante (pas
de `site_url`) : `localhost` en développement, `bendevcat.github.io` en
production. **Le lien d'un brouillon mène à une 404** : le site ne construit
aucune page pour une entrée `draft: true`, le lien vise l'adresse qu'elle aura
une fois publiée — il marchera après la publication (et le déploiement). Après
`npm run build`, `node scripts/check-admin.mjs` (ligne `view on site:`)
vérifie que chaque entrée publiée a bien sa page à cette adresse et qu'aucun
brouillon n'en a.

### Créer une entrée : valeurs de départ

Réglé dans `public/admin/config.yml`, gardé par `src/lib/cms-config.test.ts` :

- **Nouvel article** (« New Article », ou un lien de création pré-rempli) :
  **Date de publication** pré-remplie avec l'heure d'ouverture du formulaire
  (`default: '{{now}}'`, au décalage horaire du navigateur), modifiable. C'est
  l'heure de **création** : en publiant un brouillon plus tard, ajuster cette
  date à la main si besoin (rien ne la change à la publication).
- **Nom du dossier** (le slug, tiré du titre) : toujours en **ASCII**,
  minuscules, accents retirés (option globale `slug` de
  `public/admin/config.yml`). « Essai création à la une » donne
  `essai-creation-a-la-une/index.md`, donc l'adresse
  `/blog/essai-creation-a-la-une/`. Les entrées existantes gardent leur dossier.
- **Nouvel article, prompt ou skill** : case **Brouillon** cochée
  (`draft: true` par défaut). Rien n'apparaît sur le site tant qu'elle n'est pas
  décochée. Les projets n'ont pas de champ `draft` : un nouveau projet est
  publié dès sa première sauvegarde.
- **Dupliquer** (menu de l'entrée › « Duplicate ») fonctionne sur nos entrées
  `<slug>/index.md` : donner un nouveau titre à la copie (son dossier en est
  tiré) ; elle est rangée dans `<nouveau-slug>/index.md` à côté de l'original, avec une copie
  des images de l'entrée (la couverture) ; l'original ne bouge pas. Sveltia
  copie **toutes** les valeurs, y compris `draft` et `pubDate` : dupliquer un
  article publié donne une copie **publiée** — cocher Brouillon et corriger la
  date avant d'enregistrer si besoin. (Choix assumé : forcer `draft: true` à la
  sauvegarde écraserait un auteur qui décoche volontairement la case.)

**Pourquoi chaque fichier écrit `draft` en toutes lettres.** À l'ouverture d'une
entrée existante, Sveltia remplit tout champ absent du fichier avec son défaut.
Avec un défaut à `true`, un article publié sans ligne `draft` deviendrait
brouillon à sa prochaine sauvegarde — et disparaîtrait du site. Chaque article,
prompt et skill déclare donc `draft: false` ou `draft: true` ; le test
« chaque article, prompt et skill déclare draft » de
`src/lib/cmsFrontmatter.test.ts` échoue sinon (et la CI bloque le déploiement).
Un fichier écrit à la main doit le déclarer aussi.

### Dates de mise à jour (automatiques)

À chaque sauvegarde d'une entrée **existante**, le hook `preSave`
(`src/admin/hooks.ts`, règles dans `src/admin/dateRules.ts`) peut poser une date,
au format des champs du CMS (`2026-09-25T14:03:00+02:00`, heure et décalage du
navigateur), **à la minute** (secondes `00`) comme le widget date de Sveltia :
avec des secondes, la sauvegarde suivante, même sans modification, les
remettrait à `00` et changerait le fichier. Le test de frontmatter canonique
(`src/lib/cmsFrontmatter.test.ts`) signale toute date dont les secondes ne
sont pas `00` :

- **Article** : `updatedDate` = maintenant **seulement** si l'article est
  **publié** (Brouillon décoché avant **et** après la sauvegarde) **et** que son
  **corps** a changé. Titre, description, tags, couverture… seuls : rien ne
  bouge. Un brouillon, ou une première publication (Brouillon décoché à cette
  sauvegarde), ne reçoit pas de `updatedDate`. Le corps est comparé après remise
  des séparateurs en `---` : l'aller-retour `***` de l'éditeur ne compte pas
  comme une modification. Une `updatedDate` saisie à la main dans une
  sauvegarde qui change aussi le corps est remplacée par l'heure de la
  sauvegarde.
- **Prompt** : `updated` = maintenant quand la **version** change (nouvelle
  valeur non vide, différente de la précédente). Version inchangée ou vidée :
  rien.
- **Jamais** sur une nouvelle entrée (création, lien pré-rempli, duplicata),
  ni sur les projets et les skills.

**D'où vient l'« avant ».** Sveltia ne donne au hook que les nouvelles valeurs
(`src/admin/previousEntry.ts`) : l'état précédent est le **dernier fichier
engagé** au chemin de l'entrée, lu comme Sveltia le lit, cherché dans cet
ordre :

1. la mémoire de l'onglet : ce que la sauvegarde précédente de cette entrée,
   dans la même session, vient d'écrire ;
2. sur le tableau de démonstration (`/admin/?test-repo`, dev seulement) : le
   fichier de l'arbre de travail qui a amorcé le tableau ;
3. partout ailleurs — en production, et en dev avec « Work with Local
   Repository » (la comparaison se fait alors avec `main` sur GitHub, pas avec
   le fichier local) : l'**API contents publique de GitHub**,
   `https://api.github.com/repos/bendevcat/bendevcat.github.io/contents/<chemin>?ref=main`,
   **sans jeton** (celui de l'auteur n'est jamais lu ni envoyé), sans cookie,
   sans cache (`cache: 'no-store'`). Le dépôt est public ; GitHub autorise 60
   requêtes par heure et par adresse IP sans authentification. La requête ne
   part que si une règle peut s'appliquer (article publié, prompt versionné).

**Dans le doute, rien ne bouge.** Si l'état précédent est **inconnu** (réseau
coupé, quota GitHub épuisé, réponse illisible), les dates restent telles
quelles et la console du navigateur affiche **un** avertissement
(`dates : état précédent de <chemin> introuvable, dates inchangées`). Un
fichier absent de GitHub (404) compte comme nouveau : pas de date non plus.
Si l'avertissement apparaît alors que le corps a bien changé, poser
`updatedDate` (ou `updated`) à la main et sauvegarder à nouveau.

### Messages de commit

En production, chaque sauvegarde est un commit sur `main` dont le message suit
le format conventionnel du dépôt (`backend.commit_messages`) :

| Action | Message |
|---|---|
| Créer | `content(Article): create "<slug>"` |
| Modifier | `content(Article): update "<slug>"` |
| Supprimer | `content(Article): delete "<slug>"` |
| Téléverser un média | `content(media): upload "<chemin>"` |
| Supprimer un média | `content(media): delete "<chemin>"` |

Entre parenthèses, Sveltia met le **libellé singulier** de la collection —
`Article`, `Projet`, `Prompt` ou `Skill` — et non son nom technique (`blog`…) :
Sveltia n'offre aucune variable pour ce nom. Quand d'autres fichiers partent
dans le même commit (une image jointe, par exemple), Sveltia ajoute ` +N` au
message. Le tableau de démonstration ignore ces messages : seul un vrai commit
GitHub les montre (voir « À vérifier une fois en production »).

### Raccourcis de création : `/admin/raccourcis`

La page <https://bendevcat.github.io/admin/raccourcis> (hors menu du site,
`noindex`, sans script) regroupe des raccourcis qui ouvrent directement un
formulaire « nouvelle entrée » **pré-rempli, en brouillon** — rien n'est
enregistré avant **Save**.

**Bookmarklets** (ordinateur) :

- **💡 Idée d'article** : nouvel article ; titre = texte sélectionné sur la page
  (sinon le titre de la page) ; description = `Source : <adresse de la page>` ;
  Brouillon coché ; date de publication = maintenant.
- **💬 Nouveau prompt** : nouveau prompt ; le texte sélectionné, sauts de ligne
  compris, devient le texte du prompt ; Brouillon coché.

Installer, une fois par navigateur : ouvrir la page, afficher la barre de
favoris (Ctrl/⌘ + Maj + B dans Chrome), puis **glisser** chaque bouton dans la
barre. Utiliser : sur n'importe quelle page, sélectionner du texte (facultatif),
cliquer le favori ; le CMS **de production** s'ouvre dans un nouvel onglet, sur
le formulaire pré-rempli. Il faut y être connecté (jeton, voir plus haut).
Titre, description et prompt sont tronqués au-delà de 150, 2 000 et 20 000
caractères (suivis de `…`). Les bookmarklets visent toujours
`https://bendevcat.github.io/admin/`, même depuis la page servie en dev.

**Liens simples** (mobile, où les bookmarklets sont malcommodes) : « Nouvel
article » et « Nouveau prompt » ouvrent un formulaire vide, en brouillon
(`/admin/#/collections/blog/new?draft=true`, idem `prompts`) sur l'origine qui
sert la page. À garder en favori ou sur l'écran d'accueil.

**Confidentialité.** Le texte sélectionné et l'adresse de la page voyagent dans
le **fragment** de l'URL (après le `#`) : le navigateur ne l'envoie à **aucun**
serveur, ni à GitHub Pages ni au site d'origine (l'onglet s'ouvre sans
`opener` ni `Referer`). Ils restent en revanche dans l'historique local du
navigateur, et n'entrent dans le dépôt — public — que si l'entrée est
enregistrée : relire titre et description (l'adresse source peut porter des
paramètres) avant **Save**.

Contrôle après `npm run build` : `node scripts/check-admin.mjs`, ligne
`raccourcis:` (page `noindex`, 0 script, 2 bookmarklets, 2 liens simples, rien
de la mise en page du site). Construction des bookmarklets :
`src/lib/bookmarklets.ts`, gardée par `src/lib/bookmarklets.test.ts`.

### Lien ✏️ Éditer sur les pages du site

Sur chaque page d'article, de projet, de prompt et de skill, un bouton
**✏️ Éditer** (en bas à droite) ouvre l'entrée dans le CMS
(`/admin/#/collections/<collection>/entries/<slug>/index`). Il n'apparaît que
dans un navigateur qui a déjà ouvert `/admin/` : chaque chargement de `/admin/`
pose le marqueur `localStorage['bencat:author'] = '1'` (même sans se
connecter), et un petit script des pages de détail (`src/scripts/edit-link.ts`)
révèle le lien s'il le trouve. Un visiteur ne le voit jamais ; sans JavaScript,
il reste caché.

**C'est une commodité, jamais une sécurité.** Le lien est dans le HTML public de
chaque page (seulement masqué) et n'importe qui peut poser le marqueur. Ce qui
protège le contenu, c'est la connexion GitHub du CMS : sans jeton valide, le
lien mène à l'écran de connexion. Le marqueur est propre à chaque origine
(`localhost` et `bendevcat.github.io` sont distincts). Pour le retirer d'un
navigateur (ordinateur partagé, captures d'écran…), dans la console des outils
de développement, sur une page du site :

```js
localStorage.removeItem('bencat:author')
```

puis recharger — le prochain passage par `/admin/` le reposera. Contrôle après
`npm run build` : `node scripts/check-edit-link.mjs --base <dist de base>`
(12 pages de détail, un lien caché chacune, bonne adresse, hors index
Pagefind).

### Aperçu

Le volet d'aperçu (à droite de l'éditeur ; « Show Preview » dans la barre
d'outils s'il est masqué) montre **la colonne centrale de la vraie page** de
l'entrée, avec le texte et le style du site :

| Collection | Ce que montre l'aperçu |
|---|---|
| Prompt | la fenêtre du prompt, toujours sombre (titres `##` à `######` colorés, `{variables}` surlignées, barre `<slug>.md · N l. · ~N tk` ; `nouveau.md` pour une entrée pas encore nommée), ses variables, puis son corps (décryptage) quand la fiche l'affiche |
| Article | le chapô, la couverture, la prose (blocs de code colorés comme sur le site, titres ancrés) et la carte « transparence IA » |
| Projet | l'en-tête statut/dates, la prose, la fenêtre de code numérotée de `snippet` et les tuiles de stack avec leurs rôles |
| Skill | la fenêtre d'installation, « Ce que fait ce skill », « Quand il se déclenche », le fichier sur lequel la page s'ouvre (`defaultFile`) et « En détail » |

Ne sont **pas** reproduits : rails latéraux, entrées liées, précédent/suivant,
en-tête et fil d'Ariane des articles, bannière des projets, rangées d'onglets,
boutons copier/télécharger, champs des variables ; ni le thème sombre (l'aperçu
est en thème clair — les fenêtres de prompt, de code, d'installation et de
fichier sont sombres dans les deux thèmes de toute façon).

**Comment.** Un gabarit par collection, dans `src/admin/previews/`
(`prompt.ts`, `article.ts`, `project.ts`, `skill.ts`) : chacun est une
**fonction pure** `(data, h) => arbre`, sans `window` ni `document`, qui
réutilise la logique de `src/lib/` des pages et pose sur chaque région les
mêmes attributs `data-*` et les mêmes classes que la page (seulement des
classes que le site compile déjà : le CSS du site ne bouge pas).
`src/admin/previews/register.ts` les enregistre dans Sveltia
(`registerPreviewTemplate`, appelé par `src/admin/cms.ts` avant `init()`),
en composants `createClass` construits avec le `h` que Sveltia pose sur
`window`. Le corps passe par **le pipeline Markdown du site** :
`@astrojs/markdown-remark` tourne dans le navigateur avec l'objet
`src/lib/markdownOptions.mjs` que lit aussi `astro.config.mjs` (thème Shiki
`syntaxTheme`, `rehype-slug`, `rehype-autolink-headings`) — chargé à la
demande, au premier corps à rendre. Les images (couverture, images du corps)
ne reçoivent une `src` qu'une fois que Sveltia fournit une URL `blob:`
(`src/admin/previews/images.ts`) : aucune requête relative, donc aucune 404.

**Copie admin de `src/lib`.** Importer `src/lib/` depuis `src/admin/` faisait
partager des chunks Rollup entre `/admin/` et les pages du site. Le plugin Vite
`src/admin/viteAdminLib.mjs` (au build seulement) redirige tout import de
`src/lib/` fait depuis `src/admin/` vers `<fichier>?admin` : l'admin a sa
propre copie, les pages du site restent identiques octet pour octet et
`node scripts/check-admin.mjs` garde son isolation `1/52`.

**Style.** `src/admin/cms.ts` injecte aussi le CSS du site
(`src/styles/global.css`, compilé par Tailwind) dans l'iframe d'aperçu, via
`registerPreviewStyle` et `src/admin/previewStyle.ts`, qui rend absolues les
URL des polices. Aucune feuille de style du site n'est chargée par la page
`/admin/` elle-même.

**Contrôle.** Après `npm run build` :

```sh
node scripts/check-previews.mjs
```

Pour chaque entrée sur disque, le script appelle le gabarit (chargé par Vite en
SSR) et compare le texte de chaque région de l'aperçu avec la même région de la
page construite dans `dist/`. Il affiche deux lignes — `previews: blog …/… ·
projects …/… · prompts …/… · skills …/… published entries — centre-column
text = page` et `drafts: … previewed without page` — et sort en code 1 s'il
trouve au moins un écart (chacun détaillé sur stderr). Si une page change de
structure, ce contrôle dit quel gabarit suivre.

L'iframe d'aperçu garde le `sandbox` de Sveltia (`allow-scripts` +
`allow-same-origin`) et l'avertissement qu'il produit dans la console : c'est
interne à Sveltia, non modifiable sans le patcher.

### Champs de code

Trois champs s'éditent avec le widget **`code`** de Sveltia (éditeur
monospace, coloration Shiki) au lieu d'un simple champ texte :
`prompts.prompt` (langue `markdown`), `projects.snippet` (`yaml`) et
`skills.files[].excerpt` (`markdown`). Dans `public/admin/config.yml`, chacun
porte `output_code_only: true` — la valeur reste une **chaîne** (sans lui,
Sveltia écrirait un objet `{code, lang}` que le schéma Zod refuse) — et
`allow_language_selection: false` (langue fixe, pas de sélecteur). Le test
« édite prompt, snippet et excerpt avec le widget code, sortie texte seule »
de `src/lib/cms-config.test.ts` garde ces réglages.

- **Ouvrir une entrée n'écrit rien de différent** : chaque fichier de
  `src/content/` est dans la forme exacte qu'écrit Sveltia (voir « Forme
  canonique Sveltia » plus bas). **Save** peut pourtant s'activer sans qu'on ait
  rien touché : Sveltia marque l'entrée modifiée quand un widget liste (`tags`,
  `stack`…) se monte, ou quand le corps contient un `---`. Une sauvegarde sans
  modification réécrit alors **le même fichier, octet pour octet** : elle ne
  change rien au contenu.
- **Une vraie modification réécrit tout le frontmatter** : à la sauvegarde,
  Sveltia re-sérialise l'ensemble du frontmatter (ordre, guillemets, style des
  blocs, champs par défaut comme `featured: false`), pas seulement le champ
  modifié. C'était déjà le cas avec le widget `text` ; le contenu des champs de
  code, lui, reste le même texte — sans saut de ligne final, que l'éditeur de
  code ne garde jamais (voir « Forme canonique Sveltia » plus bas).
- **Shiki depuis unpkg** : le surligneur de l'éditeur de code de Sveltia
  télécharge le moteur Shiki, ses grammaires et ses thèmes depuis
  `https://unpkg.com` quand un éditeur de code s'affiche dans `/admin/`
  (c'était déjà le cas pour les blocs de code de l'éditeur Markdown). Seul
  `/admin/` est concerné, jamais le site. Sveltia permet de l'auto-héberger
  plus tard (`setCodeHighlighterLoaders`).

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

### Forme canonique Sveltia : écrire ce que l'éditeur écrit

**Frontmatter.** À chaque sauvegarde, Sveltia 0.221 re-sérialise **tout** le
frontmatter à sa façon. Chaque `src/content/**/index.md` est donc écrit
directement dans cette forme (syntaxe seulement, valeurs inchangées) :

- YAML de Sveltia : indentation de 2, listes en blocs (`- a`, jamais
  `[a, b]`), guillemets simples seulement quand il en faut, pas de retour à la
  ligne automatique ;
- clés dans l'ordre des champs de `public/admin/config.yml` (sous-champs d'une
  liste dans leur ordre à eux), clés inconnues en dernier ;
- défauts explicites : un champ que Sveltia remplirait à l'ouverture est écrit
  (`featured: false`, `draft: false`…) ; un champ optionnel vide est omis ;
- `---`, le frontmatter, `---`, **une ligne vide**, le corps, un saut de ligne
  final.

Le test `src/lib/cmsFrontmatter.test.ts` (lancé par la CI) le garde : il
compare chaque fichier à ce que Sveltia écrirait pour lui (« chaque fichier =
ce que Sveltia 0.221 écrit pour lui ») et vérifie que chaque article, prompt et
skill déclare `draft` (voir « Créer une entrée » plus haut). Le script
`scripts/canonicalize-content.mjs` fait le même calcul — frontmatter, plus
`normalizeBody` sur le corps et `normalizeCodeField` sur les champs `code` :

```sh
node scripts/canonicalize-content.mjs --check   # canonical: 13/13 entries (code 1 + détail sinon)
node scripts/canonicalize-content.mjs --write   # réécrit les entrées hors forme
```

Après avoir écrit ou retouché une entrée **à la main**, lancer `--write`, relire
le diff, puis `npx vitest run`. `--root <dossier>` fait travailler le script sur
une copie du contenu. Le réplica suit `yaml` 2.9.1, la version que Sveltia
embarque (épinglée exactement dans `package.json`) : à revoir en montant de
version de Sveltia.

**Corps et champs de code.** À l'ouverture d'une entrée, les éditeurs de
Sveltia (Markdown et `code`)
relisent chaque valeur et la réécrivent dans **leur** forme Markdown. Si le
fichier n'est pas déjà dans cette forme, **Save** s'active sans qu'on ait rien
touché, et la sauvegarde suivante publie la forme réécrite — parfois fausse :
un gras coupé par un saut de ligne devant une ponctuation ressort en `\*\*`
littéraux. Le contenu s'écrit donc directement dans la forme de l'éditeur
(syntaxe seulement, le site rend la même chose) :

| Écrire | Pas | Pourquoi |
|---|---|---|
| `**gras sur une ligne**` (le saut de ligne passe **devant** la paire) | `**gras⏎sur deux**` | l'éditeur lit ligne par ligne |
| `_italique_` (`*x*` seulement dans un mot ou une cellule de tableau) | `*italique*` | l'éditeur écrit `_x_` |
| `\~18 %`, `5 \* 3` | `~18 %`, `5 * 3` | un `~` ou `*` isolé est échappé |
| `\| a \| b \|` puis `\| --- \| --- \|`, cellules sans alignement | `\|---\|---\|`, colonnes alignées, `:---:` | forme de `transformers/table.js` |
| ```` ```plaintext ```` pour un bloc sans langue | ```` ``` ```` seul | l'éditeur ajouterait `plain` |
| une seule ligne vide entre deux blocs, listes serrées, 4 espaces par niveau | lignes vides doublées, liste « lâche » | Lexical ne les garde pas |
| `prompt: \|-`, `snippet: \|-`, `excerpt: \|-` : pas de saut de ligne final | `\|` (saut final) | l'éditeur de code le retire ; le site l'ignore (`codeWindowText`, `promptWindowSource`) |

Le test `src/lib/cmsCanonical.test.ts` est le garde-fou, lancé par la CI comme
celui des séparateurs : il lit tout `src/content/**` (corps et trois champs de
code) et échoue sur chaque ligne hors forme, avec la règle en cause
(`span`, `star`, `table`, `final-newline`…). `normalizeBody` et
`normalizeCodeField` (`src/lib/cmsCanonical.ts`) remettent en forme ce qui
peut l'être sans changer le rendu. Une entrée sauvegardée depuis le CMS est
toujours dans cette forme : le garde-fou ne vise que les fichiers écrits à la
main. Aucun écart n'est toléré (`PENDING` vide dans le test) : tout
`src/content/**` est dans la forme de l'éditeur, y compris le corps d'un guide
de prompt, affiché tel quel dans sa fenêtre (sa syntaxe visible est celle que
Sveltia écrit). Les `---` sont hors de ce garde-fou : l'éditeur les ouvre en `***`
(Save s'active donc sur un article qui en contient) et le hook `preSave` les
rétablit à l'écriture.

### Images téléversées : WebP, et trois pièges

**Conversion automatique.** Toute image matricielle téléversée depuis le CMS
(PNG, JPEG, GIF, AVIF, HEIC, WebP) est convertie **dans le navigateur, avant
tout envoi** (`media_libraries.default.config` de `public/admin/config.yml`) :
format **WebP**, **1600 px de large au plus** (jamais agrandie), **qualité 80**.
Le fichier atterrit en `<nom>.webp` dans le dossier de l'entrée, à côté de
`index.md`, et Sveltia l'inscrit sans `./` : `cover: <nom>.webp`. Les deux
formes (`<nom>.webp` et `./<nom>.webp`, écrite à la main) désignent le même
fichier et passent au build. Si le fichier **converti** dépasse
**1 Mio** (`max_file_size: 1048576`), Sveltia le refuse avec un avis
et n'écrit rien : recadrer ou réduire l'image, puis
recommencer. Un SVG n'est pas touché ; un GIF animé devient une image fixe.
Le test « images : WebP, 1600 px, qualité 80, plafond de taille » de
`src/lib/cms-config.test.ts` garde ces réglages.

**Après « Fichier volumineux », le champ couverture est vide.** Le refus vide
le champ dans le formulaire, même s'il portait déjà une couverture ; une
sauvegarde à ce moment retire la ligne `cover:` de l'article. **Ne pas
sauvegarder** : choisir une image plus légère, ou annuler (« Cancel ») pour
revenir à l'état enregistré.

**Garde les couvertures légères — de l'ordre de 30 à 100 Ko.** Sveltia envoie le
commit par l'API GraphQL de GitHub, avec le fichier encodé en base64 **à
l'intérieur de la requête**. Une image lourde produit une requête que GitHub
rejette par un **502**, et le navigateur affiche alors un message trompeur parlant
de CORS — la cause est le 502, pas une histoire de CORS. Une affiche pleine
résolution échoue ; 40 Ko passe sans problème. La conversion WebP réduit déjà
beaucoup le poids, mais le plafond de 1 Mio n'est qu'un garde-fou : une image
proche de ce plafond peut encore se heurter au 502. Astro se charge ensuite de
l'optimisation des images pour le site.

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

### À vérifier une fois en production

Le tableau de démonstration exerce tout le reste, mais ces comportements
n'existent qu'avec le vrai backend GitHub. À vérifier une fois, sur
<https://bendevcat.github.io/admin/>, après le prochain déploiement :

1. **Message de commit** : modifier un article publié et sauvegarder ; dans
   l'historique de `main`, le commit s'intitule
   `content(Article): update "<slug>"`.
2. **Règle de date via GitHub** : dans cette même sauvegarde, avec un
   changement du **corps**, l'article reçoit `updatedDate` = l'heure de la
   sauvegarde ; titre seul changé → pas de `updatedDate`. Aucun avertissement
   `dates :` dans la console.
3. **Image WebP dans le dépôt** : téléverser une couverture (PNG ou JPEG) sur un
   brouillon et sauvegarder ; le dépôt contient `src/content/blog/<slug>/<nom>.webp`
   (1600 px de large au plus), le frontmatter porte `cover: <nom>.webp`, et
   le déploiement passe.
4. **Duplicate sur disque** : dupliquer un article, lui donner un nouveau titre,
   sauvegarder ; le dépôt contient `src/content/blog/<nouveau-slug>/index.md`
   et une copie de la couverture dans ce dossier, l'original est inchangé.
   Supprimer ensuite la copie depuis le CMS.

### Où atterrissent les fichiers

| Élément | Emplacement |
|---|---|
| Article | `src/content/blog/<slug>/index.md` |
| Projet | `src/content/projects/<slug>/index.md` |
| Prompt | `src/content/prompts/<slug>/index.md` |
| Skill | `src/content/skills/<slug>/index.md` |
| Images d'un article | dans le dossier de l'article, à côté de `index.md`, en `.webp` si téléversées depuis le CMS |
| Raccourcis de création | `src/pages/admin/raccourcis.astro` + `src/lib/bookmarklets.ts` |
| Lien ✏️ Éditer | `src/components/EditLink.astro` + `src/scripts/edit-link.ts` + `src/lib/editLink.ts` |
| Remise en forme du contenu | `scripts/canonicalize-content.mjs` |
| Schéma de référence | `src/content.config.ts` (collections `blog`, `projects`, `prompts`, `skills`) |
| Configuration du CMS | `public/admin/config.yml` |
| Logo du CMS | `public/admin/logo.svg` |
| Page admin | `src/pages/admin/index.astro` + `src/admin/` (initialisation, aperçu, hooks de sauvegarde et règles de date, tableau de démonstration) |

Les champs du CMS sont alignés sur le schéma Zod ; `src/lib/cms-config.test.ts`
échoue si les deux divergent.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
