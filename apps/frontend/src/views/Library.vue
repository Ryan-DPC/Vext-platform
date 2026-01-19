<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useCategoryStore } from '../stores/categoryStore';
import { useFriendsStore } from '../stores/friendsStore';
import { useAlertStore } from '../stores/alertStore';
import { useGroupStore } from '../stores/groupStore';
import { useThemeStore } from '../stores/themeStore';
import axios from 'axios';
import InstallPathSelector from '../components/InstallPathSelector.vue';
import UserAutocomplete from '../components/UserAutocomplete.vue';
const themeStore = useThemeStore();
import tauriAPI from '../tauri-adapter';
import { useRouter } from 'vue-router';

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = themeStore.defaultGameImg;
};

const gameStore = useGameStore();
const categoryStore = useCategoryStore();
const friendsStore = useFriendsStore();
const alertStore = useAlertStore();
const groupStore = useGroupStore();

const showAddGameModal = ref(false);
const newGameKey = ref('');
const newGameName = ref('');
const pathSelector = ref<InstanceType<typeof InstallPathSelector> | null>(null);
const searchQuery = ref('');
const filterStatus = ref('all'); // 'all', 'installed', 'favorites'

// Social Sidebar State
const newFriendUsername = ref('');
const isAddingFriend = ref(false);
const showAddFriendInput = ref(false);
const showFilterMenu = ref(false);
const currentFriendFilter = ref<'all' | 'online' | 'in-game'>('all');
const showGroupsPanel = ref(false);
const expandedGroupId = ref<string | null>(null);
import { useChatStore } from '../stores/chatStore';
const chatStore = useChatStore();

// Installation state
const installingGameId = ref<string | null>(null);
const runningGameId = ref<string | null>(null);
const installProgress = ref({
  progress: 0,
  speed: '',
  downloaded: '',
  total: '',
  eta: '',
  type: 'download',
});

onMounted(async () => {
  await Promise.all([
    gameStore.fetchMyGames(),
    categoryStore.fetchCategories(),
    friendsStore.fetchFriends(),
    groupStore.fetchMyGroups(),
  ]);

  // Setup WS listeners after fetching
  groupStore.setupWebSocketListeners();

  // Install check is now handled by gameStore
  // Safe to call, internal check handles it
  tauriAPI.onInstallProgress((data: any) => {
    if (installingGameId.value) {
      installProgress.value = {
        progress: data.progress,
        speed: data.speed || '',
        downloaded: data.downloaded || '',
        total: data.total || '',
        eta: data.eta || '',
        type: data.type || 'download',
      };
    }
  });

  tauriAPI.onInstallComplete(async (data: any) => {
    try {
      /*
        await axios.post('/installation/status', {
          gameId: data.gameId,
          status: 'installed',
          path: data.path
        })
        */

      const game = gameStore.myGames.find(
        (g: any) => g._id === data.gameId || g.folder_name === data.gameId
      );
      if (game) {
        game.installed = true;
        game.status = 'installed';
      }

      new Notification('Ether Desktop', { body: `✅ ${data.gameName} installed successfully!` });
      installingGameId.value = null;
      // Do not fetch from backend here, it would overwrite local 'installed' status
      // await gameStore.fetchMyGames()
    } catch (error) {
      console.error('Failed to sync installation status:', error);
    }
  });

  tauriAPI.onGameStatus((data: any) => {
    if (data.status === 'running') {
      runningGameId.value = data.folderName;
    } else if (data.status === 'stopped') {
      runningGameId.value = null;
    }
  });
});

// Computed Properties
const filteredGames = computed(() => {
  let games = gameStore.myGames || [];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    games = games.filter((g: any) => g.game_name.toLowerCase().includes(query));
  }

  if (filterStatus.value === 'installed') {
    games = games.filter((g: any) => g.installed);
  }

  return games;
});

const featuredLibrary = computed(() => {
  // Only show games marked as favorite
  return gameStore.myGames.filter((g: any) => g.favorite);
});

const filteredFriends = computed(() => {
  let friends = friendsStore.friends;

  if (currentFriendFilter.value === 'online') {
    friends = friends.filter((f) => f.status === 'online' || f.status === 'in-game');
  } else if (currentFriendFilter.value === 'in-game') {
    friends = friends.filter((f) => f.status === 'in-game');
  }

  return friends;
});

