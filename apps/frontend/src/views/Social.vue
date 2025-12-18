<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFriendsStore } from '../stores/friendsStore'
import { useToastStore } from '../stores/toastStore'
import UserAutocomplete from '../components/UserAutocomplete.vue'

const friendsStore = useFriendsStore()
const toastStore = useToastStore()
const activeTab = ref('friends') // 'friends', 'requests', 'groups', 'add_friend'
const searchQuery = ref('')
const addFriendQuery = ref('')
const isSearching = ref(false)

onMounted(async () => {
  await friendsStore.fetchFriends()
  await friendsStore.fetchFriendRequests()
})

const handleAccept = async (requestId: string) => {
  try {
    await friendsStore.acceptFriendRequest(requestId)
    toastStore.success('Friend request accepted')
  } catch (e) {
    toastStore.error('Error accepting request')
  }
}

const handleReject = async (requestId: string) => {
  try {
    await friendsStore.rejectFriendRequest(requestId)
    toastStore.info('Friend request rejected')
  } catch (e) {
    toastStore.error('Error rejecting request')
  }
}

const handleAddFriend = async () => {
  if (!addFriendQuery.value.trim()) return
  
  isSearching.value = true
  try {
    await friendsStore.sendFriendRequest(addFriendQuery.value)
    toastStore.success(`Friend request sent to ${addFriendQuery.value}`)
    addFriendQuery.value = ''
  } catch (e: any) {
    toastStore.error(e.message || 'Failed to send friend request')
  } finally {
    isSearching.value = false
  }
}
</script>

