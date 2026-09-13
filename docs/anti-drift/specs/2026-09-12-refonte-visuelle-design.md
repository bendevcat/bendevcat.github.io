# Site perso benCat — Refonte visuelle v2 · Spec de design

- **Date** : 2026-09-12
- **Auteur** : Benoît Catillon (bendevcat) + Claude
- **Statut** : Direction **validée**. Trois points restent `pending-user` (§8).
- **Source de vérité** : artboard `bencat_ Prototype cliquable.dc.html` du projet Claude Design
  [« Site redesign avec inspirations »](https://claude.ai/design/p/bb013596-0cd6-4e70-afad-e92b42d3f7f6).
  **Un seul artboard fait foi.** Les 11 autres (`Homepage v3`, `Console v2`, `Navbar propositions`,
  `Light theme gris`…) sont des étapes de travail : ne pas s'y référer pour arbitrer.
- **Complète** : [`2026-07-19-site-perso-design.md`](./2026-07-19-site-perso-design.md), qui reste
  valable pour la vision, le positionnement, le modèle de contenu et la stack. Ce document ne
  remplace que la **couche visuelle** de sa §4 et suivantes.
- **Cadrage d'implémentation** : plans 6 à 10, voir
  [`2026-07-19-methodology.md`](./2026-07-19-methodology.md) §4bis.

---

## 1. Périmètre

**Ce qui change** : l'intégralité de la couche visuelle (tokens, polices, rayons, ombres, patrons de
composants, structure des pages) **et** les fonctionnalités que le prototype introduit et que le site
n'a pas (§6).

**Ce qui ne change pas** : la stack (Astro + Tailwind v4 + Sveltia + Pagefind), le modèle de contenu
(4 collections, schémas Zod, page bundles), les URLs, le positionnement, la transparence IA.

**Routes couvertes par le prototype (10)** : `home`, `blog`, `article`, `projets`, `projet`,
`prompts`, `prompt`, `skills`, `skill`, `about`.

**Routes du site non maquettées (5)** : `/transparence-ia`, `/tags`, `/tags/[tag]`, `/404`, et
l'écran de recherche (`SearchDialog` — l'icône loupe est dans la nav du proto, l'écran ne l'est pas).
Elles sont dans le périmètre : elles seront dérivées des patrons établis (§4), pas inventées.

---

## 2. Contrat visuel — tokens couleur

**23 tokens**, définis dans les deux thèmes. La bascule reste pilotée par `[data-theme]` sur `<html>`
(mécanisme existant, inchangé).

| Token | Sombre | Clair | Rôle |
|---|---|---|---|
| `bg` | `#0A0C0F` | `#F1F4F7` | fond de page |
| `surface` | `#12161B` | `#FFFFFF` | grande carte |
| `card` | `#181D24` | `#FFFFFF` | carte imbriquée dans une surface |
| `rail` | `#0E1216` | `#E8EDF2` | creux : vignette, arbre de fichiers |
| `line` | `rgba(255,255,255,.08)` | `rgba(16,24,34,.11)` | bordure structurante |
| `line2` | `rgba(255,255,255,.06)` | `rgba(16,24,34,.07)` | séparateur interne |
| `ink` | `#E9EEF3` | `#101720` | titres, texte fort |
| `body` | `#C6D2DE` | `#28323D` | texte courant |
| `muted` | `#9AA6B4` | `#54616F` | texte secondaire |
| `dim` | `#7B8794` | `#6A7684` | texte tertiaire (méta de méta) |
| `accent` | `#4ADE80` | `#0B6B4C` | accent contenu/action |
| `accentInk` | `#06210F` | `#F4FBF7` | texte sur aplat d'accent |
| `accentSoft` | `rgba(74,222,128,.12)` | `rgba(11,107,76,.10)` | fond de pilule d'accent |
| `chip` | `rgba(255,255,255,.06)` | `#E6EBF1` | fond de puce neutre |
| `panel` | `rgba(125,211,252,.07)` | `#E9EEF3` | fond de panneau de section |
| `panelLine` | `rgba(125,211,252,.18)` | `rgba(16,24,34,.10)` | bordure de panneau |
| `badgeBg` | `rgba(125,211,252,.16)` | `#DCE6E9` | fond d'icône de section |
| `badgeInk` | `#7DD3FC` | `#0B6B4C` | icône de section |
| `nav` | `rgba(255,255,255,.05)` | `#FFFFFF` | fond des pilules de navigation |
| `cardHover` | `rgba(255,255,255,.03)` | `#F9FBFC` | survol de carte |
| `code` | `#0A0C0F` | `#EFF3F7` | fond de bloc de code |
| `hatch` | `rgba(74,222,128,.16)` | `rgba(11,107,76,.20)` | trames décoratives |
| `shadow` | `0 12px 22px -16px rgba(0,0,0,.85)` | `0 10px 18px -12px rgba(16,24,34,.26), 0 2px 4px -2px rgba(16,24,34,.08)` | élévation de carte |