const sectionTitle = computed(() => {
  if (filterStatus.value === 'installed') return 'Installed Games';
  if (filterStatus.value === 'favorites') return 'My Favorites'; // If favorites filter added later
  return 'All Games'; // Default
});

const sectionIcon = computed(() => {
  if (filterStatus.value === 'installed') return 'fa-hdd';
  if (filterStatus.value === 'favorites') return 'fa-heart';
  return 'fa-th';
});

// Actions
import { useGameLauncher } from '../composables/useGameLauncher';

const {
  launchGame: launcherLaunch,
  installGame: launcherInstall,
  uninstallGame: launcherUninstall,
} = useGameLauncher();

const handleAddGame = async () => {
  try {
    const response = await axios.post('/game-ownership/redeem-key', {
      key: newGameKey.value,
      gameName: newGameName.value,
    });

    if (response.status === 200 || response.status === 201) {
      alertStore.showAlert({
        title: 'Success',
        message: 'Game added successfully!',
        type: 'success',
      });
      showAddGameModal.value = false;
      newGameKey.value = '';
      newGameName.value = '';
      await gameStore.fetchHomeData();
    } else {
      alertStore.showAlert({
        title: 'Error',
        message: response.data.message || 'Error adding game',
        type: 'error',
      });
    }
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.response?.data?.message || 'Network error',
      type: 'error',
    });
  }
};

const installGame = async (game: any) => {
  if (
    !(await alertStore.showConfirm({
      title: 'Install Game',
      message: `Install ${game.game_name}?`,
      type: 'info',
      confirmText: 'Install',
      cancelText: 'Cancel',
    }))
  )
    return;

  const gameId = game._id || game.folder_name; // Match ID logic
  installingGameId.value = gameId;
  installProgress.value = {
    progress: 0,
    speed: '0 MB/s',
    downloaded: '0 MB',
    total: 'Computing...',
    eta: '...',
    type: 'download',
  };

  // Use Composable
  const result = await launcherInstall(game);

  if (!result.success) {
    if (result.reason === 'no_path') {
      installingGameId.value = null; // Clear spinner to show dialog maybe?
      // Trigger path selector fallback if no default path
      const selectedPath = await pathSelector.value?.show();
      if (selectedPath) {
        // Fix: Save path to localStorage so launcherInstall finds it on retry
        if (!localStorage.getItem('etherInstallPath')) {
          localStorage.setItem('etherInstallPath', selectedPath);
          const libs = [selectedPath];
          localStorage.setItem('vextLibraryPaths', JSON.stringify(libs));
        }

        // Recursive retry with explicit path
        installingGameId.value = null;
        await installGame(game); // Re-enter
        return;
      }
    }
    // General failure
    installingGameId.value = null;
  } else {
    // Success. useGameLauncher returns only after completion.
    // onInstallComplete listener should have handled the cleanup and status update mostly.
    // But just in case invoke returns but event was missed:
    installingGameId.value = null;
    // Ensure local state is updated
    game.installed = true;
    game.status = 'installed';
  }
};

const launchGame = async (folderName: string) => {
  await launcherLaunch(folderName);
};

const handleUninstall = async (game: any) => {
  const success = await launcherUninstall(game);
  if (success) {
    game.installed = false;
    game.status = 'owned';
  }
};

const router = useRouter();
const goToGameDetails = (gameId: string) => {
  if (!gameId) return;
  router.push(`/games/details/${gameId}`);
};

// Social Actions
const toggleAddFriend = () => {
  showAddFriendInput.value = !showAddFriendInput.value;
  if (showAddFriendInput.value) {
    showFilterMenu.value = false;
    setTimeout(() => document.getElementById('lib-friend-input')?.focus(), 100);
  }
};

const toggleFilterMenu = () => {
  showFilterMenu.value = !showFilterMenu.value;
  if (showFilterMenu.value) {
    showAddFriendInput.value = false;
  }
};

const setFriendFilter = (filter: 'all' | 'online' | 'in-game') => {
  currentFriendFilter.value = filter;
  showFilterMenu.value = false;
};

