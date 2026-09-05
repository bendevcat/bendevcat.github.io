# Plan 5 — Handoff

**Date :** 2026-09-05
**Branche :** `plan-5-recherche-et-pages`, **mergée dans `main`** (`f790a87`), puis `origin/main` intégré (`60d50f7`)
**Commits :** 124 d'avance sur `origin/main`, **non poussés**
**État :** **7 critères sur 8 mesurés. Prêt à publier, UNE décision en attente (D01).** Ni push, ni tag, ni Phase Z lancés — c'est délibéré.

---

## 1. Ce qui est livré et prouvé

| Critère | Statut | Ce qui l'établit |
|---|---|---|
| R1 recherche ⌘K | **Done** | ⌘K **et** Ctrl+K ouvrent avec le focus dans le champ · `git` → **4 groupes / 9 résultats** couvrant les 4 collections · **les 4 groupes** mènent à la bonne page, `h1` d'arrivée identique au titre affiché |
| R2 `/tags` | **Done** | 30 tags distincts reconstruits depuis les sources = **30 liens rendus** |
| R3 `/tags/<tag>` | **In progress** | Établie en `3f823ec` (4 groupes), **puis invalidée par la donnée** — voir §3. Le code est inchangé et correct |
| R4 filtres `/blog` | **Done** | Comptage **dans les deux sens**, revérifié après fusion : DevOps **2**, Outils **3**, retour **5** · kubernetes **2**, devops **3**, retour **5** · combinaison sans intersection → **0** + état vide · lien étiré vérifié par `elementFromPoint` · clavier == souris |
| R5 `/a-propos` | **Done** | Bio composée des seuls textes de l'auteur, **relue et corrigée par lui** (3 retouches de fidélité appliquées) |
| R6 `/transparence-ia` | **Done** | 3 noms techniques · **3 classes de bannière distinctes** (slate/amber/blue) · 3 descriptions · clic depuis un article vérifié |
| R7 `/404` | **Done** | `curl` sur une URL inexistante → **HTTP 404** (pas 200), page stylée, ⌘K opérationnel |
| R8 index Pagefind | **In progress** | Moitié **build** établie (`Indexed 12 pages`, garde-fou prouvé mordant). Moitié **prod** non mesurable sans publier |

**Mesures finales :** `vitest` **118/118 (12 fichiers)** · `astro check` **0 error / 0 warning** (66 hints) · `astro build` **51 pages** · lint anti-drift **13/13, exit 0**.

