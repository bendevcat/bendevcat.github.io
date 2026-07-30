---
title: "Commandes Linux : du basique au one-liner surpuissant"
description: "Les commandes Linux que j'utilise en prod, du niveau basique au one-liner avancé, pour debugger et administrer efficacement."
pubDate: 2025-10-26T20:41:00.000+01:00
draft: false
category: "DevOps"
cover: "./cover.jpg"
coverAlt: "Illustration terminal Linux"
tags:
  - linux
  - terminal
  - devops
  - bash
  - sysadmin
  - automation
aiUsage: "full"
---
En tant que DevOps, la ligne de commande Linux est votre couteau suisse quotidien. 

Voici les commandes que j'utilise en production, avec des exemples progressifs du simple au complexe pour débloquer leur vraie puissance.

## TL;DR - One-liners DevOps essentiels ⚡

```bash
# Top 5 processus qui consomment le plus de RAM
ps aux --sort=-%mem | head -6

# Trouver et tuer tous les processus zombies
ps aux | awk '$8=="Z" {print $2}' | xargs -r kill -9

# Nettoyer les logs Docker qui prennent trop de place
truncate -s 0 $(docker inspect --format='{{.LogPath}}' $(docker ps -qa))

# Analyser les 10 IPs qui tapent le plus sur nginx
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Backup incrémental avec rsync + exclusions
rsync -avz --delete --exclude='node_modules' --exclude='.git' /src/ user@backup:/dst/
```

- - -

## 1. grep - La recherche de logs en production 🔍

### Niveau 1 : Recherche basique

```bash
grep "ERROR" app.log
```

### Niveau 2 : Contexte et filtrage

```bash
# Afficher 3 lignes avant/après chaque erreur
grep -C 3 "ERROR" app.log

# Recherche insensible à la casse + numéros de ligne
grep -in "error" app.log

# Recherche récursive dans tous les logs
grep -r "OutOfMemoryError" /var/log/
```

### Niveau 3 : Regex + combinaisons

```bash
# Trouver toutes les erreurs HTTP 5xx
grep -E "HTTP/[0-9.]+ 5[0-9]{2}" access.log

# Exclure les lignes contenant "DEBUG"
grep "ERROR" app.log | grep -v "DEBUG"

# Chercher plusieurs patterns
grep -E "ERROR|FATAL|CRITICAL" app.log
```

### Niveau 4 : DevOps power mode

```bash
# Trouver les erreurs des 5 dernières minutes
find /var/log -name "*.log" -mmin -5 -exec grep -l "ERROR" {} \;

# Compter les erreurs par type
grep -o "ERROR: [A-Za-z]*" app.log | sort | uniq -c | sort -rn

# Filtrer les logs entre deux timestamps
awk '/2025-10-17 14:00/,/2025-10-17 15:00/' app.log | grep ERROR

# Alerting : envoyer un mail si > 100 erreurs dans la dernière heure
if [ $(journalctl --since "1 hour ago" | grep -c ERROR) -gt 100 ]; then
  echo "Too many errors!" | mail -s "ALERT" ops@example.com
fi
```

- - -

## 2. find - Au-delà de la simple recherche 📂

### Niveau 1 : Recherche par nom

```bash
find . -name "*.log"
```

### Niveau 2 : Critères multiples

```bash
# Fichiers modifiés dans les dernières 24h
find /var/log -type f -mtime -1

# Fichiers > 100MB
find . -type f -size +100M

# Fichiers appartenant à l'utilisateur www-data
find /var/www -user www-data
```

### Niveau 3 : Actions sur les résultats

```bash
# Supprimer les logs de plus de 30 jours
find /var/log -name "*.log" -mtime +30 -delete

# Changer les permissions de tous les scripts
find . -name "*.sh" -exec chmod +x {} \;

# Copier tous les fichiers de config dans un backup
find /etc -name "*.conf" -exec cp {} /backup/ \;
```

### Niveau 4 : DevOps ninja mode

