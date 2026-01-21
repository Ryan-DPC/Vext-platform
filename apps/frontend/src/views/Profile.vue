<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useUserStore } from '../stores/userStore';
import { useItemStore } from '../stores/itemStore';
import { useLayoutStore } from '../stores/layoutStore';
import axios from 'axios';
import { getApiUrl } from '../utils/url';
import StatsChart from '../components/StatsChart.vue';
import { statsService } from '../services/stats.service';

const defaultGameImg = `${getApiUrl()}/public/default-game.svg`;

const userStore = useUserStore();
const itemStore = useItemStore();
const layoutStore = useLayoutStore();

const activeTab = ref('dashboard'); // 'dashboard', 'inventory'
const typeFilter = ref('');
const profileLoaded = ref(false);

const globalStats = ref<any>(null);
const recentGames = ref<any[]>([]);

const fetchRecentGames = async () => {
  try {
    const response = await axios.get('/users/recent-games');
    recentGames.value = response.data.games || [];
  } catch (error) {
    console.error('Failed to fetch recent games');
  }
};

const fetchGlobalStats = async () => {
  globalStats.value = await statsService.getGlobalStats();
};

const isOwnProfile = computed(() => true);
const fileInput = ref<HTMLInputElement | null>(null);
const triggerFileInput = () => fileInput.value?.click();

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file as Blob);

  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (userStore.user && e.target?.result)
        userStore.user.profile_pic = e.target.result as string;
    };
    reader.readAsDataURL(file);
    const response = await axios.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.success) userStore.user.profile_pic = response.data.profile_pic;
  } catch (error) {
    console.error('Upload failed:', error);
    await userStore.fetchProfile();
  }
};

const badges = computed(() => {
  return itemStore.myItems.filter((i: any) => i.item?.item_type === 'badge');
});

const equippedBanner = computed(() => {
  if (userStore.user?.banner_url) return userStore.user.banner_url;
  const equipped = itemStore.myItems.find(
    (i: any) => i.item?.item_type === 'banner' && i.is_equipped
  );
  return equipped?.item?.image_url || null;
});

const equippedFrame = computed(() => {
  if (userStore.user?.frame_url) return userStore.user.frame_url;
  const equipped = itemStore.myItems.find(
    (i: any) => i.item?.item_type === 'avatar_frame' && i.is_equipped
  );
  return equipped?.item?.image_url || null;
});

const equippedBackground = computed(() => {
  const equipped = itemStore.myItems.find(
    (i: any) => i.item?.item_type === 'background' && i.is_equipped
  );
  return equipped?.item?.image_url || null;
});

const profilePicUrl = computed(() => {
  return userStore.user?.profile_pic || defaultGameImg;
});

// Sync background with layout store
watch(
  equippedBackground,
  (newVal) => {
    layoutStore.setBackground(newVal);
  },
  { immediate: true }
);

onUnmounted(() => {
  layoutStore.setBackground(null);
});

onMounted(async () => {
  await Promise.all([
    userStore.fetchProfile(),
    itemStore.fetchMyItems(),
    fetchRecentGames(),
    fetchGlobalStats(),
  ]);
  profileLoaded.value = true;
});

const filteredInventory = computed(() => {
  if (!typeFilter.value) return itemStore.myItems;
  return itemStore.myItems.filter((item: any) => item.item?.item_type === typeFilter.value);
});

const equipItem = async (itemId: string) => {
  try {
    await itemStore.equipItem(itemId);
  } catch (error: any) {
    alert(error.response?.data?.message || 'Erreur');
  }
};

const unequipItem = async (itemId: string) => {
  try {
    await itemStore.unequipItem(itemId);
  } catch (error: any) {
    alert(error.response?.data?.message || 'Erreur');
  }
};
</script>

