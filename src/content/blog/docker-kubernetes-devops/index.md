---
title: "Docker et Kubernetes : Guide complet du DevOps moderne"
description: "Un guide complet sur Docker et Kubernetes : conteneurisation, orchestration, bonnes pratiques de production, sécurité et observabilité."
pubDate: 2025-10-20T14:00:00+02:00
draft: false
category: "Outils"
cover: "./cover.jpg"
coverAlt: "Illustration conteneurs et orchestration"
tags:
  - docker
  - kubernetes
  - devops
  - containers
  - orchestration
  - ci-cd
aiUsage: "full"
---
## TL;DR

Docker et Kubernetes ont transformé l'industrie du développement logiciel en permettant la conteneurisation et l'orchestration d'applications à grande échelle. Ce guide couvre :

* Les concepts fondamentaux de Docker et des conteneurs
* L'orchestration avec Kubernetes
* Les meilleures pratiques de production
* Des exemples concrets et des architectures réelles
* Les pièges à éviter et les optimisations

## Introduction : La révolution des conteneurs

Le DevOps a révolutionné la manière dont nous développons, testons et déployons des applications. Au cœur de cette transformation se trouvent deux technologies majeures : **Docker** et **Kubernetes**. Ensemble, ils forment un écosystème puissant qui résout les problèmes classiques de déploiement, de portabilité et de mise à l'échelle.

Avant Docker, les équipes de développement faisaient face à un problème récurrent : une application qui fonctionnait parfaitement en développement pouvait mystérieusement échouer en production. Les différences d'environnements, de versions de bibliothèques et de configurations système créaient des bugs difficiles à reproduire et à résoudre.

## Comprendre Docker : La conteneurisation expliquée

### Qu'est-ce qu'un conteneur ?

Un conteneur est une unité standardisée de logiciel qui empaquette le code et toutes ses dépendances, permettant à l'application de s'exécuter de manière fiable d'un environnement à un autre. Contrairement aux machines virtuelles qui virtualisent l'ensemble du système d'exploitation, les conteneurs partagent le noyau du système hôte, ce qui les rend beaucoup plus légers et rapides.

### Les avantages de Docker

**1. Portabilité absolue**

Docker encapsule votre application et son environnement dans une image immuable. Que vous déployiez sur votre machine locale, un serveur de test, ou un cluster cloud, le comportement est identique.

**2. Isolation des processus**

Chaque conteneur s'exécute dans son propre espace isolé, avec ses propres :

* Système de fichiers
* Processus
* Variables d'environnement
* Ressources réseau

**3. Efficacité des ressources**

Les conteneurs démarrent en quelques secondes (vs plusieurs minutes pour une VM) et consomment beaucoup moins de RAM et de CPU.

**4. Gestion des versions**

Docker permet de versionner vos images comme du code, facilitant les rollbacks et la traçabilité.

### Créer votre premier Dockerfile

Voici un exemple de Dockerfile pour une application Node.js :

```dockerfile
# Utiliser une image de base officielle
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Définir l'utilisateur non-root pour la sécurité
USER node

# Commande de démarrage
CMD ["node", "server.js"]
```

**Explications des bonnes pratiques :**

* **Alpine Linux** : image de base ultra-légère (5 MB vs 900 MB pour une image complète)
* **npm ci** : installation déterministe et plus rapide que `npm install`
* **Multi-stage build** : pour réduire la taille finale de l'image
* **USER node** : ne jamais exécuter en root pour des raisons de sécurité

### Docker Compose : Orchestration locale

Pour les applications multi-conteneurs, Docker Compose simplifie la gestion :

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://db:5432/myapp
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Cette configuration définit une stack complète avec une application web, une base de données PostgreSQL et Redis pour le cache.

## Kubernetes : L'orchestration à grande échelle

### Pourquoi Kubernetes ?

Docker est excellent pour gérer des conteneurs sur une seule machine. Mais que se passe-t-il quand vous avez :

* Des centaines de conteneurs
* Répartis sur plusieurs serveurs
* Avec des besoins de haute disponibilité
* Des pics de charge imprévisibles

C'est là que **Kubernetes** (K8s) entre en jeu. Il automatise le déploiement, la mise à l'échelle et la gestion des applications conteneurisées.

### Les concepts clés de Kubernetes

