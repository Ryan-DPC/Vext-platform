# VEXT Platform - Flow Analysis Complète

## 🔐 Flow 1: LOGIN / AUTHENTIFICATION

### Action Utilisateur: Clic sur "Login"
```
1. UI: apps/frontend/src/views/Login.vue
   - Formulaire email/password
   - @submit → handleLogin()

2. Frontend Service: authService.login(email, password)
   - File: apps/frontend/src/services/auth.service.ts
   - Appelle: POST /api/auth/login

3. Backend Route: apps/backend/src/features/auth/auth.routes.ts
   - POST /api/auth/login
   - Handler: AuthService.login()

4. Backend Service: apps/backend/src/features/auth/auth.service.ts
   - Vérifie password (bcrypt)
   - Génère JWT token
   - Return: { token, user }

5. Frontend Reception:
   - Stocke token: localStorage.setItem('token', token)
   - Store Pinia: userStore.setUser(user)
   - Router push: router.push('/home')

6. WebSocket Connection:
   - socketService.connect(token)
   - WS URL: ws://localhost:3000/ws?token=...
   - Backend WS: index.ts .ws('/ws') → Auth via query param
```

**✅ STATUS**: Complet  
**⚠️ MANQUE**: Rien


---

## 🎮 Flow 2: LANCER UN JEU

### Action Utilisateur: Double-clic sur un jeu dans la bibliothèque
```
1. UI: apps/frontend/src/views/Library.vue
   - @dblclick → launchGame(gameId)

2. Frontend Service: statsService.startSession(gameId)
   - File: apps/frontend/src/services/stats.service.ts
   - Appelle: POST /api/stats/session/start

3. Backend Route: apps/backend/src/features/stats/stats.routes.ts
   - POST /api/stats/session/start (PROTECTED)
   - Handler: statsService.createSession()

4. Backend Service: apps/backend/src/features/stats/stats.service.ts
   - Create session in DB (session_id)
   - Return: { sessionId }

5. Frontend Reception:
   - Stocke: this.currentSessionId = sessionId
   - ⚠️ APPELLE: socketService.updateStatus('in-game', sessionId)
   
6. WebSocket Emit:
   - File: apps/frontend/src/services/socket.ts
   - emit('user:status-update', { status: 'in-game', lobbyId: sessionId })

7. Backend WS Handler: apps/backend/src/index.ts
   - type === 'user:status-update'
   - Get friends: FriendsService.getFriends(userId)
   - For each friend → ws.publish(`user:${friendId}`, 'friend:status-changed')

8. Frontend WS Reception (chez l'ami):
   - socket.on('friend:status-changed', ...)
   - friendsStore.updateFriendStatus(data.userId, data.status)

9. Tauri Launch:
   - tauriAPI.launchGame(gameId, token, username)
   - Spawn subprocess du jeu
   - Listen: tauriAPI.onGameExited()

10. Fin du jeu:
    - statsService.endSession(sessionId)
    - POST /api/stats/session/end
    - socketService.updateStatus('online')
```

**✅ STATUS**: Complet (après mon ajout du WS handler)  
**⚠️ MANQUE**: Rien


---

## 👥 Flow 3: AJOUTER UN AMI

### Action Utilisateur: Recherche et ajout via Social Hub
```
1. UI: apps/frontend/src/views/Social.vue
   - Tab "Add Friend"
   - Input: addFriendQuery (username#1234)
   - @click → handleAddFriend()

2. Frontend Service: friendsStore.sendFriendRequest(username)
   - File: apps/frontend/src/stores/friendsStore.ts
   - Appelle: POST /api/friends/request

3. Backend Route: apps/backend/src/features/friends/friends.routes.ts
   - POST /api/friends/request (PROTECTED)
   - Body: { username }
   - Handler: FriendsService.sendRequest()

4. Backend Service: apps/backend/src/features/friends/friends.service.ts
   - Find user by username
   - Create friend request in DB
   - ❌ MANQUE: Notification WebSocket à la cible

5. Frontend Reception (émetteur):
   - Toast: "Friend request sent"
   - Refresh friends list (polling?)

6. Frontend Reception (récepteur):
   - ❌ MANQUE: WebSocket event 'friend:request-received'
   - ❌ MANQUE: Notification dans le Social Hub
```