<template>
  <div class="dashboard-page" :class="{ 'has-global-bg': !!equippedBackground }">
    <!-- Cherry Blossom Background Effect (CSS only for now) -->
    <div class="cherry-blossoms" v-if="!equippedBackground"></div>

    <div class="dashboard-container">
      <!-- LEFT COLUMN: Identity Card -->
      <div class="identity-col">
        <div class="identity-card cyber-glass">
          <!-- Banner behind Avatar -->
          <div
            class="mini-banner"
            :style="equippedBanner ? { backgroundImage: `url(${equippedBanner})` } : {}"
          ></div>

          <div class="avatar-section">
            <div class="cyber-avatar-wrapper">
              <div
                class="cyber-avatar"
                :class="{ 'has-frame': equippedFrame }"
                v-if="profileLoaded"
              >
                <img :src="profilePicUrl" class="avatar-img" />
                <img v-if="equippedFrame" :src="equippedFrame" class="avatar-frame-overlay" />
                <div v-if="isOwnProfile" class="edit-overlay" @click="triggerFileInput">
                  <i class="fas fa-camera"></i>
                </div>
              </div>
            </div>
            <input
              type="file"
              ref="fileInput"
              class="hidden-input"
              accept="image/*"
              @change="handleFileUpload"
            />
          </div>

          <div class="user-details">
            <h1>{{ userStore.user?.username || 'User' }}</h1>
            <div class="level-indicator">
              <span class="lvl-label">LVL</span>
              <span class="lvl-value">{{ userStore.user?.level || 1 }}</span>
            </div>
            <span class="status-msg">{{ userStore.user?.status_message || 'Ready to play' }}</span>
          </div>

          <div class="nav-actions">
            <button
              class="nav-btn"
              :class="{ active: activeTab === 'dashboard' }"
              @click="activeTab = 'dashboard'"
            >
              <i class="fas fa-columns"></i> Dashboard
            </button>
            <button
              class="nav-btn"
              :class="{ active: activeTab === 'inventory' }"
              @click="activeTab = 'inventory'"
            >
              <i class="fas fa-box-open"></i> Inventory
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Widgets Hub -->
      <div class="hub-col" v-if="activeTab === 'dashboard'">
        <!-- Widget: Stats Grid -->
        <div class="widget-row">
          <div class="cyber-widget stat-widget">
            <span class="w-label">Total Playtime</span>
            <span class="w-value">{{ Number(globalStats?.totalHours || 0).toFixed(0) }}h</span>
            <div class="w-graph-line"></div>
          </div>
          <div class="cyber-widget stat-widget">
            <span class="w-label">Games Owned</span>
            <span class="w-value">{{ recentGames.length }}</span>
            <div class="w-graph-line pink"></div>
          </div>
          <div class="cyber-widget stat-widget">
            <span class="w-label">Badges</span>
            <span class="w-value">{{ badges.length }}</span>
            <div class="w-graph-line cyan"></div>
          </div>
        </div>

        <!-- Widget: Recent Activity / Games -->
        <div class="cyber-widget wide-widget">
          <div class="widget-header">
            <h3>Recently Played</h3>
          </div>
          <div class="games-grid">
            <div v-for="(game, index) in recentGames.slice(0, 3)" :key="index" class="game-card">
              <img :src="game.game_id?.image_url || defaultGameImg" />
              <span class="game-title">{{ game.game_name }}</span>
            </div>
            <div v-if="recentGames.length === 0" class="no-data">No games played yet.</div>
          </div>
        </div>

        <!-- Widget: Trophy Case (New) -->
        <div class="cyber-widget wide-widget">
          <div class="widget-header">
            <h3><i class="fas fa-trophy"></i> Trophy Case</h3>
            <button class="btn-sm">View All</button>
          </div>
          <div class="trophy-grid">
            <div class="trophy-item gold" title="VEXT Pioneer">
              <i class="fas fa-crown"></i>
            </div>
            <div class="trophy-item silver" title="Sharpshooter">
              <i class="fas fa-crosshairs"></i>
            </div>
            <div class="trophy-item bronze" title="First Win">
              <i class="fas fa-flag"></i>
            </div>
            <div class="trophy-item locked">
              <i class="fas fa-lock"></i>
            </div>
            <div class="trophy-item locked">
              <i class="fas fa-lock"></i>
            </div>
          </div>
        </div>

        <!-- Split Row: Activity Feed & Groups -->
        <div class="split-widget-row">
          <!-- Widget: Activity Feed (New) -->
          <div class="cyber-widget feed-widget">
            <div class="widget-header">
              <h3><i class="fas fa-stream"></i> Activity</h3>
            </div>
            <div class="activity-list">
              <div class="activity-item">
                <div class="act-icon"><i class="fas fa-gamepad"></i></div>
                <div class="act-content">
                  <span class="act-text">Played <strong>Aether Strike</strong></span>
                  <span class="act-time">2h ago</span>
                </div>
              </div>
              <div class="activity-item">
                <div class="act-icon achievement"><i class="fas fa-trophy"></i></div>
                <div class="act-content">
                  <span class="act-text">Unlocked <strong>Sharpshooter</strong></span>
                  <span class="act-time">5h ago</span>
                </div>
              </div>
              <div class="activity-item">
                <div class="act-icon login"><i class="fas fa-sign-in-alt"></i></div>
                <div class="act-content">
                  <span class="act-text">Logged in</span>
                  <span class="act-time">1d ago</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Widget: Groups -->
          <div class="cyber-widget groups-widget">
            <div class="widget-header">
              <h3>My Groups</h3>
              <button class="btn-sm">Find</button>
            </div>
            <div class="groups-flex">
              <div class="no-data">No groups joined.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- INVENTORY TAB (Right col replacement) -->
      <div class="hub-col inventory-mode" v-else>
        <div class="cyber-widget full-height">
          <div class="widget-header">
            <h3>Inventory</h3>
            <select v-model="typeFilter" class="cyber-select">
              <option value="">All Items</option>
              <option value="avatar">Avatars</option>
              <option value="badge">Badges</option>
              <option value="banner">Banners</option>
              <option value="background">Backgrounds</option>
              <option value="avatar_frame">Frames</option>
            </select>
          </div>
          <div class="inv-scroll-area">
            <div class="inv-grid">
              <div
                v-for="item in filteredInventory"
                :key="item.item?.id"
                class="inv-card"
                :class="{ equipped: item.is_equipped }"
              >
                <div class="inv-img-wrapper" :class="item.item?.rarity">
                  <img :src="item.item?.image_url" />
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
  --neon-pink: #ff2a6d;
  --neon-cyan: #05d9e8;
  --text-main: #fff;
  --text-dim: rgba(255, 255, 255, 0.6);
}

