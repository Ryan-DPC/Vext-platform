<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useItemStore } from '../stores/itemStore'
import { useLayoutStore } from '../stores/layoutStore'
import axios from 'axios'
// import defaultGameImg from '@/assets/images/default-game.svg'
import { getApiUrl } from '../utils/url';
const defaultGameImg = `${getApiUrl()}/public/default-game.svg`;

const userStore = useUserStore()
const itemStore = useItemStore()
const layoutStore = useLayoutStore()

const activeTab = ref('profile') // 'profile' or 'inventory'
const typeFilter = ref('')
const profileLoaded = ref(false)

// Import Service & Components
import StatsChart from '../components/StatsChart.vue';
import { statsService } from '../services/stats.service';

const globalStats = ref<any>(null);
const friends = ref<any[]>([])
const recentGames = ref<any[]>([])

const fetchFriends = async () => {
  try {
    const response = await axios.get('/friends/list')
    friends.value = response.data.friends || []
  } catch (error) { console.error('Failed to fetch friends') }
}

const fetchRecentGames = async () => {
  try {
    const response = await axios.get('/users/recent-games')
    recentGames.value = response.data.games || []
  } catch (error) { console.error('Failed to fetch recent games') }
}

const fetchGlobalStats = async () => {
    globalStats.value = await statsService.getGlobalStats();
}


const isOwnProfile = computed(() => true)

const fileInput = ref<HTMLInputElement | null>(null)
const triggerFileInput = () => fileInput.value?.click()

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('avatar', file as Blob)

  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (userStore.user && e.target?.result) userStore.user.profile_pic = e.target.result as string
    }
    reader.readAsDataURL(file)
    const response = await axios.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (response.data.success) userStore.user.profile_pic = response.data.profile_pic
  } catch (error) {
    console.error('Upload failed:', error)
    await userStore.fetchProfile()
  }
}

const badges = computed(() => {
  return itemStore.myItems
    .filter((i: any) => i.item?.item_type === 'badge' && i.is_equipped)
    .map((i: any) => i.item)
})

const equippedBanner = computed(() => {
  const equipped = itemStore.myItems.find((i: any) => i.item?.item_type === 'banner' && i.is_equipped)
  return equipped?.item?.image_url || null
})

const equippedFrame = computed(() => {
  const equipped = itemStore.myItems.find((i: any) => i.item?.item_type === 'avatar_frame' && i.is_equipped)
  return equipped?.item?.image_url || null
})

const equippedBackground = computed(() => {
  const equipped = itemStore.myItems.find((i: any) => i.item?.item_type === 'background' && i.is_equipped)
  return equipped?.item?.image_url || null
})

const profilePicUrl = computed(() => {
    return userStore.user?.profile_pic || defaultGameImg
})

// Sync background with layout store
watch(equippedBackground, (newVal) => {
  layoutStore.setBackground(newVal)
}, { immediate: true })

onUnmounted(() => {
  layoutStore.setBackground(null)
})

onMounted(async () => {
    // Parallel fetch for speed
  await Promise.all([
      userStore.fetchProfile(),
      itemStore.fetchMyItems(),
      fetchFriends(),
      fetchRecentGames(),
      fetchGlobalStats()
  ])
  profileLoaded.value = true
})

const filteredInventory = computed(() => {
  if (!typeFilter.value) return itemStore.myItems
  return itemStore.myItems.filter((item: any) => item.item?.item_type === typeFilter.value)
})

const equipItem = async (itemId: string) => {
  try {
    await itemStore.equipItem(itemId)
    // No reload needed, store updates automatically via fetchMyItems inside action
  } catch (error: any) { alert(error.response?.data?.message || 'Erreur') }
}

const unequipItem = async (itemId: string) => {
  try {
    await itemStore.unequipItem(itemId)
  } catch (error: any) { alert(error.response?.data?.message || 'Erreur') }
}


</script>