### 2.1 Règle de hiérarchie des surfaces

Quatre niveaux, ordonnés : `bg` → `surface` → `card` → `rail`.

> **Règle (réfutable) :** un élément de surface est posé soit sur le niveau immédiatement
> supérieur, soit sur le même niveau. **Jamais de saut de niveau.**

Un `card` posé directement sur `bg`, ou un `rail` posé sur `surface` sans `card` intermédiaire, est
un **défaut**, pas un choix. C'est ce critère qui rend le contrat auditable en Phase Z.

### 2.2 Grammaire des accents — **différente selon le thème**

**En sombre**, deux accents avec des rôles disjoints :
- **Vert `#4ADE80`** = contenu et action (liens, « Lire → », statuts, catégories, pilules)
- **Bleu `#7DD3FC`** = méta et navigation (icônes de section, badges, fond/bordure des panneaux)

Aucun élément ne porte les deux.

**En clair, le bleu n'existe pas.** `badgeInk` vaut l'accent vert `#0B6B4C` et `panel` devient un gris
neutre `#E9EEF3`. La séparation vert/bleu est donc **un dispositif du thème sombre uniquement** ; en
clair, la hiérarchie est portée par la valeur (gris neutres) et non par la teinte.

> Corollaire à ne pas oublier : réinjecter du bleu dans le thème clair « pour la cohérence » serait
> une déviation du prototype, pas une correction.

### 2.3 Tons de tags — 5 teintes

Système **distinct** des deux accents, réservé aux tags. Chaque ton est un triplet
`fond / texte / bordure`.

| Ton | Clair | Sombre |
|---|---|---|
| green | `#DCEFE6` / `#0A5F45` / `rgba(11,107,76,.16)` | `rgba(74,222,128,.13)` / `#86EFAC` / `rgba(74,222,128,.22)` |
| blue | `#DCE8F8` / `#1B4E8C` / `rgba(27,78,140,.14)` | `rgba(96,165,250,.14)` / `#93C5FD` / `rgba(96,165,250,.22)` |
| violet | `#E6E1F7` / `#4B3B9C` / `rgba(75,59,156,.14)` | `rgba(167,139,250,.14)` / `#C4B5FD` / `rgba(167,139,250,.22)` |
| amber | `#F7E7D6` / `#8A4B1E` / `rgba(138,75,30,.14)` | `rgba(251,146,60,.14)` / `#FDBA74` / `rgba(251,146,60,.22)` |
| rose | `#F7DEE4` / `#93334C` / `rgba(147,51,76,.14)` | `rgba(244,114,182,.14)` / `#F9A8D4` / `rgba(244,114,182,.22)` |

**Attribution du ton à un tag** : non spécifiée par le prototype (il code en dur 5 tags de démo).
Décision à prendre en P8 avec `/tags` — voir §8.3.

---

## 3. Contrat visuel — typographie, rayons, ombres

### 3.1 Polices

| Usage | Police |
|---|---|
| Tout le texte | **Nebula Sans** (300/400/500/600/700) — sous réserve §8.1 |
| Méta machine | **JetBrains Mono** (400/500/700) |

**Space Grotesk et Inter sortent** du projet (dépendances `@fontsource-variable/*` à retirer).

> **Règle :** le mono n'est pas décoratif. Il signale **une donnée machine** : date, catégorie,
> chemin de fichier, nom de techno, version, compteur, identité. Du texte de prose en mono est un
> défaut.

### 3.2 Rayons — quatre valeurs, pas cinq

| Valeur | Usage |
|---|---|
| `20px` | grande carte (`surface`), panneau de section |
| `14px` | carte imbriquée (`card`), image d'en-tête |
| `10px` | vignette, petite image |
| `9px` | badge d'icône de section (28×28) |
| `999px` | pilule : navigation, statut, catégorie, bouton rond |

### 3.3 Échelle typographique observée