const addFriend = async () => {
  if (!newFriendUsername.value.trim()) return;

  isAddingFriend.value = true;
  try {
    await friendsStore.sendFriendRequest(newFriendUsername.value.trim());
    newFriendUsername.value = '';
    alertStore.showAlert({
      title: 'Success',
      message: 'Request sent!',
      type: 'success',
    });
    showAddFriendInput.value = false;
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.message || 'Error sending request',
      type: 'error',
    });
  } finally {
    isAddingFriend.value = false;
  }
};

const toggleGroupsPanel = () => {
  showGroupsPanel.value = !showGroupsPanel.value;
  if (showGroupsPanel.value) {
    showAddFriendInput.value = false;
    showFilterMenu.value = false;
  }
};

const toggleGroupExpand = (groupId: string) => {
  expandedGroupId.value = expandedGroupId.value === groupId ? null : groupId;
};

const handleAddFriendFromGroup = async (username: string) => {
  try {
    await friendsStore.sendFriendRequest(username);
    alertStore.showAlert({
      title: 'Success',
      message: `Friend request sent to ${username}`,
      type: 'success',
    });
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.message || 'Failed to send request',
      type: 'error',
    });
  }
};

const toggleFavorite = (game: any) => {
  // Optimistic UI update - TODO: Persist to backend
  game.isFavorite = !game.isFavorite;
  alertStore.showAlert({
    title: game.isFavorite ? 'Added to Favorites' : 'Removed from Favorites',
    message: `${game.game_name} has been ${game.isFavorite ? 'added to' : 'removed from'} your favorites.`,
    type: 'success', // Could be 'info'
  });
};
</script>