<template>
  <div class="cyber-profile-page" :class="{ 'has-global-bg': !!equippedBackground }">
    <!-- Cherry Blossom Background Effect (CSS only for now) -->
    <div class="cherry-blossoms" v-if="!equippedBackground"></div>

    <div class="cyber-container">
      
      <!-- HEADER SECTION -->
      <div class="cyber-header" :style="equippedBanner ? { backgroundImage: `url(${equippedBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
        <div class="header-overlay" v-if="equippedBanner"></div>
        <div class="header-content">
          <div class="avatar-section">
            <div class="cyber-avatar-wrapper">
                 <!-- Use v-show or opacity transition to prevent jump/flicker -->
                <div class="cyber-avatar" :class="{ 'has-frame': equippedFrame }" v-if="profileLoaded">
                    <img :src="profilePicUrl" class="avatar-img">
                    <img v-if="equippedFrame" :src="equippedFrame" class="avatar-frame-overlay">
                    <div class="avatar-glow" v-if="!equippedFrame"></div>
                    <div v-if="isOwnProfile" class="edit-overlay" @click="triggerFileInput">
                        <i class="fas fa-camera"></i>
                    </div>
                </div>
                <div class="cyber-avatar skeleton" v-else></div>
            </div>
            <input type="file" ref="fileInput" class="hidden-input" accept="image/*" @change="handleFileUpload">
          </div>

          <div class="user-info">
            <div class="name-row">
              <h1>{{ userStore.user?.username || 'User' }}</h1>
              <span class="status-indicator">▼</span>
            </div>
            <div class="status-text">
              <span class="online">Online</span>
              <span v-if="userStore.user?.status_message"> - {{ userStore.user?.status_message }}</span>
            </div>
          </div>

          <div class="level-section">
            <div class="level-badge">
              <span class="label">Level</span>
              <span class="value">{{ userStore.user?.level || 1 }}</span>
              <div class="xp-circle">XP</div>
            </div>
            <div class="header-actions">
              <button class="btn-cyber" @click="activeTab = 'profile'">Edit Profile</button>
              <button class="btn-cyber" @click="activeTab = 'inventory'">Inventory</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN GRID -->
      <div class="cyber-grid" v-if="activeTab === 'profile'">
        
        <!-- LEFT COLUMN (Main Content) -->
        <div class="main-col">
          
          <!-- Level & XP Bar -->
          <div class="cyber-panel level-panel">
            <div class="panel-header">
              <h3>Level & XP</h3>
            </div>
            <div class="xp-container">
              <div class="xp-bar">
                <div class="xp-fill" :style="{ width: ((userStore.user?.xp || 0) / 100) * 100 + '%' }"></div>
              </div>
              <div class="xp-stats">
                <span>{{ userStore.user?.xp || 0 }} XP</span>
                <span>{{ userStore.user?.xp || 0 }} / 100 XP</span>
              </div>
            </div>
          </div>

          <!-- Gaming Stats & Activity -->
          <div class="cyber-panel stats-panel" v-if="globalStats">
            <div class="panel-header">
              <h3>Gaming Statistics</h3>
            </div>
            <div class="stats-content">
                <div class="stat-row">
                    <div class="stat-item">
                        <span class="stat-label">Total Playtime</span>
                        <span class="stat-value">{{ globalStats.totalHours }}h</span>
                    </div>
                </div>
                <div class="chart-wrapper" v-if="globalStats.activityData">
                    <StatsChart :activityData="globalStats.activityData" />
                </div>
            </div>
          </div>

          <!-- Favorite Games -->
          <div class="cyber-panel favorites-panel">
            <div class="panel-header">
              <h3>Favorite Games</h3>
            </div>
            <div class="favorites-grid">
              <div 
                v-for="(game, index) in recentGames.slice(0,4)" 
                :key="index" 
                class="fav-game-card"
              >
                <img :src="game.game_id?.image_url || defaultGameImg">
                <div class="game-overlay">
                  <span>{{ game.game_name || game.game_id?.name }}</span>
                </div>
              </div>
              <div v-if="recentGames.length === 0" class="no-data-msg">
                No favorite games yet.
              </div>
            </div>
          </div>

          <!-- Recent Activity Feed -->
          <div class="cyber-panel feed-panel">
            <div class="panel-header">
              <h3>Recent Activity Feed</h3>
            </div>
            <div class="feed-list">
              <div class="feed-item" v-for="game in recentGames" :key="game._id">
                <div class="feed-avatar">
                  <img :src="userStore.user?.profile_pic || defaultGameImg">
                </div>
                <div class="feed-content">
                  <div class="feed-text">
                    <span class="user-link">{{ userStore.user?.username }}</span> 
                    bought 
                    <span class="game-link">{{ game.game_name || game.game_id?.name }}</span>
                  </div>
                  <div class="feed-media">
                    <img :src="game.game_id?.image_url || defaultGameImg">
                  </div>
                  <div class="feed-actions">
                    <i class="far fa-smile"></i>
                    <i class="far fa-comment"></i>
                    <i class="far fa-heart"></i>
                  </div>
                </div>
              </div>
              <div v-if="recentGames.length === 0" class="empty-feed">
                No recent activity.
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN (Sidebar) -->
        <div class="sidebar-col">
          
          <!-- Badges -->
          <div class="cyber-panel badges-panel">
            <div class="panel-header">
              <h3>Badges & Achievements</h3>
            </div>
            <div class="badges-row">
              <div v-for="badge in badges" :key="badge.id" class="badge-icon">
                <img :src="badge.image_url">
              </div>
              <div v-if="badges.length === 0" class="no-badges">No badges yet</div>
            </div>
          </div>

          <!-- Friends List -->
          <div class="cyber-panel friends-panel">
            <div class="panel-header">
              <h3>Friends List</h3>
            </div>
            <div class="friends-list">
              <div v-for="friend in friends" :key="friend.id" class="friend-item">
                <img :src="friend.profile_pic || defaultGameImg" class="friend-pic">
                <div class="friend-info">
                  <span class="f-name">{{ friend.username }}</span>
                  <span class="f-status">{{ friend.status || 'Online' }}</span>
                </div>
                <div class="f-level">{{ friend.level || 1 }}</div>
              </div>
              <div v-if="friends.length === 0" class="no-friends">No friends yet</div>
            </div>
          </div>

          <!-- Groups -->
          <div class="cyber-panel groups-panel">
            <div class="panel-header">
              <h3>Groups</h3>
            </div>
            <div class="groups-list">
              <div class="no-groups">No groups joined</div>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="cyber-panel links-panel">
            <div class="panel-header">
              <h3>Quick Links</h3>
            </div>
            <ul class="quick-links">
              <li>Edit Profile</li>
              <li>Inventory</li>
              <li>Settings</li>
            </ul>
          </div>

        </div>
      </div>

      <!-- INVENTORY TAB (Kept simple for now) -->
      <div v-else class="cyber-grid inventory-mode">
        <div class="cyber-panel full-width">
          <div class="panel-header">
            <h3>Inventory</h3>
            <button class="btn-close" @click="activeTab = 'profile'"><i class="fas fa-times"></i></button>
          </div>
          <div class="inventory-content">
             <div class="inventory-controls">
                <select v-model="typeFilter" class="cyber-select">
                  <option value="">All Items</option>
                  <option value="profile_picture">Avatars</option>
                  <option value="badge">Badges</option>
                  <option value="banner">Banners</option>
                  <option value="background">Backgrounds</option>
                  <option value="avatar_frame">Frames</option>
                </select>
             </div>
             <div class="inv-grid">
                <div v-for="item in filteredInventory" :key="item.item?.id" class="inv-card" :class="{equipped: item.is_equipped}">
                   <div class="inv-img-wrapper" :class="item.item?.rarity">
                     <img :src="item.item?.image_url">
                   </div>
                   <span class="inv-name">{{ item.item?.name }}</span>
                   <button v-if="!item.is_equipped" @click="equipItem(item.item?.id)">Equip</button>
                   <button v-else @click="unequipItem(item.item?.id)" class="unequip">Unequip</button>
                </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;600;700&display=swap');