**❌ STATUS**: Incomplet  
**⚠️ MANQUE**: 
- Backend ne notifie pas par WS quand une demande arrive
- Frontend écoute `friend:request-sent` mais Backend ne l'envoie pas


---

## 💬 Flow 4: ENVOYER UN MESSAGE PRIVÉ

### Action Utilisateur: Clic sur "Message" dans Social Hub
```
1. UI: apps/frontend/src/views/Social.vue
   - @click → openChat(friendId)
   - Change activeFriend + charge messages

2. Charger conversation:
   - loadPrivateMessages(friendId)
   - GET /api/chat/conversation/:friendId

3. Backend Route: apps/backend/src/features/chat/chat.routes.ts
   - GET /api/chat/conversation/:otherUserId (PROTECTED)
   - Handler: ChatService.getConversation()

4. Backend Service: apps/backend/src/features/chat/chat.service.ts
   - Query DB: messages entre user et otherUser
   - Return: { messages: [...] }

5. Envoyer message:
   - sendPrivateMessage()
   - Optimistic UI: push message localement
   - socketService.sendChatMessage(friendId, content)

6. WebSocket Emit:
   - emit('chat:send-message', { toUserId, content })

7. Backend WS Handler:
   - ❌ MANQUE: Handler pour 'chat:send-message'
   - Actuellement: Unhandled message type

8. Alternative HTTP:
   - POST /api/chat/send
   - Backend: ChatService.sendMessage()
   - Save to DB
   - ❌ MANQUE: WebSocket publish à l'autre user
```

**❌ STATUS**: Partiellement fonctionnel (HTTP seulement, pas temps réel)  
**⚠️ MANQUE**:
- Backend WS ne gère pas `chat:send-message`
- Pas de broadcast temps réel des messages privés


---

## 🌐 Flow 5: CRÉER UN SERVEUR MULTIJOUEUR (Aether Strike)

### Action Utilisateur: Dans le jeu, clic sur "CREATE SERVER"
```
1. UI: games/aether_strike/src/main.rs
   - GameScreen::CreateServer
   - Input: server_name, is_private, password
   - confirm_create_button.is_clicked()

2. Game Network Call:
   - network_api::announce_server(name, username, max_players, ...)
   - File: games/aether_strike/src/network_api.rs
   - POST http://localhost:3000/api/lobby/multiplayer/announce
   - Body: { hostUsername, name, ip, port, maxPlayers, ... }

3. Backend Route: apps/backend/src/features/lobby/lobby.routes.ts
   - POST /api/lobby/multiplayer/announce
   - ❌ MANQUE: Authentication (actuellement public)
   - Handler: lobbyService.createMultiplayerLobby()

4. Backend Service: apps/backend/src/features/lobby/lobby.service.ts
   - Store in-memory: multiplayerLobbies[id] = lobby
   - Return: { id, ...lobby }

5. Game Reception:
   - println!("Server announced")
   - Transition to Lobby screen
```

**⚠️ STATUS**: Fonctionne mais pas sécurisé  
**⚠️ MANQUE**:
- Pas d'auth (n'importe qui peut créer fake servers)
- Pas de cleanup automatique (serveurs zombies)
- IP hardcodée à 127.0.0.1 (pas utile pour multi-PC)


---

## 🔍 Flow 6: LISTER LES SERVEURS MULTIJOUEUR

### Action Utilisateur: Clic "REFRESH" dans Session List
```
1. UI: games/aether_strike/src/main.rs
   - GameScreen::SessionList
   - refresh_button.is_clicked()
   - network_api::fetch_server_list()

2. Game Network Call:
   - File: games/aether_strike/src/network_api.rs
   - GET http://localhost:3000/api/lobby/multiplayer/list

3. Backend Route: apps/backend/src/features/lobby/lobby.routes.ts
   - GET /api/lobby/multiplayer/list (PUBLIC)
   - Handler: lobbyService.getMultiplayerLobbies()

4. Backend Service:
   - Return: Object.values(multiplayerLobbies)

5. Game Reception:
   - Parse Vec<MultiplayerLobby>
   - Map to SessionButton
   - Update sessions list UI
```

**✅ STATUS**: Complet  
**⚠️ MANQUE**: Rien (mais voir problème URL dans flow 5)


---

## 👤 Flow 7: VOIR STATUT DES AMIS