<template>
  <div class="library-layout">
    <!-- Main Content -->
    <div class="main-content">
      <!-- Header -->
      <div class="library-header">
        <div class="search-bar">
          <i class="fas fa-search"></i>
          <input v-model="searchQuery" placeholder="Search your games..." />
        </div>
        <div class="filters">
          <button :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">
            All Games
          </button>
          <button
            :class="{ active: filterStatus === 'installed' }"
            @click="filterStatus = 'installed'"
          >
            Installed
          </button>
          <button class="btn-icon" @click="showAddGameModal = true" title="Redeem Key">
            <i class="fas fa-key"></i>
          </button>
        </div>
      </div>

      <div class="scroll-area">
        <!-- Recently Played -->
        <!-- Recently Played Removed based on user feedback -->
        <!--
            <section v-if="recentlyPlayed.length > 0" class="section">
                <h3><i class="fas fa-clock"></i> Recently Played</h3>
                <div class="recent-row">
                    <div v-for="game in recentlyPlayed" :key="game._id" class="recent-card">
                        <div class="recent-bg" :style="{ backgroundImage: `url(${game.image_url || defaultGameImg})` }"></div>
                        <div class="recent-content">
                            <img :src="game.image_url || defaultGameImg" class="recent-logo">
                            <div class="recent-info">
                                <h4>{{ game.game_name }}</h4>
                                <span class="status-text">Ready to Play</span>
                            </div>
                            <button @click="launchGame(game.folder_name)" class="btn-play-sm">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
            -->

        <!-- Featured / Favorites -->
        <section v-if="featuredLibrary.length > 0" class="section">
          <h3><i class="fas fa-star"></i> Featured</h3>
          <div class="featured-row">
            <div v-for="game in featuredLibrary" :key="game._id" class="feat-card">
              <img :src="game.image_url || themeStore.defaultGameImg" @error="handleImageError" />
              <div class="feat-overlay">
                <h4>{{ game.game_name }}</h4>
                <div v-if="game.installed" class="play-actions">
                  <button @click="launchGame(game.folder_name)" class="btn-action">PLAY</button>
                  <button
                    @click.stop="handleUninstall(game)"
                    class="btn-action-icon"
                    title="Uninstall"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <button
                  v-else
                  @click="installGame(game)"
                  class="btn-action install-icon"
                  title="Install"
                >
                  <i class="fas fa-download"></i>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- All Games Grid -->
        <section class="section">
          <h3><i :class="['fas', sectionIcon]"></i> {{ sectionTitle }}</h3>
          <div class="games-grid">
            <div
              v-for="game in filteredGames"
              :key="game._id"
              class="grid-card"
              @click="goToGameDetails(game._id || game.folder_name)"
            >
              <div class="card-image-wrapper">
                <img
                  :src="game.image_url || themeStore.defaultGameImg"
                  loading="lazy"
                  @error="handleImageError"
                />

                <!-- Hover Overlay -->
                <div
                  class="card-overlay"
                  :class="{ 'active-install': installingGameId === (game._id || game.folder_name) }"
                >
                  <!-- Favorite Star (Top Right) -->
                  <button
                    class="btn-fav"
                    :class="{ active: game.isFavorite }"
                    @click.stop="toggleFavorite(game)"
                    title="Toggle Favorite"
                  >
                    <i :class="[game.isFavorite ? 'fas' : 'far', 'fa-star']"></i>
                  </button>

                  <!-- Title (visible on hover) -->
                  <h4 class="overlay-title">{{ game.game_name }}</h4>

                  <!-- Install Progress -->
                  <div
                    v-if="installingGameId === (game._id || game.folder_name)"
                    class="install-status"
                  >
                    <div class="spinner-ring"></div>
                    <span>{{ installProgress.progress }}%</span>
                  </div>

                  <!-- Actions -->
                  <div v-else class="overlay-actions">
                    <button
                      v-if="game.installed"
                      @click.stop="launchGame(game.folder_name)"
                      class="btn-neon-play"
                    >
                      <i class="fas fa-play"></i> PLAY
                    </button>

                    <button v-else @click.stop="installGame(game)" class="btn-neon-install">
                      <i class="fas fa-download"></i> INSTALL
                    </button>

                    <button
                      v-if="game.installed"
                      @click.stop="handleUninstall(game)"
                      class="btn-icon-sm"
                      title="Uninstall"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>

                  <!-- Badges -->
                  <div class="overlay-badges">
                    <span v-if="game.installed" class="badge-dot installed"></span>
                    <span class="badge-text">{{ game.genre || 'Game' }}</span>
                  </div>
                </div>
              </div>

              <!-- Active Neon Border (pseudo-element handled in CSS) -->
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Right Sidebar: Friends -->
    <div class="friends-sidebar">
      <div class="sidebar-header">
        <h3>Social</h3>
        <div class="sidebar-actions">
          <button
            class="icon-btn"
            :class="{ active: showGroupsPanel }"
            @click="toggleGroupsPanel"
            title="Groups"
          >
            <i class="fas fa-users"></i>
          </button>
          <button
            class="icon-btn"
            :class="{ active: showAddFriendInput }"
            @click="toggleAddFriend"
            title="Add Friend"
          >
            <i class="fas fa-user-plus"></i>
          </button>
          <button
            class="icon-btn"
            :class="{ active: showFilterMenu }"
            @click="toggleFilterMenu"
            title="Filter"
          >
            <i class="fas fa-cog"></i>
          </button>
        </div>
      </div>

      <!-- Add Friend Input -->
      <div v-if="showAddFriendInput" class="sidebar-collapsible">
        <div class="add-friend-row">
          <UserAutocomplete
            id="lib-friend-input"
            v-model="newFriendUsername"
            placeholder="Username..."
            class="sidebar-input-container"
            @select="addFriend"
          >
            <template #prefix-icon>
              <!-- No icon needed here if styling matches or we adapt css -->
            </template>
          </UserAutocomplete>
          <button @click="addFriend" :disabled="isAddingFriend" class="sidebar-btn-small">
            OK
          </button>
        </div>
      </div>

      <!-- Filter Menu -->
      <div v-if="showFilterMenu" class="sidebar-collapsible">
        <div class="filter-row">
          <button
            :class="['filter-pill', { active: currentFriendFilter === 'all' }]"
            @click="setFriendFilter('all')"
          >
            All
          </button>
          <button
            :class="['filter-pill', { active: currentFriendFilter === 'online' }]"
            @click="setFriendFilter('online')"
          >
            Online
          </button>
          <button
            :class="['filter-pill', { active: currentFriendFilter === 'in-game' }]"
            @click="setFriendFilter('in-game')"
          >
            In-Game
          </button>
        </div>
      </div>

      <!-- Groups Panel -->
      <div v-if="showGroupsPanel" class="sidebar-collapsible groups-panel">
        <div class="groups-panel-header">
          <span>Recent Groups</span>
          <button @click="showGroupsPanel = false" class="icon-btn-mini">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div v-if="groupStore.myGroups.length === 0" class="empty-groups">
          <i class="fas fa-users-slash"></i>
          <span>No groups yet</span>
        </div>
        <div v-else class="groups-compact-list">
          <div
            v-for="group in groupStore.myGroups.slice(0, 5)"
            :key="group.id"
            class="group-compact-item"
          >
            <div class="group-compact-header" @click="toggleGroupExpand(group.id)">
              <div class="group-compact-info">
                <span class="group-compact-name">{{ group.name }}</span>
                <span class="group-compact-count">{{ group.members.length }} members</span>
              </div>
              <i
                :class="['fas', expandedGroupId === group.id ? 'fa-chevron-up' : 'fa-chevron-down']"
              ></i>
            </div>
            <transition name="expand">
              <div v-if="expandedGroupId === group.id" class="group-members-list">
                <div class="group-members-actions">
                  <button class="btn-invite-all" title="Invite whole group to game">
                    <i class="fas fa-gamepad"></i> Invite All
                  </button>
                </div>
                <div
                  v-for="member in group.members.slice(0, 8)"
                  :key="member.id"
                  class="group-member-mini"
                >
                  <div class="member-mini-avatar">
                    <div class="status-dot online"></div>
                  </div>
                  <span class="member-mini-name">{{ member.username }}</span>
                  <button
                    @click="handleAddFriendFromGroup(member.username)"
                    class="btn-add-mini"
                    title="Add Friend"
                  >
                    <i class="fas fa-user-plus"></i>
                  </button>
                </div>
                <div v-if="group.members.length > 8" class="more-members">
                  +{{ group.members.length - 8 }} more
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <div class="search-friends">
        <i class="fas fa-search"></i>
        <input placeholder="Search friends..." />
      </div>

      <div class="friends-list">
        <div v-if="friendsStore.loading" class="loading-friends">
          <i class="fas fa-circle-notch fa-spin"></i>
        </div>

        <template v-else>
          <div v-for="friend in filteredFriends" :key="friend.id" class="friend-item">
            <div class="friend-avatar">
              <img :src="friend.profile_pic || '/default-avatar.svg'" alt="Avatar" />
              <div class="status-dot" :class="friend.status"></div>
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend.username }}</div>
              <div class="friend-status">{{ friend.status }}</div>
            </div>
            <button class="btn-msg" @click.stop="chatStore.openChat(friend)">
              <i class="fas fa-comment"></i>
            </button>
          </div>

          <div v-if="friendsStore.friends.length === 0" class="empty-friends">
            No friends online
          </div>
        </template>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showAddGameModal" class="modal-overlay" @click.self="showAddGameModal = false">
      <div class="modal-glass">
        <div class="modal-header-simple">
          <h3>Redeem Game Key</h3>
          <button @click="showAddGameModal = false" class="icon-btn-mini close-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <p class="modal-desc">
          Enter your 16-character product key to add a new game to your library.
        </p>
        <input v-model="newGameKey" placeholder="XXXX-XXXX-XXXX" class="glass-input" />
        <button @click="handleAddGame" class="btn-action full-width">Redeem Code</button>
      </div>
    </div>

    <InstallPathSelector ref="pathSelector" />
  </div>