:root {
  --cyber-bg: var(--bg-primary);
  --cyber-panel: var(--glass-bg);
  --neon-pink: #ff2a6d;
  --neon-cyan: #05d9e8;
  --neon-purple: #d300c5;
  --text-main: var(--text-primary);
  --text-dim: var(--text-secondary);
}

.cyber-profile-page {
  background-color: var(--bg-primary);
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(211, 0, 197, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(5, 217, 232, 0.1) 0%, transparent 40%);
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  min-height: 100%;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  padding: 20px;
  overflow-y: auto;
  transition: background-image 0.5s ease;
}

.cyber-profile-page.has-global-bg {
  background: transparent !important;
}

.cyber-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* HEADER */
.cyber-header {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(211, 0, 197, 0.1);
  transition: all 0.3s ease;
}

.header-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 11, 21, 0.5); /* Dim the banner for readability */
  z-index: 1;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 30px;
  position: relative;
  z-index: 2;
}

.cyber-avatar-wrapper {
  width: 140px; height: 140px; position: relative;
}

.cyber-avatar.skeleton {
  width: 100%; height: 100%;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; }
}

.cyber-avatar {
  width: 140px;
  height: 140px;
  border-radius: 12px; /* Square with rounded corners */
  box-shadow: 0 0 25px rgba(5, 217, 232, 0.4);
  position: relative;
  background: #000;
  overflow: visible; /* Allow frame to go outside */
}