```bash
# Trouver les gros fichiers et les trier par taille
find / -type f -size +500M -exec ls -lh {} \; | awk '{print $5 "\t" $9}' | sort -hr

# Nettoyer les node_modules > 30 jours dans tous les projets
find ~/projects -name "node_modules" -type d -mtime +30 -exec rm -rf {} +

# Trouver les fichiers de log non compressés et les gzipper
find /var/log -name "*.log" -size +10M ! -name "*.gz" -exec gzip {} \;

# Audit de sécurité : fichiers SUID suspects
find / -perm -4000 -user root -ls 2>/dev/null

# Détecter les fichiers qui ont changé dans les dernières 2h (intrusion ?)
find /etc /bin /sbin -type f -mmin -120 -ls
```

- - -

## 3. awk - Le couteau suisse de l'analyse de texte 📊

### Niveau 1 : Extraction de colonnes

```bash
# Afficher seulement la 1ère colonne
ps aux | awk '{print $1}'

# Plusieurs colonnes
ls -l | awk '{print $3, $9}'
```

### Niveau 2 : Filtres et conditions

```bash
# Processus qui consomment > 1% CPU
ps aux | awk '$3 > 1.0 {print $0}'

# Lignes où la 5ème colonne > 1000
df -h | awk '$5 > 1000'

# Filtrer par regex
awk '/ERROR/ {print $0}' app.log
```

### Niveau 3 : Calculs et agrégations

```bash
# Somme de la colonne "size"
ls -l | awk '{sum += $5} END {print sum}'

# Moyenne du temps de réponse nginx
awk '{sum+=$NF; count++} END {print sum/count}' nginx-response-times.log

# Compter les occurrences
awk '{count[$1]++} END {for (ip in count) print ip, count[ip]}' access.log
```

### Niveau 4 : Scripts awk complexes

```bash
# Analyser les temps de réponse nginx par endpoint
awk '{
  endpoint=$7
  response_time=$NF
  sum[endpoint] += response_time
  count[endpoint]++
}
END {
  for (e in sum) {
    printf "%s: avg=%.2fms, count=%d\n", e, sum[e]/count[e], count[e]
  }
}' access.log | sort -t'=' -k2 -rn

# Détecter les pics de trafic (> 1000 req/min)
awk '{
  time=substr($4, 2, 17)  # Extraire timestamp
  count[time]++
}
END {
  for (t in count) {
    if (count[t] > 1000) {
      print t, count[t], "requests - SPIKE DETECTED"
    }
  }
}' access.log

# Analyse de logs Kubernetes par namespace
kubectl logs -n production pod-xyz | awk '
/ERROR/ {errors++}
/WARN/ {warnings++}
/INFO/ {info++}
END {
  print "Errors:", errors
  print "Warnings:", warnings
  print "Info:", info
  print "Error rate:", (errors/(errors+warnings+info)*100) "%"
}'
```

- - -

## 4. sed - Édition de texte en streaming 🔧

### Niveau 1 : Remplacement simple

```bash
sed 's/old/new/' file.txt
sed 's/old/new/g' file.txt  # Toutes les occurrences
```

### Niveau 2 : Édition in-place

```bash
# Remplacer dans le fichier directement
sed -i 's/DEBUG/INFO/g' config.yaml

# Backup avant modification
sed -i.bak 's/localhost/prod-server/g' app.conf

# Supprimer les lignes vides
sed -i '/^$/d' file.txt
```

### Niveau 3 : Patterns avancés

```bash
# Supprimer les commentaires
sed '/^#/d' config.conf

# Remplacer seulement sur les lignes contenant "production"
sed '/production/s/debug=true/debug=false/' config.ini

# Supprimer les lignes entre deux patterns
sed '/START_BLOCK/,/END_BLOCK/d' file.txt
```

### Niveau 4 : DevOps automation