.dashboard-page {
  /* Screen Handling */
  height: 100vh;
  overflow: hidden; /* No global scroll */
  background-color: transparent;
  background-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.8));
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  padding: 0;
  box-sizing: border-box;
}

.dashboard-container {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  height: 100%;
  width: 100%;
  max-width: 100%;
  padding: 20px;
  margin: 0;
}

/* --- LEFT COL: IDENTITY --- */
.identity-col {
  display: flex;
  flex-direction: column;
}

.identity-card {
  flex: 1;
  background: rgba(20, 20, 30, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding-bottom: 20px;
}

.mini-banner {
  width: 100%;
  height: 120px;
  background: linear-gradient(45deg, #1a1a2e, #16213e);
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar-section {
  margin-top: -60px; /* Pull avatar up into banner */
  position: relative;
  z-index: 2;
}

.cyber-avatar-wrapper {
  width: 120px;
  height: 120px;
}
.cyber-avatar {
  width: 120px;
  height: 120px;
  background: #000;
  border-radius: 24px; /* Squircle */
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
.cyber-avatar.has-frame {
  border: none;
  background: transparent;
  box-shadow: none;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 24px;
}
.cyber-avatar.has-frame .avatar-img {
  width: 70%;
  height: 70%;
  margin: 15%;
  border-radius: 50%;
}
.avatar-frame-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.edit-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: 0.2s;
  cursor: pointer;
  border-radius: 24px;
}
.cyber-avatar:hover .edit-overlay {
  opacity: 1;
}
.hidden-input {
  display: none;
}

.user-details {
  text-align: center;
  margin-top: 15px;
  width: 100%;
  padding: 0 20px;
}
.user-details h1 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.8rem;
  margin: 0;
  background: linear-gradient(135deg, #fff, #a5f3fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.level-indicator {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 12px;
  border-radius: 20px;
  margin: 10px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  align-items: center;
  gap: 5px;
}
.lvl-label {
  font-size: 0.7rem;
  color: #aaa;
  letter-spacing: 1px;
}
.lvl-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--neon-pink);
}
.status-msg {
  display: block;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

.nav-actions {
  margin-top: 40px;
  width: 100%;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.nav-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  padding: 15px;
  width: 100%;
  text-align: left;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 12px;
  transition: 0.2s;
  display: flex;
  align-items: center;
  gap: 15px;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  transform: translateX(5px);
}
.nav-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: var(--neon-cyan);
  border-right: 3px solid var(--neon-cyan);
}
.nav-btn i {
  width: 24px;
  text-align: center;
}

/* --- RIGHT COL: HUB --- */
.hub-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto; /* Internal scroll */
  padding-right: 10px; /* Space for scrollbar */
}
/* Scrollbar Styling */
.hub-col::-webkit-scrollbar {
  width: 6px;
}
.hub-col::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.widget-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.cyber-widget {
  background: rgba(20, 20, 30, 0.4);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  transition: 0.3s;
}
.cyber-widget:hover {
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.stat-widget {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 120px;
  position: relative;
  overflow: hidden;
}
.w-label {
  font-size: 0.9rem;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.w-value {
  font-size: 2.2rem;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
  margin-top: 5px;
}
.w-graph-line {
  height: 3px;
  width: 60%;
  background: linear-gradient(90deg, #fff, transparent);
  margin-top: auto;
  border-radius: 2px;
}
.w-graph-line.pink {
  background: linear-gradient(90deg, var(--neon-pink), transparent);
}
.w-graph-line.cyan {
  background: linear-gradient(90deg, var(--neon-cyan), transparent);
}

.wide-widget {
  min-height: 200px;
}
.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.widget-header h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  margin: 0;
  color: #fff;
}
.btn-sm {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}
.btn-sm:hover {
  background: var(--neon-cyan);
  color: #000;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 15px;
}
.game-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  transition: 0.2s;
  border: 1px solid transparent;
}
.game-card:hover {
  border-color: var(--neon-pink);
}
.game-card img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}
.game-title {
  display: block;
  padding: 10px;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* In Inventory Mode */
.full-height {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.inv-scroll-area {
  flex: 1;
  overflow-y: auto;
  margin-top: 15px;
  padding-right: 5px;
}
.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 15px;
}
.inv-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-radius: 12px;
  text-align: center;
}
.inv-card.equipped {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 15px rgba(5, 217, 232, 0.1);
}
.inv-img-wrapper {
  height: 90px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.inv-card img {
  max-width: 100%;
  max-height: 90px;
}
.inv-card button {
  width: 100%;
  border: none;
  padding: 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  margin-top: 5px;
}
.inv-card button:hover {
  background: #fff;
  color: #000;
}
.inv-card button.unequip {
  background: var(--neon-pink);
}

.cyber-select {
  background: #000;
  color: #fff;
  border: 1px solid #333;
  padding: 5px 10px;
  border-radius: 6px;
}

@media (max-width: 900px) {
  .dashboard-container {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .identity-col {
    height: auto;
  }
  .identity-card {
    height: auto;
    padding-bottom: 20px;
  }
  .hub-col {
    overflow: visible;
  }
  .split-widget-row {
    grid-template-columns: 1fr;
  }
}

/* Trophy Case */
.trophy-grid {
  display: flex;
  gap: 20px;
  padding: 10px 0;
}
.trophy-item {
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: 0.2s;
  position: relative;
}
.trophy-item:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
}
.trophy-item.gold {
  color: #ffd700;
  border-color: rgba(255, 215, 0, 0.3);
  background: radial-gradient(circle, rgba(255, 215, 0, 0.1), transparent);
}
.trophy-item.silver {
  color: #c0c0c0;
  border-color: rgba(192, 192, 192, 0.3);
}
.trophy-item.bronze {
  color: #cd7f32;
  border-color: rgba(205, 127, 50, 0.3);
}
.trophy-item.locked {
  color: rgba(255, 255, 255, 0.1);
  border-style: dashed;
}

/* Split Row */
.split-widget-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.feed-widget {
  flex: 1;
}
.groups-widget {
  flex: 1;
}

/* Activity Feed */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.activity-item {
  display: flex;
  gap: 15px;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.activity-item:last-child {
  border-bottom: none;
}
.act-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--neon-cyan);
  font-size: 0.9rem;
}
.act-icon.achievement {
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}
.act-icon.login {
  color: #aaa;
}

.act-content {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
}
.act-text strong {
  color: #fff;
  font-weight: 600;
}
.act-text {
  color: rgba(255, 255, 255, 0.8);
}
.act-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}
</style>