</template>

<style scoped>
.library-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  height: 100vh;
  background:
    radial-gradient(circle at 10% 20%, rgba(20, 0, 10, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(0, 20, 40, 0.4) 0%, transparent 40%);
  color: var(--text-primary);
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: rgba(10, 10, 15, 0.6); /* Tint */
}

.library-header {
  padding: 30px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* Removed darker background for seamless look */
  background: transparent;
  /* Optional: Subtle gradient only at very top if needed, or total transparency */
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 100%);
  z-index: 20;
  /* Removed box-shadow to avoid hard line */
}

/* Search Bar */
.search-bar {
  position: relative;
  width: 350px;
}
.search-bar input {
  width: 100%;
  padding: 14px 14px 14px 45px;
  background: rgba(255, 255, 255, 0.05); /* Premium Glass */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}
.search-bar input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 126, 179, 0.5);
  box-shadow: 0 0 0 4px rgba(255, 126, 179, 0.15);
  outline: none;
}
.search-bar i {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 1.1rem;
  transition: color 0.3s;
}
.search-bar input:focus + i {
  color: #ff7eb3;
}

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.filters button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}
.filters button:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}
.filters button.active {
  background: linear-gradient(135deg, #ff7eb3, #ff5a9e);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 126, 179, 0.3);
}
.btn-icon {
  padding: 10px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

/* Scroll Area */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  padding-bottom: 100px;
}
.scroll-area::-webkit-scrollbar {
  width: 8px;
}
.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.scroll-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.section {
  margin-bottom: 50px;
}
/* Section Headers - Clean */
.section h3 {
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  /* Removed neon gradient text for cleaner white */
}
.section h3 i {
  color: white; /* Unified color */
  opacity: 0.8;
  font-size: 1.2rem;
}

/* --- GRID STYLES (Cinematic) --- */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 35px;
  padding: 10px;
  perspective: 1000px;
}

