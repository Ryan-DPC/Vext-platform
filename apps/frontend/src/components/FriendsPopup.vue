<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFriendsStore } from '../stores/friendsStore'
import { useLobbyStore } from '../stores/lobbyStore'
import { socketService } from '../services/socket'
import { RouterLink } from 'vue-router'

const friendsStore = useFriendsStore()
const lobbyStore = useLobbyStore()

const activeTab = ref<'friends' | 'requests'>('friends')
const newFriendUsername = ref('')
const isAddingFriend = ref(false)
const errorMessage = ref('')

// New state for toggles
const showAddFriendInput = ref(false)
const showFilterMenu = ref(false)
const currentFilter = ref<'all' | 'online' | 'in-game'>('all')

onMounted(async () => {
  await friendsStore.fetchFriends()
  await friendsStore.fetchFriendRequests()
})

const filteredFriends = computed(() => {
  let friends = friendsStore.friends
  
  if (currentFilter.value === 'online') {
    friends = friends.filter(f => f.status === 'online' || f.status === 'in-game')
  } else if (currentFilter.value === 'in-game') {
    friends = friends.filter(f => f.status === 'in-game')
  }
  
  return friends
})

const toggleAddFriend = () => {
  showAddFriendInput.value = !showAddFriendInput.value
  if (showAddFriendInput.value) {
    showFilterMenu.value = false // Close other menu
    setTimeout(() => document.getElementById('friend-input')?.focus(), 100)
  }
}

const toggleFilterMenu = () => {
  showFilterMenu.value = !showFilterMenu.value
  if (showFilterMenu.value) {
    showAddFriendInput.value = false // Close other menu
  }
}

const setFilter = (filter: 'all' | 'online' | 'in-game') => {
  currentFilter.value = filter
  showFilterMenu.value = false
}

async function addFriend() {
  if (!newFriendUsername.value.trim()) return
  
  isAddingFriend.value = true
  errorMessage.value = ''
  
  try {
    await friendsStore.sendFriendRequest(newFriendUsername.value.trim())
    newFriendUsername.value = ''
    alert('Demande d\'ami envoyée !')
    showAddFriendInput.value = false
  } catch (error: any) {
    errorMessage.value = error.message || 'Erreur lors de l\'envoi'
  } finally {
    isAddingFriend.value = false
  }
}

async function acceptRequest(requestId: string) {
  try {
    await friendsStore.acceptFriendRequest(requestId)
  } catch (error) {
    alert('Erreur lors de l\'acceptation')
  }
}

async function rejectRequest(requestId: string) {
  try {
    await friendsStore.rejectFriendRequest(requestId)
  } catch (error) {
    alert('Erreur lors du refus')
  }
}