/* Frame Support */
.cyber-avatar.has-frame {
  border: none;
  box-shadow: none;
  background: transparent;
}

.cyber-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  position: relative;
  z-index: 1;
}

.cyber-avatar.has-frame .avatar-img {
  border-radius: 50%; /* Often frames are round, or we can keep it square. Let's assume customizable frames might require specific radius. For now keep square-ish if framed? Or maybe force round if framed? Let's keep 8px unless framed. Actually typically frames overlap content. */
  width: 86%; /* Shrink slightly to fit in frame? */
  height: 86%;
  margin: 7%;
}

.avatar-frame-overlay {
  position: absolute;
  top: -10%; left: -10%;
  width: 120%; height: 120%;
  z-index: 2;
  pointer-events: none;
  object-fit: contain;
}

.cyber-avatar:not(.has-frame) {
  border: 4px solid var(--neon-cyan);
}

.edit-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: 0.3s; cursor: pointer; font-size: 2rem;
  z-index: 10;
  border-radius: 8px;
}
.cyber-avatar:hover .edit-overlay { opacity: 1; }

.hidden-input { display: none; }

.user-info { 
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

/* GRID LAYOUT */
.cyber-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 20px;
}

.main-col, .sidebar-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cyber-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  background: rgba(255, 255, 255, 0.03);
  padding: 15px 20px;
  border-bottom: 1px solid var(--glass-border);
  display: flex; justify-content: space-between;
}

.panel-header h3 {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  color: var(--text-primary);
}

/* XP BAR */
.xp-container { padding: 20px; }
.xp-bar {
  height: 12px;
  background: rgba(0,0,0,0.5);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-purple), var(--neon-cyan));
  box-shadow: 0 0 10px var(--neon-purple);
}
.btn-cyber {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  padding: 8px 20px;
  margin-left: 10px;
  cursor: pointer;
  transition: 0.3s;
  font-family: 'Rajdhani', sans-serif;
  font-weight: bold;
  text-transform: uppercase;
}
.btn-cyber:hover {
  background: var(--neon-purple);
  border-color: var(--neon-purple);
  box-shadow: 0 0 15px var(--neon-purple);
  color: white; /* Keep white on hover as background is dark neon */
}
.xp-stats {
  display: flex; justify-content: space-between;
  font-size: 0.9rem; color: var(--text-dim);
}

/* STATS PANEL */
.stats-content { padding: 20px; }
.stat-row { display: flex; gap: 20px; margin-bottom: 20px; }
.stat-item {
    background: rgba(0,0,0,0.3);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.05);
    flex: 1;
    display: flex; flex-direction: column; align-items: center;
}
.stat-label { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 5px; }
.stat-value { font-family: 'Orbitron', sans-serif; font-size: 1.8rem; color: var(--neon-cyan); }
.chart-wrapper { height: 250px; }