**Tâches :** A1, A2, B1, B2, B3, C1, C2, C3 → **Done** (8/8 des tâches d'implémentation). D1 (moitié prod de R8) et Z1 (Phase Z) → **bloquées par D01**.

## 2. Pourquoi ni push, ni tag, ni Phase Z

L'utilisateur avait autorisé « Publie — merge et push » pour permettre de mesurer la moitié prod de R8. **Au moment de pousser, `main` s'est révélé en retard d'un commit** : un commit CMS de l'utilisateur (`d2f4ab2`, 2026-08-02) jamais récupéré localement, touchant exactement l'article retagué au gate. Rien n'a été poussé.

Ce commit a ouvert **D01**, qui est `pending-user`. Le verrou 4 de la méthodologie est explicite : le script de release et le tag ne tournent **jamais** tant qu'une entrée est `pending-user`, et `/anti-drift-planning:verify 5` l'applique. La Phase Z n'a donc pas été lancée : elle échouerait par construction, et son étape de walkthrough demande l'utilisateur de toute façon.

**La chaîne est bloquée sur une seule décision.**

## 3. D01 — la décision en attente

`/tags/claude-code/` ne rend plus que **3 collections sur 4** (`blog 0, projets 1, prompts 2, skills 2`).

**Cause :** le commit CMS met `draft: true` sur « Bienvenue dans mon foutoir », **seul article du blog portant `claude-code`**. Aucun autre article ne parle de Claude Code : la 4ᵉ patte ne peut pas être remplacée sans poser une étiquette fausse, ce que l'arbitrage du gate interdit explicitement.

**Deux issues, toutes deux à un champ de frontmatter :**
- **Rejeter D01** → repasser `draft: false` : R3 revient à 4 collections, `/blog` à 6 cartes, l'index à 13 pages. Tout passe, la Phase Z peut tourner d'un trait.
- **Approuver D01** → l'article reste hors ligne, R3 est actée `Deferred` ou `Cut` selon le mot de l'utilisateur, et la spec du prochain cycle doit dire comment la 4ᵉ collection sera couverte.

## 4. La suite, dans l'ordre

1. L'utilisateur tranche **D01**.
2. `/anti-drift-planning:verify 5` — Phase Z, non contournable.
3. **Sur PASS uniquement** : push de `main` (déploiement), puis mesure de la moitié prod de R8 sur `https://bendevcat.github.io/` (`/pagefind/pagefind.js` en 200, ⌘K, 4 groupes).
4. Tags `milestone-plan-5` et **`v1.0.0`**.

⚠️ **Pousser publiera les Plans 2, 3, 4 et 5 d'un coup** — `origin/main` est resté à la fin du Plan 1. C'est acté et voulu par l'utilisateur, mais cela reste une publication en une fois.

`/anti-drift-planning:resume 5` régénère le prompt de reprise depuis le ledger.

## 5. Ce qui reste ouvert au-delà de ce plan

Trié par la revue finale de branche, **tout jugé acceptable au merge** :

- **Dette n°1 — deux modèles d'identité de tag coexistent.** `/blog` et `/tags/*` normalisent par slug ; `/prompts` et `/skills` (Plan 4) filtrent sur la graphie exacte. `Sécurité` et `sécurité` donneraient deux options distinctes sur `/prompts` et une seule page sur `/tags`. Aucun test ne le voit.
- **Barre de filtres sans plafonnement** : 306 px de haut à 375px avec 21 tags ; à 30 articles elle couvrira l'écran.
- Bruit de « boilerplate » dans les extraits Pagefind (~110 car. de bannière IA) — cosmétique, jamais discriminant au classement.
- `Entrée` n'ouvre pas le premier résultat de la recherche (fonctionnalité jamais demandée).
- Tags non cliquables sur les pages de détail : `/tags/<tag>` n'est atteignable que depuis `/blog` et `/404`.
- `aria-live` sur tout le conteneur de résultats : la liste entière est ré-annoncée à chaque frappe.
- Libellés de collection dupliqués entre `search.ts` et `tags.ts`, sans rien qui les tienne ensemble.
- `C++` et `C#` fusionnent en `/tags/c/` — prix assumé de la normalisation, non documenté.
- 4 vulnérabilités npm **antérieures**, transitives via Astro, **build-time uniquement** sur un site statique.
- Sur `/tags`, libellé et compteur sont séparés par un `flex gap` : l'écart visuel est réel (9 px) mais un lecteur d'écran et un copier-coller rendent « claude-code6 » d'un seul tenant.

## 6. Le mode de panne à retenir de ce plan

Quatre défauts ont traversé build, tests et typecheck sans en faire échouer un seul : un fichier de test **désaccentué** qui a détruit la couverture des accents ; un bouton créé sur une page où il ne servait à rien, produisant un **clic mort** ; la parade de chargement de Pagefind **qui ne marchait pas** avec un build vert ; et deux espaces mangés par Astro affichant « des**fiches projets** » et « ⌘K— ça marche ».

Aucun n'a été trouvé par un test. Tous l'ont été par **mesure du rendu réel** — navigateur, `curl`, mutation. Et une de mes propres affirmations de vérification (« 0 collision ailleurs sur le site ») s'est révélée fausse parce que le balayage était unidirectionnel : c'est la revue finale qui l'a démontée.