**1. Pods**

L'unité de déploiement la plus petite dans Kubernetes. Un pod peut contenir un ou plusieurs conteneurs qui partagent le même réseau et stockage.

**2. Deployments**

Décrivent l'état désiré de votre application. Kubernetes s'assure que cet état est maintenu.

**3. Services**

Exposent vos pods au réseau et assurent le load balancing.

**4. Namespaces**

Permettent d'isoler les ressources dans un même cluster (dev, staging, prod).

### Exemple de déploiement Kubernetes

Voici un déploiement complet d'une application web :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-deployment
  labels:
    app: webapp
spec:
  replicas: 3  # 3 instances pour la haute disponibilité
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: myapp:1.2.3
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
spec:
  selector:
    app: webapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

**Fonctionnalités clés de cette configuration :**

* **3 réplicas** : assure la haute disponibilité
* **Resource limits** : prévient la surcharge du cluster
* **Liveness probe** : redémarre les pods qui ne répondent plus
* **Readiness probe** : ne route le trafic que vers les pods prêts
* **Secrets** : gestion sécurisée des données sensibles

### Auto-scaling avec Kubernetes

L'un des plus grands avantages de Kubernetes est l'auto-scaling :

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Cette configuration scale automatiquement votre application entre 3 et 10 pods en fonction de l'utilisation CPU et mémoire.

## Architecture réelle : Application microservices

Voici une architecture typique d'une application moderne avec Kubernetes :

```
┌─────────────────────────────────────────────────────────┐
│                    Ingress Controller                    │
│            (nginx / traefik / istio)                     │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐
│   Frontend   │ │    API     │ │   Auth     │
│   Service    │ │  Gateway   │ │  Service   │
│   (React)    │ │  (Node.js) │ │  (Go)      │
└──────────────┘ └─────┬──────┘ └────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
│   Orders     │ │  Products  │ │  Users    │
│   Service    │ │  Service   │ │  Service  │
│   (Python)   │ │  (Java)    │ │  (Node)   │
└──────┬───────┘ └─────┬──────┘ └─────┬─────┘
       │               │              │
┌──────▼───────────────▼──────────────▼─────┐
│           Message Queue (RabbitMQ)         │
└────────────────────────────────────────────┘
       │               │              │
┌──────▼──────┐ ┌──────▼──────┐ ┌────▼──────┐
│  PostgreSQL │ │   MongoDB   │ │   Redis   │
└─────────────┘ └─────────────┘ └───────────┘
```

### Les composants de cette architecture

**Ingress Controller** : Point d'entrée unique pour router le trafic HTTP/HTTPS vers les services appropriés

**API Gateway** : Centralise les requêtes, gère l'authentification et la limitation de débit

**Microservices** : Chaque service est responsable d'un domaine métier spécifique

**Message Queue** : Communication asynchrone entre services

**Bases de données** : Chaque service peut avoir sa propre base de données (pattern Database per Service)

## Best Practices en production

### 1. Images Docker optimisées

**Utiliser des multi-stage builds :**