```bash
# Changer l'IP dans tous les fichiers nginx
find /etc/nginx -name "*.conf" -exec sed -i 's/10.0.1.50/10.0.1.100/g' {} \;

# Désactiver tous les services de debug en prod
sed -i '/DEBUG/s/true/false/g' /etc/app/*.conf

# Rotation d'IP dans un load balancer
sed -i "s/server oldserver:8080/server newserver:8080/g" haproxy.cfg && systemctl reload haproxy

# Mise à jour de version dans package.json de plusieurs projets
find ~/projects -name "package.json" -exec sed -i 's/"version": "1.0.0"/"version": "1.1.0"/' {} \;

# Nettoyer les logs : remplacer les tokens secrets par [REDACTED]
sed -E 's/(token|password|secret)=[A-Za-z0-9]+/\1=[REDACTED]/gi' app.log
```

- - -

## 5. xargs - Passer les résultats en arguments ⚙️

### Niveau 1 : Usage basique

```bash
# Supprimer plusieurs fichiers
find . -name "*.tmp" | xargs rm

# Créer des répertoires
echo "dir1 dir2 dir3" | xargs mkdir
```

### Niveau 2 : Parallélisation

```bash
# Traiter 4 fichiers en parallèle
find . -name "*.log" | xargs -P 4 gzip

# Télécharger plusieurs URLs en parallèle
cat urls.txt | xargs -n 1 -P 8 wget
```

### Niveau 3 : Gestion d'espaces et caractères spéciaux

```bash
# Gérer les noms de fichiers avec espaces
find . -name "*.mp3" -print0 | xargs -0 rm

# Traiter ligne par ligne
cat hosts.txt | xargs -I {} ssh {} "uptime"
```

### Niveau 4 : DevOps automation power

```bash
# Redémarrer tous les services d'une app
systemctl list-units --type=service | grep "myapp-" | awk '{print $1}' | xargs systemctl restart

# Tuer tous les processus d'un user
ps -u www-data -o pid= | xargs kill -9

# Backup de multiples bases de données
mysql -e "SHOW DATABASES" | grep -v "Database\|information_schema\|mysql" | xargs -I {} mysqldump {} > {}.sql

# Vider les logs de tous les containers Docker
docker ps -q | xargs -I {} sh -c 'truncate -s 0 $(docker inspect --format="{{.LogPath}}" {})'

# Synchroniser plusieurs serveurs en parallèle
cat servers.txt | xargs -P 10 -I {} rsync -avz /local/path/ {}:/remote/path/

# Tester la connectivité sur plusieurs ports
echo "80 443 8080 3306" | xargs -n 1 -I {} timeout 2 bash -c "echo > /dev/tcp/prod-server/{}" && echo "Port {} OK"

# Audit : vérifier les certificats SSL sur plusieurs domaines
cat domains.txt | xargs -n 1 -P 5 -I {} sh -c 'echo {} && echo | openssl s_client -connect {}:443 2>/dev/null | openssl x509 -noout -dates'
```

- - -

## 6. journalctl - Maîtriser systemd logs 📝

### Niveau 1 : Logs basiques

```bash
journalctl -u nginx.service
journalctl -f  # Follow mode
```

### Niveau 2 : Filtrage temporel

```bash
# Logs depuis aujourd'hui
journalctl --since today

# Dernière heure
journalctl --since "1 hour ago"

# Entre deux dates
journalctl --since "2025-10-17 08:00" --until "2025-10-17 10:00"
```

### Niveau 3 : Filtres avancés

```bash
# Par priorité (erreurs seulement)
journalctl -p err

# Multiple services
journalctl -u nginx -u mysql

# Par PID
journalctl _PID=1234

# Kernel messages
journalctl -k
```

### Niveau 4 : DevOps debugging

```bash
# Logs boot précédent (après crash)
journalctl -b -1

# Analyser les erreurs d'un service
journalctl -u myapp.service -p err --no-pager | tail -50

# Exporter les logs en JSON pour parsing
journalctl -u nginx -o json --since "1 hour ago" | jq '.MESSAGE'

# Corréler les logs de plusieurs services
journalctl -u nginx -u php-fpm --since "10 minutes ago" -o short-precise

# Statistiques de log par service
journalctl --disk-usage
journalctl --vacuum-size=500M  # Nettoyer

# Alerting : détecter les OOM kills
journalctl -k --since "1 hour ago" | grep -i "out of memory"

# Performance : temps de boot de chaque service
systemd-analyze blame

# Détecter les services qui crashent en boucle
journalctl -p err --since today | grep "Failed with result" | awk '{print $NF}' | sort | uniq -c | sort -rn
```

