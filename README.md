# bendevcat.github.io

Le site a déménagé sur **https://bencat.dev** (hébergé sur un Raspberry Pi).
Ce dépôt ne sert plus que des redirections : `index.html` et `404.html` renvoient
chaque adresse vers le même chemin sur bencat.dev.

## Sonde

`.github/workflows/sonde.yml` vérifie toutes les 30 minutes `bencat.dev`, sa preview,
l'appli bzc et leurs certificats. Un échec déclenche un mail de GitHub.
