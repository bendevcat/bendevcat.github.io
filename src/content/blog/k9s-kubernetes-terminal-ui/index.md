---
title: "k9s : Gérez vos clusters Kubernetes like a boss"
description: "Présentation de k9s, le terminal UI qui simplifie la gestion de tes clusters Kubernetes au clavier."
pubDate: 2025-10-20T14:00:00+02:00
draft: false
category: "Outils"
cover: "./k9s-header.png"
coverAlt: "Logo k9s à côté de l'icône Kubernetes sur fond sombre"
tags:
  - kubernetes
  - k9s
  - devops
  - terminal
  - cli
  - monitoring
aiUsage: "partial"
---
Gérer un cluster Kubernetes avec `kubectl` peut vite devenir fastidieux. 

**k9s** est un terminal UI qui révolutionne votre workflow DevOps !

## TL;DR - L'essentiel en 30 secondes ⚡

**Qu'est-ce que k9s ?**
Un terminal UI interactif pour Kubernetes - comme `top` ou `htop` mais pour vos clusters.

**Installation rapide :**

```bash
# macOS
brew install k9s

# Linux
curl -sS https://webinstall.dev/k9s | bash

# Windows
scoop install k9s
```

**Commandes essentielles :**

* `:pods` → Lister les pods
* `:svc` → Services
* `:deploy` → Deployments
* `/` → Rechercher
* `l` → Logs
* `d` → Describe
* `e` → Edit
* `Ctrl+d` → Supprimer

**Pourquoi l'utiliser ?**
✅ Navigation rapide au clavier
✅ Vue temps réel de votre cluster
✅ Logs et metrics intégrés
✅ Édition YAML directe
✅ Pulse pour surveiller les changements

- - -

## Qu'est-ce que k9s ?

k9s est un **terminal UI (Text User Interface)** open-source qui transforme la gestion de Kubernetes en une expérience fluide et intuitive. Fini les longues commandes `kubectl get pods -n namespace --watch` !

### Pourquoi k9s change la donne

* **Productivité x10** : Navigation au clavier, raccourcis vim-like
* **Visibilité totale** : Vue d'ensemble de votre cluster en temps réel
* **Multi-contextes** : Basculez entre clusters en un clin d'œil
* **Ressource-friendly** : Plus léger que Lens ou K8s Dashboard
* **Open-source** : Gratuit, actif (10k+ ⭐ sur GitHub)

## Installation

### macOS (Homebrew)

```bash
brew install derailed/k9s/k9s
# ou simplement
brew install k9s
```

### Linux

**Via webinstall :**

```bash
curl -sS https://webinstall.dev/k9s | bash
```

**Ubuntu/Debian :**

```bash
# Télécharger la dernière release
VERSION=$(curl -s https://api.github.com/repos/derailed/k9s/releases/latest | grep tag_name | cut -d '"' -f 4)
wget https://github.com/derailed/k9s/releases/download/${VERSION}/k9s_Linux_amd64.tar.gz
tar -xzf k9s_Linux_amd64.tar.gz
sudo mv k9s /usr/local/bin/
```

**Arch Linux :**

```bash
yay -S k9s
```

### Windows

**Avec Scoop :**

```bash
scoop install k9s
```

**Avec Chocolatey :**

```bash
choco install k9s
```

### Vérifier l'installation

```bash
k9s version
```

## Premier lancement

```bash
# Lancer k9s
k9s

# Avec un namespace spécifique
k9s -n production

# Avec un contexte particulier
k9s --context my-cluster
```

## Navigation et raccourcis essentiels

### Commandes de base (comme vim)

| Touche | Action                        |
| ------ | ----------------------------- |
| `:`    | Entrer une commande/ressource |
| `/`    | Rechercher/filtrer            |
| `Esc`  | Retour/Annuler                |
| `?`    | Aide contextuelle             |
| `:q`   | Quitter k9s                   |

### Navigation entre ressources

```
:pods       → Pods
:svc        → Services
:deploy     → Deployments
:ns         → Namespaces
:no         → Nodes
:pv         → Persistent Volumes
:pvc        → Persistent Volume Claims
:ing        → Ingress
:cm         → ConfigMaps
:sec        → Secrets
:sa         → Service Accounts
:ctx        → Contexts (changer de cluster)
```

### Actions sur les ressources