.grid-card {
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy hover */
  background: #1a1b26;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.card-image-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  z-index: 1;
  background: #000;
}

.card-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1),
    filter 0.4s;
}

.grid-card:hover {
  transform: translateY(-8px) scale(1.02);
  z-index: 10;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.15); /* Subtle white border */
}

.grid-card:hover img {
  transform: scale(1.1);
  filter: brightness(0.5) blur(2px); /* Blur bg slightly */
}

/* Featured Row */
.featured-row {
  display: flex;
  gap: 25px;
}
.feat-card {
  width: 220px;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.feat-card:hover {
  transform: translateY(-8px);
  border-color: #ff7eb3;
  box-shadow: 0 0 20px rgba(255, 126, 179, 0.4);
}
.feat-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Overlay reuse logic below */

/* Card Overlay */
.card-overlay,
.feat-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  opacity: 0;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(0px); /* Animate blur? Performance heavy */
}

.grid-card:hover .card-overlay,
.feat-card:hover .feat-overlay,
.card-overlay.active-install {
  opacity: 1;
  backdrop-filter: blur(3px);
  background: rgba(0, 0, 0, 0.6);
}

.overlay-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  margin-bottom: 25px;
  text-align: center;
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.8);
  background: linear-gradient(135deg, #fff, #e2e8f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transform: translateY(20px);
  transition: transform 0.3s ease;
}
.grid-card:hover .overlay-title {
  transform: translateY(0);
}

.overlay-actions,
.play-actions {
  display: flex;
  flex-direction: row; /* Horizontal layout */
  gap: 12px;
  width: 100%;
  justify-content: center;
  align-items: center;
  transform: translateY(20px);
  transition: transform 0.3s ease 0.1s;
  padding: 0 15px; /* Prevent edge touching */
}
.grid-card:hover .overlay-actions {
  transform: translateY(0);
}

