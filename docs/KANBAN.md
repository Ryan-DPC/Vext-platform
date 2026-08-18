# 📋 Vext Project Kanban

Ce document centralise les tâches, bugs et améliorations pour le projet **Vext**.

## 📌 Légende
- 🔴 **Critique** : Bloquant ou essentiel pour la MVP.
- 🟡 **Important** : À faire rapidement.
- 🟢 **Faible** : Amélioration "Nice to have".
- 🚀 **Feature** : Nouvelle fonctionnalité.
- 🐛 **Bug** : Correction de problème.
- ⚡ **Perf** : Optimisation.

---

## 📝 To Do (À Faire)

### 🚀 Features (Fonctionnalités)

| Priorité | Titre | Description Technique | Fichiers Affectés |
| :---: | --- | --- | --- |
| 🔴 | **Notifications Push Desktop** | Implémenter les notifications système via l'API Tauri `notification` lorsque l'app est en arrière-plan (nouveau message, invitation). | `apps/frontend/src-tauri/*`<br>`apps/frontend/src/services/OneSignal.ts` |
| 🟡 | **Recherche Avancée Marketplace** | Ajouter des filtres (Genre, Prix min/max, Note) dans l'API (`games.routes.ts`) et le Frontend. Indexer ces champs dans Mongo. | `apps/backend/src/features/games` <br> `apps/frontend/src/views/Store.vue` |
| 🟡 | **Système de Badges** | Créer un modèle `Badge` et un système d'attribution automatique (ex: "Early Adopter", "Big Spender") basé sur les stats utilisateur. | `apps/backend/src/features/users`<br>`packages/database/src/models/Badge.ts` |
| 🟢 | **Mode Clair / Sombre** | Permettre le basculement du thème via Tailwind (`darkMode: 'class'`) et sauvegarder la préférence dans `localStorage`. | `apps/frontend/tailwind.config.js`<br>`apps/frontend/src/App.vue` |

### 🐛 Bugs & Maintenance

| Priorité | Titre | Description Technique | Fichiers Affectés |
| :---: | --- | --- | --- |
| ✅ | **~~Activer Version Checker~~** | Activé dans `index.ts`. CRON job opérationnel. | `apps/server/src/jobs/version-checker.job.ts`<br>`apps/server/src/index.ts` |
| 🟡 | **Validation des Inputs (Zod)** | Ajouter un middleware de validation strict (Elysia `t.Object` / Zod) sur tous les endpoints `POST`/`PUT` pour éviter les données corrompues. | `apps/backend/src/features/*` |
| 🟡 | **Standardisation des Erreurs** | S'assurer que TOUTES les routes retournent un format d'erreur constant : `{ success: false, code: 'ERR_TYPE', message: '...' }`. | `apps/backend/src/utils/error.ts` |
| 🟢 | **Audit Sécurité WebSocket** | Vérifier que le rate-limiting est actif sur les sockets pour éviter le spam de broadcast `chat:global`. | `apps/server/src/socket.handlers.ts` |

### ⚡ Performance & DevOps

| Priorité | Titre | Description Technique | Fichiers Affectés |
| :---: | --- | --- | --- |
| 🔴 | **Cache Redis (Invalidation)** | Mettre en place une stratégie d'invalidation du cache (supprimer clés `games:*`) lors de la modification d'un jeu admin. | `apps/backend/src/services/redis.service.ts` |
| 🟡 | **Lazy Loading Frontend** | Utiliser `defineAsyncComponent` de Vue 3 pour les composants lourds (ex: `GameDetails.vue`, `ChatWidget.vue`) pour accélérer le FCP. | `apps/frontend/src/router/index.ts` |
| 🟡 | **CI/CD Tests** | Ajouter une étape `npm test` dans le workflow GitHub Actions avant le build Tauri. | `.github/workflows/build.yml` |

---

## 🏗️ In Progress (En Cours)

| Type | Titre | Description | Assigné à |
| :---: | --- | --- | --- |
| 🚀 | **Prototype Nexus Wars** | ❌ Annulé (Bloqué par permissions Antivirus). | **@Antigravity** |
| ⚡ | **Refonte Architecture Socket** | Migration du serveur WebSocket vers Elysia (Support natif Bun). Support partiel mais stable. | **@Antigravity** |
| 📝 | **Documentation Community** | Création des guides de contribution et templates d'issues pour la communauté. | **@Antigravity** |

---

## ✅ Done (Terminé)

- [x] **Chat Global Handler** : Implémentation du broadcast `chat:broadcast` (`apps/server/src/handlers/chat.ts`).
- [x] **Setup Monorepo Bun** : Structure du projet migrée vers Bun workspaces.
- [x] **Backend Authentication** : JWT Auth implémenté sur Elysia avec `auth.routes.ts`.
- [x] **Structure Base de Données** : Package `@vext/database` partagé créé.
- [x] **Documentation & Outils** : README, CONTRIBUTING, Templates Issues, et CI/CD (GitHub Actions).