| Rôle | Taille | Graisse | Interlignage | Interlettrage |
|---|---|---|---|---|
| Titre d'article à la une | `29px` | 700 | 1.18 | `-.02em` |
| Titre de section | `17px` | 600 | — | `-.01em` |
| Titre de carte compacte | `17px` | 500 | 1.3 | — |
| Corps | `15px` | 400 | 1.6 | — |
| Corps dense (carte) | `13px` | 400 | 1.5 | — |
| Méta mono | `10–11px` | 400 | — | `.06em` sur les capitales |

---

## 4. Stratégie d'implémentation — hybride

Prolonge le choix déjà fait avec `.prose` : Tailwind pour ce qui varie, classe maison pour ce qui
doit être identique partout.

**Dans `@theme`** (donc disponibles en utilitaires) : les 23 couleurs, les 2 polices, les rayons,
l'ombre.

**En classes composants** dans `global.css`, quatre patrons et quatre seulement :

| Classe | Porte | Ne porte pas |
|---|---|---|
| `.card` | fond `surface`, bordure `line`, rayon 20px | disposition interne |
| `.card-inner` | fond `card`, bordure `line`, rayon 14px, ombre | disposition interne |
| `.panel` | fond `panel`, bordure `panelLine`, rayon 20px | disposition interne |
| `.pill` | rayon 999px, padding, fond `accentSoft`, texte `accent`, mono | largeur, position |

> **Règle :** une classe composant porte **fond, bordure, rayon, ombre, et rien d'autre**. Dès
> qu'elle porte du `display`/`gap`/`grid`, elle décide du contenu et cesse d'être réutilisable.

Layout, espacement, grilles, responsive : Tailwind, dans les templates.

---

## 5. Patrons de page récurrents

Le prototype répète trois structures. Les nommer une fois évite de les reconcevoir trois fois.