| Touche   | Action                          |
| -------- | ------------------------------- |
| `Enter`  | Voir les détails                |
| `d`      | Describe (kubectl describe)     |
| `e`      | Edit (ouvre l'éditeur)          |
| `l`      | Logs (pour les pods)            |
| `s`      | Shell dans le pod               |
| `y`      | Copier le YAML                  |
| `Ctrl+d` | Supprimer                       |
| `Ctrl+k` | Kill pod                        |
| `p`      | Voir les pods précédents (logs) |

### Navigation avancée

| Touche    | Action               |
| --------- | -------------------- |
| `0-9`     | Changer de namespace |
| `Ctrl+a`  | Tous les namespaces  |
| `Shift+f` | Port-forward         |
| `Shift+t` | Trier                |
| `Ctrl+s`  | Sauvegarder          |
| `Ctrl+r`  | Rafraîchir           |

## Fonctionnalités avancées

### 1. Pulse Mode - Surveiller les changements

Le mode **Pulse** vous alerte visuellement quand une ressource change :

```bash
# Dans k9s, appuyez sur :
Ctrl+p
```

Les ressources qui changent clignotent ! Parfait pour surveiller des déploiements.

### 2. Logs en temps réel

```bash
# Sélectionnez un pod et tapez :
l    # Voir les logs
Shift+l    # Logs avec timestamps
```

**Fonctionnalités logs :**

* Auto-scroll
* Recherche dans les logs (`/`)
* Toggle wrap (`w`)
* Filtrage par container (pour pods multi-conteneurs)

### 3. Port-Forwarding rapide

```bash
# Sur un service ou pod :
Shift+f

# Entrez le port local:distant
8080:80
```

### 4. Shell interactif

```bash
# Sur un pod, tapez :
s

# Choisissez le container si multi-conteneurs
# Vous êtes maintenant dans le pod !
```

### 5. Benchmark (hey integration)

k9s intègre `hey` pour tester la charge :

```bash
# Sur un service :
Ctrl+b

# Configure les paramètres de load testing
```

### 6. Xray - Visualiser les dépendances

```bash
# Sur un pod :
x

# Voir toutes les ressources liées
# (services, configmaps, secrets, etc.)
```

## Configuration personnalisée

### Fichier de config

k9s utilise `~/.config/k9s/config.yml` :

```yaml
# ~/.config/k9s/config.yml
k9s:
  # Rafraîchissement auto (secondes)
  refreshRate: 2

  # Nombre max de logs à afficher
  maxConnRetry: 5

  # Activer le mode mouse
  enableMouse: false

  # Thème
  ui:
    enableMouse: false
    headless: false
    logoless: false
    crumbsless: false
    noIcons: false
    skin: dracula
```

### Thèmes (Skins)

k9s supporte plusieurs thèmes :

```bash
# Voir les thèmes disponibles
ls ~/.config/k9s/skins/

# Thèmes populaires : dracula, monokai, nord, tokyo-night
```

**Installer un thème custom :**

```bash
mkdir -p ~/.config/k9s/skins
# Télécharger un thème depuis https://github.com/derailed/k9s/tree/master/skins
```

### Alias personnalisés

Créez `~/.config/k9s/aliases.yml` :

```yaml
aliases:
  dp: deployments
  po: pods
  svc: services
  ing: ingress
  sec: secrets
  pf: portforwards
```

### Plugins

k9s supporte des plugins custom dans `~/.config/k9s/plugins.yml` :

```yaml
plugins:
  # Debug avec stern
  stern:
    shortCut: Ctrl+l
    description: Logs with stern
    scopes:
      - pods
    command: stern
    args:
      - --tail
      - 50
      - $NAME
      - -n
      - $NAMESPACE

  # Dive pour analyser les images
  dive:
    shortCut: d
    description: Dive image
    scopes:
      - containers
    command: dive
    args:
      - $COL-IMAGE
```

## Cas d'usage pratiques

### 1. Déboguer un pod qui crash

```bash
k9s
:pods
/mon-app     # Rechercher
l            # Voir les logs
p            # Logs du pod précédent (si restart)
d            # Describe pour les events
```

### 2. Rollback rapide d'un deployment

```bash
k9s
:deploy
# Sélectionner le deployment
e            # Edit
# Changer l'image tag
# Sauvegarder et quitter
```

### 3. Surveiller les ressources d'un namespace

```bash
k9s -n production
:no          # Voir l'état des nodes
:pods        # Pods du namespace
Ctrl+p       # Activer Pulse mode
```

### 4. Port-forward pour accéder à une DB

```bash
k9s
:pods
/postgres
Shift+f
5432:5432
# Dans un autre terminal :
psql -h localhost -p 5432
```

## Comparaison avec les alternatives

| Outil             | Type        | Avantages                      | Inconvénients              |
| ----------------- | ----------- | ------------------------------ | -------------------------- |
| **k9s**           | Terminal UI | Léger, rapide, keyboard-driven | Courbe d'apprentissage     |
| **Lens**          | Desktop App | GUI complète, graphiques       | Lourd (Electron)           |
| **kubectl**       | CLI         | Standard, scriptable           | Verbeux, pas de monitoring |
| **K8s Dashboard** | Web UI      | Officiel, visuel               | Nécessite installation     |
| **Octant**        | Web UI      | Plugins, moderne               | Plus maintenu              |

## Astuces et bonnes pratiques

### 1. Multi-clusters avec contextes

```bash
# Voir les contextes
:ctx

# Basculer rapidement
Entrer sur le contexte voulu
```

### 2. Filtrage avancé

```bash
# Filtrer par label
/app=nginx

# Filtrer par status
/Running

# Regex
/^prod-.*
```

### 3. Benchmark de performance

```bash
# Tester la charge d'un service
:svc
Ctrl+b
# Configurer : requests, concurrency, duration
```

### 4. Export de configurations

```bash
# Sur une ressource
y    # Copier le YAML
# Coller dans votre éditeur pour versioning
```

## Ressources et liens utiles

* **Documentation officielle** : https://k9scli.io
* **GitHub** : https://github.com/derailed/k9s
* **Skins/Thèmes** : https://github.com/derailed/k9s/tree/master/skins
* **Plugins community** : https://github.com/derailed/k9s/tree/master/plugins

## Conclusion

k9s est devenu un **outil indispensable** dans ma toolbox DevOps. Une fois les raccourcis maîtrisés, impossible de revenir aux commandes kubectl classiques.

**Points forts :**

* ⚡ Rapidité et fluidité
* 🎯 Navigation intuitive
* 🔍 Vue d'ensemble en temps réel
* 🎨 Hautement personnalisable
* 💰 Gratuit et open-source

**À améliorer :**

* Courbe d'apprentissage initiale
* Pas de graphiques (CPU/Memory)

Si vous gérez Kubernetes au quotidien, **essayez k9s dès aujourd'hui**. Vous ne pourrez plus vous en passer ! 🐶

- - -

**Et vous, quels sont vos outils préférés pour gérer Kubernetes ? Partagez en commentaires !**