### Action Utilisateur: Ouvre Social Hub
```
1. UI: apps/frontend/src/views/Social.vue
   - onMounted → friendsStore.fetchFriends()

2. Frontend Service:
   - GET /api/friends/list

3. Backend Route: apps/backend/src/features/friends/friends.routes.ts
   - GET /api/friends/list (PROTECTED)
   - Handler: FriendsService.getFriends()

4. Backend Service:
   - Query DB: friends where user_id = currentUser
   - For each friend: lookup current status (from session?)
   - ❌ MANQUE: Status vient de session DB, pas de l'état WS actuel
   - Return: [{ id, username, status, profile_pic }]

5. Update temps réel:
   - WebSocket: friend:status-changed
   - friendsStore.updateFriendStatus(userId, status)
```

**⚠️ STATUS**: Fonctionne avec mon fix WS, MAIS:  
**⚠️ MANQUE**:
- Status initial vient de DB (potentiellement stale)
- Pas de "heartbeat" pour détecter déconnexions
- Si Backend redémarre, tous les status sont perdus


---

## 🎯 Flow 8: ACCEPTER DEMANDE D'AMI

### Action Utilisateur: Clic "Accept" dans Requests tab
```
1. UI: apps/frontend/src/views/Social.vue
   - @click → handleAccept(requestId)

2. Frontend Service:
   - friendsStore.acceptFriendRequest(requestId)
   - POST /api/friends/accept

3. Backend Route: apps/backend/src/features/friends/friends.routes.ts
   - POST /api/friends/accept (PROTECTED)
   - Handler: FriendsService.acceptRequest()

4. Backend Service:
   - Update request status = 'accepted'
   - Create bidirectional friendship
   - ❌ MANQUE: Notify other user via WebSocket

5. Frontend Reception (émetteur):
   - Refresh friends list
   - Toast: "Accepted"

6. Frontend Reception (autre user):
   - ❌ MANQUE: Notification temps réel
```

**❌ STATUS**: HTTP fonctionne, pas de notif temps réel  
**⚠️ MANQUE**: WebSocket notification


---

## 📊 RÉSUMÉ DES PROBLÈMES

### 🔴 CRITIQUES (Bloquants)
1. **Chat privé temps réel**: Backend WS ne gère pas `chat:send-message`
2. **Notifications d'amis**: Pas de WS pour demandes/acceptations

### 🟡 IMPORTANTS (Fonctionnent mais incomplets)
3. **Serveur multijoueur**: Pas d'auth, IP hardcodée, pas de cleanup
4. **Status amis**: Dépend de DB stale, pas de heartbeat

### 🟢 FONCTIONNELS
- Login/Auth ✅
- Lancer jeu + Status update ✅ (après mon fix)
- Lister serveurs multi ✅
- Chercher/Ajouter ami (HTTP) ✅


---

## 🔧 CORRECTIONS À FAIRE

### 1. Ajouter handler chat temps réel au Backend
```typescript
// Dans index.ts, handler WS
if (type === 'chat:send-message') {
  const { toUserId, content } = data;
  
  // Save to DB
  await ChatService.sendMessage(ws.data.userId, toUserId, content);
  
  // Notify recipient
  ws.publish(`user:${toUserId}`, JSON.stringify({
    type: 'chat:new-message',
    data: {
      from_user_id: ws.data.userId,
      content,
      created_at: new Date()
    }
  }));
}
```

### 2. Ajouter notifications amis
```typescript
// Dans FriendsService.sendRequest()
// Après création de la request en DB:
WebSocketService.publish(`user:${targetUserId}`, 'friend:request-received', {
  from: requesterUser,
  requestId
});

// Dans FriendsService.acceptRequest()
// Après acceptation:
WebSocketService.publish(`user:${requesterId}`, 'friend:request-accepted', {
  user: accepterUser
});
```

### 3. Fix serveur multi (IP + Auth)
```rust
// Dans network_api.rs
// Détecter IP locale LAN au lieu de 127.0.0.1
```

### 4. Cleanup serveurs zombies
```typescript
// Dans lobby.service.ts
// Ajouter TTL et cleanup job
setInterval(() => {
  const now = Date.now();
  for (const [id, lobby] of Object.entries(multiplayerLobbies)) {
    if (now - lobby.createdAt > 3600000) { // 1h
      delete multiplayerLobbies[id];
    }
  }
}, 300000); // Check every 5min
```
