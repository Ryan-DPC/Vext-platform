# Reste à faire pour finaliser la migration

## 1. Validation Fonctionnelle (Testing)
- [ ] **Chat** : Envoyer et recevoir des messages (Global & Privé).
- [ ] **Amis** : Vérifier la mise à jour du statut (En ligne / Hors ligne) en temps réel.
- [ ] **Lobby / Jeu** :
    - [ ] Créer une partie.
    - [ ] Rejoindre une partie via code.
    - [ ] Vérifier la synchronisation du jeu (Stick Arena).
- [ ] **Transactions** : Confirmer l'achat d'un jeu et la mise à jour du solde.

## 2. Nettoyage du Code (Cleanup)
- [ ] **Backend (`apps/backend-elysia`)** : Supprimer l'ancien code WebSocket (routes `/ws`, fichiers dans `features/ws`) devenu obsolète.
- [ ] **Frontend** : Supprimer la dépendance `socket.io-client` si elle n'est plus utilisée.

## 3. Déploiement & Production (Render)
- [ ] **Variables d'environnement** : Vérifier que `vext-ws-server` a accès à `JWT_SECRET`, `MONGO_URI`, etc.
- [ ] **Monitoring** : Vérifier les logs du serveur pour confirmer le bon démarrage des Jobs (Version Checker).

## 4. Documentation
- [ ] Mettre à jour le README pour expliquer la séparation API REST / Serveur WebSocket.