### 5.1 Patron « liste filtrable »
Utilisé sur `/blog`, `/projets`, `/prompts`, `/skills`.
Composants : ligne de pilules de filtre (facette primaire) + dropdown (facette secondaire) +
ligne de méta (`N éléments · facette`) + entrée « à la une » (affichée **seulement** quand aucun
filtre n'est actif) + grille des entrées restantes + **état vide** avec message contextualisé et
bouton de réinitialisation.

### 5.2 Patron « détail à onglets »
Utilisé sur `/projets/[slug]` (Aperçu · Stack · Articles liés), `/prompts/[slug]` (Variables ·
Pourquoi · Sortie · Infos), `/skills/[slug]` (Déclencheurs · Versions · Infos).
Onglet actif : fond `card` + bordure `line` ; inactif : transparent, texte `muted`.

### 5.3 Patron « panneau de section »
Utilisé sur l'accueil (Projets, Prompts, Skills).
Fond `panel`, bordure `panelLine`, badge d'icône 28×28 en `badgeBg`/`badgeInk`, titre cliquable
vers la page de la section, puis N `card-inner`.

---

## 6. Écarts fonctionnels — prototype vs site actuel

Inventaire de ce que le prototype ajoute et que le code n'a pas. Chaque ligne est rattachée à son plan.

| # | Écart | Plan |
|---|---|---|
| E1 | Navigation en pilules, avec icônes et état actif par famille de routes | P6 |
| E2 | Barre d'actions ronde : recherche, GitHub, bascule de thème | P6 |
| E3 | Accueil : carte « à la une » + liste compacte à vignettes + 3 panneaux + bandeau transparence IA | P7 |
| E4 | `/blog` : tri (récent, ancien, court, long) en dropdown | P7 |
| E5 | Vignette d'image sur chaque entrée de liste | P7 (voir §8.2) |
| E6 | `/projets` : filtres tech + statut, entrée à la une conditionnelle, état vide | P7 |
| E7 | `/projets/[slug]` : onglets Aperçu/Stack/Articles, bloc de code numéroté, rôles de stack | P7 |
| E8 | `/prompts/[slug]` : variables interactives, bouton Copier avec retour visuel | P7 |
| E9 | `/skills/[slug]` : arbre de fichiers cliquable, aperçu de fichier coloré | P7 |
| E10 | `/tags` : tons de couleur par tag | P8 |
| E11 | `/a-propos` : bloc identité `clé: valeur` en mono, liens, grille de stack à logos | P8 |

---

## 7. Découpage en plans

| Plan | Sujet | But binaire |
|---|---|---|
| **P6** | `socle-design-system` | Tout le site a la nouvelle peau — tokens, polices, nav en pilules, clair et sombre — et **aucune page n'a changé de structure** |
| **P7** | `structures-v2` | L'accueil et les **quatre familles** (blog, projets, prompts, skills) ont la structure de la maquette : à la une, panneaux, filtres, tri, onglets |
| **P8** | `pages-restantes-et-finition` | `/transparence-ia`, `/tags`, `/404`, recherche au nouveau design ; 375px ; contrastes AA |

**Ordre strictement séquentiel.** P6 précède tout : implémenter une structure avant que les tokens
existent produit des valeurs codées en dur qu'il faut ensuite déterrer.

**Ordre interne de P7** — il porte sept écarts (E3 à E9) et c'est le plan lourd de la vague. Ses
phases suivent le patron, pas les pages : **le patron « liste filtrable » (§5.1) est résolu une fois
sur `/projets`**, puis répliqué sur blog, prompts et skills ; **le patron « détail à onglets » (§5.2)
est résolu une fois sur `/projets/[slug]`**, puis répliqué sur prompts et skills. Résoudre quatre
listes en parallèle les ferait diverger.

> **Risque assumé de la fusion.** P7 remplace trois plans : son ledger est long et sa Phase Z lourde
> à tenir en une session. Le budget de décisions (3 `pending-user` maximum) saute plus vite. Si la
> session s'arrête en cours, c'est un cas nominal : `/anti-drift-planning:resume 7` reprend au
> premier `R` non `Done`. Ce n'est pas un échec du plan, c'est le mode d'emploi.

---

## 8. Points ouverts — `pending-user`

### 8.1 Licence de Nebula Sans
Nebula Sans est la police de marque d'Anthropic. Le prototype la sert depuis jsDelivr
(`@fontsource/nebula-sans`). L'embarquer sur un site personnel est une question de **licence**, pas
de technique. **À trancher avant la Phase A du plan 6.** Si non : choisir une substitution
géométrique proche et la documenter ici.

### 8.2 Vignettes d'articles
Le design attend une image par entrée de liste. État actuel : 3 articles sur 6 ont un `cover`.
Options : produire les images manquantes (travail de contenu), ou définir un placeholder par
catégorie. **À trancher avant la Phase de `/blog` du plan 7.**

### 8.3 Attribution des tons de tags
Le prototype code en dur 5 tags de démo avec 5 tons. Il faut une règle pour N tags réels : hash
stable du nom sur 5 tons, ou table d'association explicite en contenu. **À trancher en P8.**

### 8.4 Incohérence mineure du prototype
`--muted` vaut `#9AA6B4` dans le style de base sombre, mais une constante JS locale utilise
`#8A96A4` pour le même rôle. **Retenu : `#9AA6B4`** (la valeur du token). À signaler si le rendu
diverge visiblement.

---

## 9. Non-goals

- **Pas de framework d'îlots.** Le prototype est en JS de maquette ; filtres, onglets, dropdowns et
  copie s'implémentent en TypeScript vanilla, comme `facet-filters.ts` et `copy-code.ts` aujourd'hui.
- **Pas de changement d'URL.** Aucune redirection à prévoir.
- **Pas de changement du modèle de contenu.** Les schémas Zod des 4 collections sont inchangés. Si
  un écart du §6 en exigeait un, c'est une déviation à consigner.
- **Pas de refonte du CMS.** `public/admin/config.yml` n'est pas touché.
- **Pas de reprise des données de démo du prototype.** Les `POSTS`/`PROJECTS`/`PROMPTS`/`SKILLS`
  codés en dur dans l'artboard sont des fixtures de maquette, pas du contenu.

---

## 10. Critères de vérification du contrat visuel

Applicables en Phase Z de chaque plan, sur les trois largeurs **375 / 768 / 1180**.

| ID | Critère | Mesure (binaire) |
|---|---|---|
| V1 | Les 23 tokens existent dans les 2 thèmes | `global.css` définit les 23 en clair **et** en sombre |
| V2 | Aucun saut de niveau de surface | Aucune occurrence de `card` sur `bg` ni de `rail` sur `surface` |
| V3 | Grammaire des accents respectée en sombre | Aucun élément ne porte vert et bleu ensemble |
| V4 | Thème clair sans bleu | Aucune occurrence de `#7DD3FC` ni dérivé appliquée en `[data-theme="light"]` |
| V5 | Mono réservé à la donnée machine | Aucun paragraphe de prose en `font-mono` |
| V6 | Rayons dans l'ensemble autorisé | Toute valeur de `border-radius` ∈ {9, 10, 14, 20, 999}px |
| V7 | Space Grotesk et Inter retirés | Absents de `package.json` **et** de `global.css` |
| V8 | Contrastes AA | Texte `body` sur `bg`, `muted` sur `surface`, `accent` sur `accentSoft` ≥ 4.5:1 dans les 2 thèmes |