- - -

## 7. ss / netstat - Debugging réseau 🌐

### Niveau 1 : Connexions actives

```bash
ss -tuln  # TCP/UDP listening ports
ss -an    # All connections
```

### Niveau 2 : Filtrage

```bash
# Connexions établies
ss -t state established

# Port spécifique
ss -tuln | grep :80

# Processus associé
ss -tulnp
```

### Niveau 3 : Analyse détaillée

```bash
# Connexions par état
ss -tan | awk '{print $1}' | sort | uniq -c

# Top IPs connectées
ss -tn | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head

# Sockets Unix
ss -x
```

### Niveau 4 : DevOps production debugging

```bash
# Détecter une attaque DDoS
ss -tn | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | awk '$1 > 50 {print $2, $1 " connections"}'

# Vérifier les TIME_WAIT (problème de performance)
ss -tan | grep TIME-WAIT | wc -l

# Connexions par service
ss -tulnp | awk '{print $7}' | cut -d'"' -f2 | sort | uniq -c | sort -rn

# Tracer les connexions en temps réel
watch -n 1 'ss -tuln | grep :3306'

# Détecter les connexions zombies
ss -o state established '( dport = :80 or sport = :80 )' | grep -i timer

# Analyser la queue de SYN (DoS attack indicator)
ss -nlti '( sport = :80 )' | grep -i qlen

# Benchmark : combien de connexions peut gérer le serveur ?
ulimit -n  # File descriptors limit
ss -s      # Socket summary statistics
```

- - -

## 8. strace / ltrace - Debugging au niveau système 🔬

### Niveau 1 : Tracer un processus

```bash
strace ls
strace -p 1234  # Attacher à un PID
```

### Niveau 2 : Filtrer les syscalls

```bash
# Seulement les appels réseau
strace -e trace=network curl google.com

# Seulement les fichiers
strace -e trace=file,open,openat cat /etc/passwd

# Mesurer le temps des syscalls
strace -c ls
```

### Niveau 3 : Debugging avancé

```bash
# Sauvegarder la trace
strace -o output.txt -ff -p 1234

# Tracer les signaux
strace -e signal ls

# Suivre les fork/exec
strace -f -e trace=process nginx
```

### Niveau 4 : Production debugging (attention à la perf!)

```bash
# Pourquoi mon app est lente ? (I/O wait)
strace -c -p $(pgrep -f myapp) 2>&1 | grep -E "read|write"

# Détecter les fichiers manquants
strace -e open,openat myapp 2>&1 | grep ENOENT

# Tracer seulement les erreurs
strace -Z myapp

# Analyser un container Docker qui freeze
docker inspect -f '{{.State.Pid}}' container_name | xargs strace -p

# Library calls (ltrace)
ltrace -c myapp  # Résumé des appels library

# Combiner strace + grep pour détecter les leaks de file descriptors
strace -e open,close -p $(pgrep myapp) 2>&1 | grep -E "^(open|close)" | wc -l
```

- - -

## 9. tar + rsync - Backup & transfert pro 💾

### tar - Niveau DevOps

```bash
# Backup avec compression max + exclusions
tar -czf backup.tar.gz --exclude='node_modules' --exclude='*.log' /var/www

# Backup incrémental (seulement les fichiers modifiés)
tar -czf backup-$(date +%Y%m%d).tar.gz --listed-incremental=snapshot.file /var/www

# Extraction sélective
tar -xzf backup.tar.gz "*/config.yml"

# Pipe vers SSH pour backup distant
tar -czf - /var/www | ssh user@backup "cat > backup-$(date +%Y%m%d).tar.gz"

# Backup avec vérification d'intégrité
tar -czf - /data | tee >(sha256sum > backup.sha256) | ssh remote "cat > backup.tar.gz"
```

### rsync - Synchro avancée