<template>
  <div class="social-container">
    <!-- Background Glows -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <div class="social-layout">
      
      <!-- Left Panel: Navigation & Lists -->
      <div class="glass-panel sidebar">
        <div class="panel-header">
          <h2>Social Hub</h2>
          <div class="user-status-toggle">
            <div class="status-dot online"></div>
            <span>Online</span>
            <i class="fas fa-chevron-down"></i>
          </div>
        </div>

        <div class="nav-tabs">
          <button :class="{ active: activeTab === 'friends' }" @click="activeTab = 'friends'">
            <i class="fas fa-user-friends"></i> Friends
            <span class="badge">{{ friendsStore.friends.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'requests' }" @click="activeTab = 'requests'">
            <i class="fas fa-user-plus"></i> Requests
            <span v-if="friendsStore.friendRequests.length > 0" class="badge alert">{{ friendsStore.friendRequests.length }}</span>
          </button>
          <button :class="{ active: activeTab === 'groups' }" @click="activeTab = 'groups'">
            <i class="fas fa-users"></i> Groups
          </button>
          <button :class="{ active: activeTab === 'add_friend' }" @click="activeTab = 'add_friend'">
            <i class="fas fa-search-plus"></i> Add
          </button>
        </div>

        <div class="search-box" v-if="activeTab !== 'add_friend'">
          <i class="fas fa-search"></i>
          <input v-model="searchQuery" placeholder="Filter...">
        </div>

        <div class="list-content">
          <!-- Friends List -->
          <div v-if="activeTab === 'friends'" class="friends-list">
            <div v-if="friendsStore.friends.length === 0" class="empty-state">
              <i class="fas fa-user-friends"></i>
              <p>No friends yet</p>
              <p class="hint-text">Add friends to see them here</p>
            </div>
            <div v-for="friend in friendsStore.friends" :key="friend.id" class="list-item">
              <div class="avatar-wrapper">
                <img :src="friend.profile_pic || '/default-avatar.svg'" alt="Avatar">
                <div class="status-indicator" :class="friend.status"></div>
              </div>
              <div class="item-info">
                <div class="item-name">{{ friend.username }}</div>
                <div class="item-status">{{ friend.status }}</div>
              </div>
              <div class="item-actions">
                <button class="btn-icon" title="Message"><i class="fas fa-comment-alt"></i></button>
                <button class="btn-icon" title="Invite"><i class="fas fa-gamepad"></i></button>
              </div>
            </div>
          </div>

          <!-- Requests List -->
          <div v-if="activeTab === 'requests'" class="requests-list">
            <div v-if="friendsStore.friendRequests.length === 0" class="empty-state">
              No pending requests
            </div>
            <div v-for="req in friendsStore.friendRequests" :key="req.request_id" class="list-item request-item">
              <img :src="req.profile_pic || 'https://via.placeholder.com/40'" class="avatar-sm">
              <div class="item-info">
                <div class="item-name">{{ req.username }}</div>
                <div class="item-status">Wants to be friends</div>
              </div>
              <div class="req-actions">
                <button @click="handleAccept(req.request_id)" class="btn-accept"><i class="fas fa-check"></i></button>
                <button @click="handleReject(req.request_id)" class="btn-reject"><i class="fas fa-times"></i></button>
              </div>
            </div>
          </div>

          <!-- Groups Placeholder -->
          <div v-if="activeTab === 'groups'" class="empty-state">
            <i class="fas fa-users-slash"></i>
            <p>No groups joined yet.</p>
            <button class="btn-neon-sm">Discover Groups</button>
          </div>

          <!-- Add Friend Tab -->
          <div v-if="activeTab === 'add_friend'" class="add-friend-section">
            <div class="search-box-large">
              <UserAutocomplete
                v-model="addFriendQuery"
                placeholder="Enter username#1234"
                @select="handleAddFriend"
                class="social-autocomplete"
              >
                  <template #prefix-icon>
                      <!-- Intentionally left blank or can add icon if needed inside component via slot or keep outside -->
                  </template>
              </UserAutocomplete>
              <button @click="handleAddFriend" :disabled="isSearching" class="btn-neon-sm">
                <i class="fas fa-paper-plane" v-if="!isSearching"></i>
                <i class="fas fa-spinner fa-spin" v-else></i>
              </button>
            </div>
            <p class="hint-text">Enter the full username with discriminator (e.g., User#1234) to send a friend request.</p>
          </div>
        </div>
      </div>

      <!-- Right Panel: Chat / Activity -->
      <div class="glass-panel main-panel">
        <div class="empty-chat-state">
          <div class="icon-circle">
            <i class="fas fa-comments"></i>
          </div>
          <h2>Select a conversation</h2>
          <p>Choose a friend from the list to start chatting or invite them to a game.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Variables */
:root {
  --neon-pink: #ff7eb3;
  --neon-cyan: #7afcff;
  --neon-pink: #ff7eb3;
  --neon-cyan: #7afcff;
  --glass-bg: var(--glass-bg);
}

.social-container {
  height: 100%; 
  width: 100%;
  position: relative; 
  overflow: hidden;
  background-color: transparent; /* Use global background */
  color: var(--text-primary);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* Local glows removed in favor of global MainLayout glows */

.social-layout {
  display: grid; 
  grid-template-columns: 400px 1fr; 
  gap: 24px;
  flex: 1;
  min-height: 0; /* Important for nested flex scrolling */
  position: relative; 
  z-index: 1;
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  overflow: hidden;
  display: flex; flex-direction: column;
}

/* Sidebar */
.panel-header {
  padding: 24px; border-bottom: 1px solid var(--glass-border);
  display: flex; justify-content: space-between; align-items: center;
}
.panel-header h2 { margin: 0; font-size: 1.4rem; }

.user-status-toggle {
  display: flex; align-items: center; gap: 8px;
  background: var(--glass-border); padding: 6px 12px; border-radius: 20px;
  font-size: 0.85rem; cursor: pointer;
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #555; }
.status-dot.online { background: #00ff00; box-shadow: 0 0 8px #00ff00; }

.nav-tabs {
  display: flex; padding: 16px 16px 0; gap: 6px;
  border-bottom: 1px solid var(--glass-border);
  overflow-x: auto;
  flex-wrap: nowrap;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
.nav-tabs::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
.nav-tabs button {
  background: none; border: none; color: var(--text-secondary);
  padding: 0 8px 16px; font-weight: 600; cursor: pointer;
  position: relative; display: flex; align-items: center; gap: 6px;
  white-space: nowrap; flex-shrink: 0; font-size: 0.85rem;
}
.nav-tabs button.active { color: #ff7eb3; }
.nav-tabs button.active::after {
  content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
  background: #ff7eb3; box-shadow: 0 0 10px #ff7eb3;
}

.badge {
  background: rgba(255,255,255,0.1); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;
}
.badge.alert { background: #ff7eb3; color: white; }

.search-box {
  margin: 20px 24px; position: relative;
}
.search-box input {
  width: 100%; padding: 10px 10px 10px 35px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: 8px; color: var(--text-primary);
}
.search-box i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #555; }

.list-content { flex: 1; overflow-y: auto; padding: 0 16px; }

.list-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: 12px;
  transition: background 0.2s; margin-bottom: 4px;
}
.list-item:hover { background: var(--glass-border); }

.avatar-wrapper { position: relative; width: 42px; height: 42px; }
.avatar-wrapper img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.status-indicator {
  position: absolute; bottom: 0; right: 0; width: 10px; height: 10px;
  border-radius: 50%; border: 2px solid #1e1928;
}
.status-indicator.online { background: #00ff00; }
.status-indicator.offline { background: #555; }
.status-indicator.in-game { background: #ff7eb3; }

.item-info { flex: 1; overflow: hidden; }
.item-name { font-weight: 600; font-size: 0.95rem; }
.item-status { font-size: 0.8rem; color: #777; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.item-actions { display: flex; gap: 8px; opacity: 0; transition: opacity 0.2s; }
.list-item:hover .item-actions { opacity: 1; }

.btn-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--glass-border); border: none; color: var(--text-primary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.btn-icon:hover { background: #ff7eb3; }

/* Requests */
.avatar-sm { width: 36px; height: 36px; border-radius: 50%; }
.req-actions { display: flex; gap: 8px; }
.btn-accept {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: rgba(0, 255, 0, 0.2); color: #00ff00; cursor: pointer;
}
.btn-accept:hover { background: #00ff00; color: black; }
.btn-reject {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: rgba(255, 0, 0, 0.2); color: #ff4d4d; cursor: pointer;
}
.btn-reject:hover { background: #ff4d4d; color: white; }

/* Empty States */
.empty-state {
  text-align: center; padding: 40px 20px; color: #777;
  display: flex; flex-direction: column; align-items: center; gap: 15px;
}
.empty-state i { font-size: 2rem; opacity: 0.5; }
.btn-neon-sm {
  background: #ff7eb3; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer;
}

/* Main Panel */
.main-panel {
  align-items: center; justify-content: center; text-align: center;
}
.empty-chat-state { max-width: 400px; color: var(--text-secondary); }
.icon-circle {
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 24px;
}
.icon-circle i { font-size: 2.5rem; color: #ff7eb3; }
.empty-chat-state h2 { color: var(--text-primary); margin-bottom: 10px; }
.add-friend-section {
  padding: 20px 0;
  display: flex; flex-direction: column; gap: 15px;
}
.search-box-large {
  display: flex; gap: 10px;
}
.social-autocomplete {
    flex: 1;
}
:deep(.autocomplete-input) {
  width: 100%; padding: 12px;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: 8px; color: var(--text-primary);
}
.hint-text {
  font-size: 0.85rem; color: #777; text-align: center;
}

</style>