.overlay-badges {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.badge-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.badge-dot {
  width: 6px;
  height: 6px;
  background: #00dc82;
  border-radius: 50%;
  box-shadow: 0 0 10px #00dc82;
}

/* Buttons */
/* Refined Buttons */
.btn-neon-play,
.btn-action {
  flex: 1; /* Take available space */
  max-width: 140px; /* Cap width for symmetry */
  background: white; /* Clean white */
  border: none;
  color: #120c18; /* Dark text */
  padding: 12px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.btn-neon-play:hover,
.btn-action:hover {
  transform: scale(1.03);
  background: #f0f0f0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.btn-neon-install {
  flex: 1;
  max-width: 140px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px;
  border-radius: 50px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.btn-neon-install:hover {
  background: white;
  color: #120c18;
  border-color: white;
  transform: scale(1.03);
}

.btn-icon-sm,
.btn-action-icon {
  background: transparent;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  /* margin-top removed for horizontal alignment */
}
.btn-icon-sm:hover,
.btn-action-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
  color: #ff4d4d;
}

/* Favorite Star Styling */
.btn-fav {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 20;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-fav:hover {
  transform: scale(1.2) rotate(15deg);
  color: #fbbf24; /* Amber/Gold */
}

.btn-fav.active {
  color: #fbbf24;
}

.btn-fav.active:hover {
  transform: scale(0.9); /* Press effect */
}

/* Install Status */
.install-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  color: #7afcff;
  font-weight: bold;
}
.spinner-ring {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(122, 252, 255, 0.2);
  border-top-color: #7afcff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Sidebar Styling */
/* Sidebar Styling */
.friends-sidebar {
  /* Make sidebar background extremely subtle to blend with app */
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px); /* Lighter blur */
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 30;
  /* Soft shadow only */
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.2);
}

.sidebar-header {
  padding: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.sidebar-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
}
/* Sidebar Icons */
.sidebar-actions {
  display: flex;
  gap: 8px;
}

.sidebar-actions .icon-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 8px; /* Softer rounded square */
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-actions .icon-btn:hover {
  background: rgba(255, 255, 255, 0.08); /* Light highlight */
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.sidebar-actions .icon-btn.active {
  background: white;
  color: #120c18;
  border-color: white;
}

/* Add Friend Row */
.add-friend-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.sidebar-input-container {
  flex: 1;
}

/* Deep selector to style the input inside the child component */
:deep(.autocomplete-input) {
  width: 100%;
  background: rgba(255, 255, 255, 0.05); /* Premium glass */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  font-size: 0.9rem;
  transition: all 0.2s;
  height: 36px; /* Match button height */
}
:deep(.autocomplete-input):focus {
  border-color: white;
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}
:deep(.autocomplete-input)::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.sidebar-btn-small {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  height: 36px;
  transition: all 0.2s;
}
.sidebar-btn-small:hover {
  background: white;
  color: #120c18;
  border-color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.sidebar-btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
}

.search-friends {
  margin: 0 20px 15px;
  position: relative;
}
.search-friends input {
  width: 100%;
  padding: 10px 10px 10px 38px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.search-friends input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: #ff7eb3;
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 126, 179, 0.15);
}
.search-friends input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
.search-friends i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  pointer-events: none;
}

.friends-list {
  padding: 20px;
}
.friend-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.2s;
  cursor: pointer;
  border: 1px solid transparent;
}
.friend-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.02);
  transform: translateX(5px);
}
.friend-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  position: relative;
}
.friend-avatar img {
  border-radius: 50%;
}
.status-dot {
  width: 12px;
  height: 12px;
  border: 2px solid #1a1b26;
  right: -2px;
  bottom: -2px;
}

.friend-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
}
.friend-status {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000; /* Ensure it's above everything (sidebar is 30) */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85); /* Darker dim */
  backdrop-filter: blur(5px);
}
.modal-glass {
  background: #1a1b26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  border-radius: 16px;
  padding: 30px; /* More breathing room */
  width: 90%;
  max-width: 450px; /* Fixed width */
  display: flex;
  flex-direction: column;
  gap: 20px;
  backdrop-filter: blur(10px);
}

.modal-header-simple {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header-simple h3 {
  margin: 0;
  font-size: 1.3rem;
  color: white;
  font-weight: 700;
}
.modal-header-simple .close-modal {
  width: 30px;
  height: 30px;
  font-size: 1rem;
}

.modal-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

.glass-input {
  background: rgba(255, 255, 255, 0.05); /* Lighter glass */
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 1rem;
  letter-spacing: 1px; /* For keys */
  transition: all 0.2s;
}
.glass-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: white;
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar reset for whole layout */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #0a0a0f;
}
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

/* Groups Panel - Enhanced */
.groups-panel {
  max-height: 400px;
  overflow-y: auto;
  padding-bottom: 5px;
}
.groups-panel::-webkit-scrollbar {
  width: 4px;
}
.groups-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.groups-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 12px;
}
.groups-panel-header span {
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.icon-btn-mini {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}
.icon-btn-mini:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.empty-groups {
  text-align: center;
  padding: 30px 20px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty-groups i {
  font-size: 2rem;
  opacity: 0.3;
  color: white;
}
.empty-groups span {
  font-size: 0.9rem;
}

.groups-compact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-compact-item {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.2s ease;
}
.group-compact-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.group-compact-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.group-compact-header i {
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.3s;
  font-size: 0.8rem;
}

.group-compact-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.group-compact-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
}
.group-compact-count {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

/* Sidebar Collapsible Container */
.sidebar-collapsible {
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  animation: slideDown 0.2s ease-out;
}
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