/* FAVORITES */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  padding: 20px;
}
.fav-game-card {
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
  transition: 0.3s;
}
.fav-game-card:hover {
  border-color: var(--neon-cyan);
  transform: scale(1.02);
}
.fav-game-card img { width: 100%; height: 100%; object-fit: cover; }
.game-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  padding: 10px;
  font-size: 0.8rem;
  opacity: 0; transition: 0.3s;
}
.fav-game-card:hover .game-overlay { opacity: 1; }

/* FEED */
.feed-list { padding: 20px; }
.feed-item {
  display: flex; gap: 15px;
  margin-bottom: 25px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 20px;
}
.feed-avatar img { width: 40px; height: 40px; border-radius: 4px; border: 1px solid var(--neon-purple); }
.feed-content { flex: 1; }
.feed-text { margin-bottom: 10px; font-size: 0.95rem; }
.user-link { color: var(--neon-cyan); font-weight: bold; }
.game-link { color: var(--neon-pink); font-weight: bold; }
.feed-media {
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  margin-bottom: 10px;
}
.feed-media img { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; }
.play-btn {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 2rem; color: white; opacity: 0.8;
}
.feed-actions { display: flex; gap: 20px; color: var(--text-dim); font-size: 1.1rem; }
.feed-actions i:hover { color: white; cursor: pointer; }

/* SIDEBAR ITEMS */
.badges-row {
  display: flex; gap: 10px; padding: 20px; flex-wrap: wrap;
}
.badge-icon {
  width: 40px; height: 40px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--neon-cyan);
}
.badge-icon img { width: 100%; height: 100%; object-fit: contain; }

.friends-list, .groups-list, .quick-links { padding: 20px; }
.friend-item, .group-item {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 15px;
}
.friend-pic { width: 32px; height: 32px; border-radius: 4px; }
.friend-info, .group-info { flex: 1; display: flex; flex-direction: column; }
.f-name, .g-name { font-weight: bold; font-size: 0.9rem; color: var(--neon-cyan); }
.f-status, .g-meta { font-size: 0.75rem; color: var(--text-dim); }
.f-level { 
  background: #333; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; 
}
.group-icon {
  width: 32px; height: 32px; background: var(--neon-pink); 
  display: flex; align-items: center; justify-content: center; border-radius: 4px;
}

.quick-links li {
  list-style: none; padding: 8px 0; color: var(--text-dim); cursor: pointer; transition: 0.2s;
}
.quick-links li:hover { color: white; padding-left: 5px; }

/* INVENTORY */
.inventory-mode .full-width { grid-column: 1 / -1; }
.inventory-content { padding: 20px; }
.cyber-select {
  background: #000; color: white; padding: 10px; border: 1px solid #333; width: 200px;
}
.inv-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;
}
.inv-card {
  background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; text-align: center;
  border: 1px solid transparent;
}
.inv-card.equipped { border-color: var(--neon-cyan); box-shadow: 0 0 10px rgba(5, 217, 232, 0.2); }
.inv-img-wrapper {
  height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
  background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid transparent;
}
.inv-img-wrapper.legendary { border-color: goldenrod; background: radial-gradient(circle, rgba(218,165,32,0.2), transparent); }
.inv-img-wrapper.epic { border-color: #d300c5; background: radial-gradient(circle, rgba(211,0,197,0.2), transparent); }

.inv-card img { max-width: 100%; max-height: 100%; object-fit: contain; }
.inv-name { display: block; margin-bottom: 8px; font-size: 0.9rem; }
.inv-card button {
  width: 100%; padding: 5px; margin-top: 5px; background: #333; border: none; color: white; cursor: pointer;
}
.inv-card button.unequip { background: var(--neon-pink); }

@media (max-width: 1000px) {
  .cyber-grid { grid-template-columns: 1fr; }
  .favorites-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