```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

Cette approche réduit la taille de l'image finale de 70-90%.

### 2. Gestion des secrets

**Ne jamais** hardcoder les secrets dans les images. Utilisez Kubernetes Secrets ou des solutions comme HashiCorp Vault :

```bash
# Créer un secret Kubernetes
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=superSecret123
```

### 3. Health checks essentiels

Implémentez toujours des endpoints de santé :

```javascript
// Liveness probe : est-ce que l'app tourne ?
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe : est-ce que l'app est prête ?
app.get('/ready', async (req, res) => {
  try {
    await database.ping();
    await redis.ping();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### 4. Monitoring et observabilité

Utilisez la stack Prometheus + Grafana pour monitorer vos applications :

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: webapp-metrics
spec:
  selector:
    matchLabels:
      app: webapp
  endpoints:
  - port: metrics
    interval: 30s
```

### 5. Stratégies de déploiement

**Rolling update** : Déploiement progressif (par défaut dans Kubernetes)

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**Blue-Green deployment** : Deux environnements en parallèle, switch instantané

**Canary deployment** : Déploiement progressif sur un sous-ensemble d'utilisateurs

### 6. Gestion des ressources

Toujours définir requests et limits pour éviter les problèmes :

```yaml
resources:
  requests:  # Réservation garantie
    memory: "256Mi"
    cpu: "250m"
  limits:    # Maximum autorisé
    memory: "512Mi"
    cpu: "500m"
```

### 7. Sécurité

**Principes essentiels :**

* ✅ Scanner les images avec Trivy ou Snyk
* ✅ Utiliser des images officielles ou de sources fiables
* ✅ Ne jamais exécuter en tant que root
* ✅ Mettre à jour régulièrement les images de base
* ✅ Implémenter Network Policies pour limiter la communication entre pods
* ✅ Utiliser RBAC (Role-Based Access Control) pour contrôler l'accès au cluster

```yaml
# Network Policy exemple
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3000
```

## CI/CD avec Docker et Kubernetes

Exemple de pipeline GitLab CI :

```yaml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_IMAGE: registry.gitlab.com/mycompany/myapp

build:
  stage: build
  script:
    - docker build -t $DOCKER_IMAGE:$CI_COMMIT_SHA .
    - docker push $DOCKER_IMAGE:$CI_COMMIT_SHA

test:
  stage: test
  script:
    - docker run $DOCKER_IMAGE:$CI_COMMIT_SHA npm test

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/webapp webapp=$DOCKER_IMAGE:$CI_COMMIT_SHA
    - kubectl rollout status deployment/webapp
  only:
    - main
```

## Les pièges à éviter

### 1. Images trop volumineuses

❌ **Mauvais** : Image de 2 GB avec des outils de debug en production

✅ **Bon** : Image Alpine de 50 MB avec multi-stage build

### 2. Pas de limits de ressources

Sans limits, un conteneur peut consommer toutes les ressources du nœud et faire crasher d'autres applications.

### 3. Logs non centralisés

Utilisez un système centralisé comme ELK Stack (Elasticsearch, Logstash, Kibana) ou Loki.

### 4. État stocké dans les conteneurs

Les conteneurs sont éphémères ! Utilisez des volumes persistants ou des services externes pour le stockage.

### 5. Configuration hardcodée

Utilisez des ConfigMaps et Secrets pour externaliser la configuration.

## Patterns avancés de production

### Pattern 1 : Sidecar Container

Le pattern sidecar consiste à déployer un conteneur auxiliaire à côté de votre conteneur principal pour étendre ses fonctionnalités :

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp-with-logging
spec:
  containers:
  # Conteneur principal
  - name: webapp
    image: myapp:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/app

  # Sidecar pour le log shipping
  - name: log-shipper
    image: fluent/fluent-bit:latest
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/app
    - name: fluent-bit-config
      mountPath: /fluent-bit/etc/

  volumes:
  - name: shared-logs
    emptyDir: {}
  - name: fluent-bit-config
    configMap:
      name: fluent-bit-config
```

**Cas d'usage du sidecar :**

* Log shipping (Fluentd, Filebeat)
* Service mesh (Envoy proxy dans Istio)
* Monitoring agents
* Configuration synchronization

### Pattern 2 : Init Containers

Les init containers s'exécutent avant le conteneur principal et sont utiles pour la préparation :

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp-with-init
spec:
  initContainers:
  # Attendre que la base de données soit prête
  - name: wait-for-db
    image: busybox:latest
    command: ['sh', '-c', 'until nc -z postgres-service 5432; do echo waiting for db; sleep 2; done']

  # Migrer la base de données
  - name: db-migration
    image: myapp:latest
    command: ['npm', 'run', 'migrate']
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: url

  containers:
  - name: webapp
    image: myapp:latest
```

### Pattern 3 : StatefulSets pour applications stateful

Pour les bases de données et applications avec état :

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: mongodb-service
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
          name: mongodb
        volumeMounts:
        - name: data
          mountPath: /data/db
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

**Différences clés StatefulSet vs Deployment :**

* Identité stable (mongodb-0, mongodb-1, mongodb-2)
* Ordre de démarrage et arrêt garanti
* Stockage persistant unique par pod
* DNS prévisible (mongodb-0.mongodb-service.default.svc.cluster.local)

## Observabilité avancée

### Distributed Tracing avec OpenTelemetry

Implémentation complète du tracing dans une application Node.js :

```javascript
// tracing.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'api-gateway',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.2.3',
  }),
});

const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