```bash
# Sync avec delete (attention !)
rsync -avz --delete /source/ user@remote:/dest/

# Dry-run pour tester
rsync -avz --dry-run /source/ /dest/

# Bande passante limitée
rsync -avz --bwlimit=1000 /source/ /dest/

# Exclure plusieurs patterns
rsync -avz --exclude='*.log' --exclude='cache/' --exclude='.git/' /src/ /dst/

# Sync seulement les fichiers modifiés dans les dernières 24h
rsync -avz --update --files-from=<(find /src -mtime -1 -type f) /src/ /dst/

# Production : sync de plusieurs serveurs web
for server in web{1..5}; do
  rsync -avz --delete /var/www/ $server:/var/www/
done

# Backup incrémental avec hardlinks (économiser de l'espace)
rsync -avz --link-dest=/backup/previous /data/ /backup/$(date +%Y%m%d)/
```

- - -

## 10. One-liners DevOps magiques ✨

### Monitoring & Alerting

```bash
# Alerte si disque > 90%
df -h | awk '$5 > 90 {print "ALERT: " $6 " is at " $5}'

# Top 10 processus RAM
ps aux --sort=-%mem | awk 'NR<=10{printf "%-10s %-10s %s\n", $11, $4"%", $2}'

# Température CPU
sensors | grep "Core" | awk '{print $3}'

# Connexions réseau par IP
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn
```

### Nettoyage & Maintenance

```bash
# Nettoyer les logs > 30 jours
find /var/log -type f -name "*.log" -mtime +30 -exec truncate -s 0 {} \;

# Tuer tous les processus zombies
kill -9 $(ps aux | awk '$8=="Z" {print $2}')

# Vider le cache système (RAM)
sync; echo 3 > /proc/sys/vm/drop_caches

# Nettoyer les containers Docker arrêtés
docker rm $(docker ps -aq -f status=exited)
```

### Sécurité & Audit

```bash
# Dernières connexions SSH
last -a | head -20

# Fichiers modifiés dans /etc aujourd'hui
find /etc -type f -mtime 0

# Ports ouverts sur le firewall
iptables -L -n | grep ACCEPT | grep -E "dpt:[0-9]+"

# Détecter les tentatives de connexion SSH failed
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn
```

### Performance & Debugging

```bash
# I/O wait par processus
pidstat -d 1 5

# Bande passante réseau en temps réel
iftop -n -i eth0

# Connexions MySQL actives
mysqladmin processlist | grep -v "Sleep" | wc -l

# Analyse des slow queries PostgreSQL
tail -f /var/log/postgresql/postgresql.log | grep "duration"
```

- - -

## Conclusion : Composer les commandes

La vraie puissance de Linux vient de la **combinaison** de ces commandes avec des pipes (`|`).

**Exemple complexe réel** : Trouver le service qui génère le plus de logs en production

```bash
journalctl --since "1 hour ago" --no-pager | \
  grep -oP '(?<=\[)[^\]]+(?=\])' | \
  sort | uniq -c | sort -rn | head -10 | \
  awk '{printf "%-30s %s logs\n", $2, $1}'
```

**Debugging performance** : Quel endpoint nginx est le plus lent ?

```bash
awk '{print $7, $NF}' access.log | \
  awk '{sum[$1]+=$2; count[$1]++} END {for(u in sum) print u, sum[u]/count[u], count[u]}' | \
  sort -k2 -rn | head -10 | \
  column -t
```

Maîtriser ces commandes vous permet de résoudre 90% des problèmes en production sans outils externes. Le reste vient avec la pratique et l'imagination !

**Ressources** :

* [explainshell.com](https://explainshell.com) - Décompose les commandes complexes
* `man <command>` - RTFM toujours !
* [ShellCheck](https://www.shellcheck.net/) - Valider vos scripts bash

**Bonus** : Ajoutez ces alias dans votre `.bashrc` :

```bash
alias ports='ss -tuln'
alias myip='curl -s ifconfig.me'
alias logs='journalctl -f'
alias docker-clean='docker system prune -af'
alias git-clean='git branch --merged | grep -v "\*" | xargs -n 1 git branch -d'
```