async function removeFriend(friendId: string, friendName: string) {
  if (confirm(`Supprimer ${friendName} de vos amis ?`)) {
    try {
      await friendsStore.removeFriend(friendId)
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }
}

function joinLobby(lobbyId: string) {
  if (!lobbyId) return
  lobbyStore.joinLobby(lobbyId)
}

function inviteToLobby(friendId: string) {
  if (!lobbyStore.currentLobby) return
  socketService.sendLobbyInvite(friendId, lobbyStore.currentLobby.id)
  alert('Invitation envoyée !')
}

function getStatusColor(status: string) {
  switch (status) {
    case 'online': return '#00ff00'
    case 'in-game': return '#ffa500'
    case 'offline': return '#808080'
    default: return '#808080'
  }
}

function closePopup() {
  friendsStore.togglePopup()
}
</script>

<template>
  <div v-if="friendsStore.isPopupOpen" class="friends-popup-overlay" @click.self="closePopup">
    <div class="friends-popup">
      <!-- Header -->
      <div class="popup-header">
        <h2>Social</h2>
        <div class="header-actions">
          <button 
            class="icon-btn" 
            :class="{ active: showAddFriendInput }"
            @click="toggleAddFriend" 
            title="Ajouter un ami"
          >
            <i class="fas fa-user-plus"></i>
          </button>
          <button 
            class="icon-btn" 
            :class="{ active: showFilterMenu }"
            @click="toggleFilterMenu" 
            title="Filtrer"
          >
            <i class="fas fa-cog"></i> <!-- Using cog as requested for settings/filter -->
          </button>
        </div>
      </div>

      <!-- Add Friend Input (Collapsible) -->
      <div v-if="showAddFriendInput" class="collapsible-section">
        <div class="add-friend-form">
          <input 
            id="friend-input"
            v-model="newFriendUsername" 
            type="text" 
            placeholder="Pseudo..."
            @keyup.enter="addFriend"
            class="neon-input"
          >
          <button @click="addFriend" :disabled="isAddingFriend" class="neon-btn-small">
            OK
          </button>
        </div>
        <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
      </div>

      <!-- Filter Menu (Collapsible) -->
      <div v-if="showFilterMenu" class="collapsible-section">
        <div class="filter-options">
          <button 
            :class="['filter-btn', { active: currentFilter === 'all' }]" 
            @click="setFilter('all')"
          >
            Tous
          </button>
          <button 
            :class="['filter-btn', { active: currentFilter === 'online' }]" 
            @click="setFilter('online')"
          >
            En ligne
          </button>
          <button 
            :class="['filter-btn', { active: currentFilter === 'in-game' }]" 
            @click="setFilter('in-game')"
          >
            En jeu
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'friends' }]" 
          @click="activeTab = 'friends'"
        >
          Amis ({{ friendsStore.friends.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'requests' }]" 
          @click="activeTab = 'requests'"
        >
          Demandes ({{ friendsStore.friendRequests.length }})
        </button>
      </div>

      <!-- Friends List Tab -->
      <div v-if="activeTab === 'friends'" class="content-section">
        <div v-if="friendsStore.friends.length === 0" class="empty-state">
          Aucun ami pour l'instant
        </div>
        <div v-else class="friends-list">
          <div 
            v-for="friend in filteredFriends" 
            :key="friend.id" 
            class="friend-item"
          >
            <div class="friend-info">
              <div class="friend-avatar">
                <img :src="friend.profile_pic || '/assets/images/default-game.svg'" :alt="friend.username">
                <span 
                  class="status-dot" 
                  :style="{ backgroundColor: getStatusColor(friend.status) }"
                ></span>
              </div>
              <div class="friend-details">
                <div class="friend-name">{{ friend.username }}</div>
                <div class="friend-status">
                  {{ friend.status === 'in-game' ? '🎮 En jeu' : friend.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne' }}
                </div>
              </div>
            </div>
            
            <div class="friend-actions">
              <button 
                v-if="friend.status === 'in-game' && friend.currentLobby"
                @click="joinLobby(friend.currentLobby)" 
                class="action-btn join-btn"
                title="Rejoindre la partie"
              >
                🎮
              </button>
              <button 
                v-if="lobbyStore.isInLobby && friend.status === 'online'"
                @click="inviteToLobby(friend.id)" 
                class="action-btn invite-btn"
                title="Inviter au lobby"
              >
                📨
              </button>
              <RouterLink 
                :to="`/chat/${friend.id}`" 
                class="action-btn chat-btn"
                title="Ouvrir le chat"
                @click="friendsStore.togglePopup()"
              >
                💬
              </RouterLink>
              <button 
                @click="removeFriend(friend.id, friend.username)" 
                class="action-btn remove-btn"
                title="Retirer des amis"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Friend Requests Tab -->
      <div v-if="activeTab === 'requests'" class="content-section">
        <div v-if="friendsStore.friendRequests.length === 0" class="empty-state">
          Aucune demande en attente
        </div>
        <div v-else class="requests-list">
          <div 
            v-for="request in friendsStore.friendRequests" 
            :key="request.request_id" 
            class="request-item"
          >
            <RouterLink :to="`/profile/${request.user_id}`" class="request-link" @click="friendsStore.togglePopup()">
              <img 
                :src="request.profile_pic || '/assets/images/default-game.svg'" 
                :alt="request.username"
                class="request-avatar"
              >
              <div class="request-info">
                <div class="request-username">{{ request.username }}</div>
                <div class="request-date">Demande d'ami</div>
              </div>
            </RouterLink>
            <div class="request-actions">
              <button @click="acceptRequest(request.request_id)" class="accept-btn" title="Accepter">✓</button>
              <button @click="rejectRequest(request.request_id)" class="reject-btn" title="Refuser">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.friends-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  z-index: 9999;
  padding: 80px 20px 20px;
}

.friends-popup {
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 350px;
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.popup-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #999;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  padding: 5px;
  border-radius: 4px;
}

.icon-btn:hover, .icon-btn.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.collapsible-section {
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  animation: expand 0.2s ease-out;
}

@keyframes expand {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.add-friend-form {
  display: flex;
  gap: 10px;
}

.neon-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: #fff;
  outline: none;
  transition: border-color 0.2s;
}

.neon-input:focus {
  border-color: #7afcff;
}

.neon-btn-small {
  background: #7afcff;
  color: #000;
  border: none;
  border-radius: 6px;
  padding: 0 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.neon-btn-small:hover {
  background: #fff;
}

.filter-options {
  display: flex;
  gap: 8px;
}

.filter-btn {
  flex: 1;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #999;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.filter-btn.active {
  background: rgba(122, 252, 255, 0.1);
  border-color: #7afcff;
  color: #7afcff;
}

.tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #7afcff;
  border-bottom-color: #7afcff;
}

.content-section {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.friends-list, .requests-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  transition: background 0.2s;
}

.friend-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.friend-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.friend-avatar {
  position: relative;
  width: 36px;
  height: 36px;
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #1a1a1a;
}

.friend-details {
  display: flex;
  flex-direction: column;
}

.friend-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.friend-status {
  font-size: 11px;
  color: #999;
}

.friend-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #fff;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.error-msg {
  color: #ff4444;
  font-size: 12px;
  padding: 0 15px 10px;
  margin: 0;
}

/* Request Item Styles */
.request-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.request-link {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  text-decoration: none;
  color: inherit;
}

.request-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.request-username {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.request-date {
  font-size: 11px;
  color: #999;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.accept-btn, .reject-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.accept-btn {
  background: rgba(0, 170, 0, 0.2);
  color: #00ff00;
}

.accept-btn:hover {
  background: rgba(0, 170, 0, 0.4);
}

.reject-btn {
  background: rgba(170, 0, 0, 0.2);
  color: #ff4444;
}

.reject-btn:hover {
  background: rgba(170, 0, 0, 0.4);
}
</style>