// Dans votre code applicatif
const { trace } = require('@opentelemetry/api');

async function processOrder(orderId) {
  const tracer = trace.getTracer('order-service');
  const span = tracer.startSpan('process_order');

  try {
    span.setAttribute('order.id', orderId);

    // Appel à la base de données
    const childSpan = tracer.startSpan('db_query', { parent: span });
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    childSpan.end();

    // Appel à un service externe
    const paymentSpan = tracer.startSpan('payment_processing', { parent: span });
    await paymentService.charge(order.amount);
    paymentSpan.end();

    span.setStatus({ code: SpanStatusCode.OK });
    return order;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### Métriques custom avec Prometheus

```javascript
// metrics.js
const promClient = require('prom-client');

// Registre par défaut
const register = new promClient.Registry();

// Métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({ register });

// Métriques custom
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const ordersTotalCounter = new promClient.Counter({
  name: 'orders_total',
  help: 'Total number of orders processed',
  labelNames: ['status'],
  registers: [register],
});

// Middleware Express
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
});

// Endpoint pour Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Utilisation dans le code métier
async function createOrder(orderData) {
  try {
    const order = await db.createOrder(orderData);
    ordersTotalCounter.labels('success').inc();
    return order;
  } catch (error) {
    ordersTotalCounter.labels('failed').inc();
    throw error;
  }
}
```

### Configuration Grafana Dashboard

Exemple de requête PromQL pour un dashboard :

```promql
# Taux d'erreur 5xx sur 5 minutes
rate(http_requests_total{status_code=~"5.."}[5m])

# Latence P95 par route
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)

# Throughput par seconde
rate(http_requests_total[1m])

# Taux de succès des commandes
rate(orders_total{status="success"}[5m])
/
rate(orders_total[5m]) * 100
```

## Sécurité en profondeur

### Image Scanning dans le pipeline CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - build
  - security
  - deploy

build:
  stage: build
  script:
    - docker build -t $IMAGE_NAME:$CI_COMMIT_SHA .
    - docker push $IMAGE_NAME:$CI_COMMIT_SHA

container_scanning:
  stage: security
  image: aquasec/trivy:latest
  script:
    # Scan pour vulnérabilités
    - trivy image --severity HIGH,CRITICAL --exit-code 1 $IMAGE_NAME:$CI_COMMIT_SHA

    # Scan pour secrets accidentels
    - trivy fs --scanners secret .

    # Génération du rapport
    - trivy image --format json --output report.json $IMAGE_NAME:$CI_COMMIT_SHA
  artifacts:
    reports:
      container_scanning: report.json
  allow_failure: false  # Bloque le pipeline si des vulnérabilités critiques
```

### Pod Security Standards

```yaml
# Enforcer des standards de sécurité au niveau namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Exemple de pod conforme au standard "restricted"
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true

    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /app/cache

  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

### OPA (Open Policy Agent) pour la gouvernance

```rego
# policy.rego - Politique pour bloquer les images non approuvées
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  image := input.request.object.spec.containers[_].image
  not startswith(image, "registry.company.com/")
  msg := sprintf("Image %v is not from approved registry", [image])
}

deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("Container %v must run as non-root", [container.name])
}

deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  not container.resources.limits.memory
  msg := sprintf("Container %v must have memory limits", [container.name])
}
```

## Gestion des coûts et optimisation

### Resource Quotas par namespace

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: development
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
    pods: "20"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: limit-range
  namespace: development
spec:
  limits:
  - max:
      cpu: "2"
      memory: 4Gi
    min:
      cpu: "100m"
      memory: 128Mi
    default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "250m"
      memory: 256Mi
    type: Container
```

### Vertical Pod Autoscaler (VPA)

Le VPA ajuste automatiquement les ressources demandées en fonction de l'utilisation réelle :

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: webapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  updatePolicy:
    updateMode: "Auto"  # Ou "Initial" ou "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: webapp
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
```

### Cluster Autoscaler

Pour adapter automatiquement la taille du cluster :

```yaml
# AWS EKS exemple
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
        env:
        - name: AWS_REGION
          value: eu-west-1
```

## Disaster Recovery et Backup

### Velero pour les backups

Installation et configuration de Velero :

```bash
# Installation avec Helm
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set-file credentials.secretContents.cloud=./credentials-velero \
  --set configuration.provider=aws \
  --set configuration.backupStorageLocation.name=default \
  --set configuration.backupStorageLocation.bucket=my-backup-bucket \
  --set configuration.backupStorageLocation.config.region=eu-west-1 \
  --set snapshotsEnabled=true \
  --set deployRestic=true
```

Configuration de backups automatiques :

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Tous les jours à 2h du matin
  template:
    includedNamespaces:
    - production
    - staging
    excludedResources:
    - events
    - events.events.k8s.io
    ttl: 720h  # Conserver 30 jours
    storageLocation: default
    volumeSnapshotLocations:
    - default
---
# Backup avant un déploiement risqué
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: pre-deployment-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  labelSelector:
    matchLabels:
      app: critical-service
```

### Restauration après sinistre

```bash
# Lister les backups disponibles
velero backup get

# Restaurer un backup complet
velero restore create --from-backup daily-backup-20240120020000

# Restaurer uniquement un namespace spécifique
velero restore create --from-backup daily-backup-20240120020000 \
  --include-namespaces production

# Restaurer avec remplacement des ressources existantes
velero restore create --from-backup daily-backup-20240120020000 \
  --restore-volumes=true \
  --existing-resource-policy=update
```

## Outils complémentaires essentiels

**Helm** : Gestionnaire de packages pour Kubernetes (comme npm pour Node.js)

```bash
# Installation d'une application avec Helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-postgres bitnami/postgresql \
  --set auth.username=admin \
  --set auth.database=mydb \
  --namespace production
```

**Istio** : Service mesh pour gérer la communication inter-services

```yaml
# Exemple de VirtualService pour le traffic splitting (Canary)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: webapp-vs
spec:
  hosts:
  - webapp.example.com
  http:
  - match:
    - headers:
        user-group:
          exact: beta-testers
    route:
    - destination:
        host: webapp
        subset: v2
  - route:
    - destination:
        host: webapp
        subset: v1
      weight: 90
    - destination:
        host: webapp
        subset: v2
      weight: 10  # 10% du trafic vers v2
```

**ArgoCD** : GitOps pour Kubernetes, déploiement déclaratif

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/webapp-manifests
    targetRevision: HEAD
    path: kubernetes/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

**Lens** : IDE pour Kubernetes, visualisation et gestion du cluster

**k9s** : Interface CLI interactive pour Kubernetes

**Kustomize** : Gestion de configurations Kubernetes sans templating

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- base/deployment.yaml
- base/service.yaml

namespace: production

commonLabels:
  env: production
  managed-by: kustomize

configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=info
  - ENVIRONMENT=production

images:
- name: myapp
  newTag: 1.2.3
```

## Conclusion

Docker et Kubernetes ont révolutionné l'industrie du logiciel en résolvant des problèmes complexes de déploiement, de scalabilité et de fiabilité. Ensemble, ils forment un écosystème complet pour :

* **Développer** : Environnements cohérents entre dev et prod
* **Tester** : Isolation des tests et reproductibilité
* **Déployer** : Automatisation et rollbacks faciles
* **Scaler** : Adaptation automatique à la charge
* **Maintenir** : Self-healing et haute disponibilité

Bien que la courbe d'apprentissage puisse sembler raide, l'investissement en vaut largement la peine. Commencez petit avec Docker, maîtrisez les concepts de base, puis progressez vers Kubernetes quand vos besoins d'orchestration grandissent.

Le combo Docker + Kubernetes est devenu le standard de facto pour le déploiement d'applications modernes, et les compétences dans ces technologies sont parmi les plus recherchées dans l'industrie tech actuelle.

## Ressources pour aller plus loin

* 📚 [Documentation officielle Docker](https://docs.docker.com/)
* 📚 [Documentation officielle Kubernetes](https://kubernetes.io/docs/)
* 🎓 [Kubernetes par la pratique](https://www.katacoda.com/courses/kubernetes)
* 🎥 [YouTube : TechWorld with Nana](https://www.youtube.com/c/TechWorldwithNana)
* 📖 [Livre : Kubernetes in Action](https://www.manning.com/books/kubernetes-in-action)
* 🛠️ [Play with Kubernetes](https://labs.play-with-k8s.com/) - Lab interactif gratuit
