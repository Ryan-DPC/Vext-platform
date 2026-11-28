<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useFriendsStore } from '../stores/friendsStore'
import { useUserStore } from '../stores/userStore'
import { useAlertStore } from '../stores/alertStore'
import { useGroupStore } from '../stores/groupStore'
import { statsService } from '../services/stats.service'
import axios from 'axios'
import InstallPathSelector from '../components/InstallPathSelector.vue'
import UserAutocomplete from '../components/UserAutocomplete.vue'
import defaultGameImg from '@/assets/images/default-game.svg'
import tauriAPI from '../tauri-adapter';

const gameStore = useGameStore()
const categoryStore = useCategoryStore()
const friendsStore = useFriendsStore()
const alertStore = useAlertStore()
const groupStore = useGroupStore()

const showAddGameModal = ref(false)
const newGameKey = ref('')
const newGameName = ref('')
const pathSelector = ref<InstanceType<typeof InstallPathSelector> | null>(null)
const searchQuery = ref('')
const showAllGames = ref(false) // false = sections Installés / Non installés, true = liste unique

// Social Sidebar State
const newFriendUsername = ref('')
const isAddingFriend = ref(false)
const showAddFriendInput = ref(false)
const showFilterMenu = ref(false)
const currentFriendFilter = ref<'all' | 'online' | 'in-game'>('all')
const showGroupsPanel = ref(false)
const expandedGroupId = ref<string | null>(null)
import { useChatStore } from '../stores/chatStore'
const chatStore = useChatStore()

// Installation state
const installingGameId = ref<string | null>(null)
const runningGameId = ref<string | null>(null)
const installProgress = ref({
  progress: 0,
  speed: '',
  downloaded: '',
  total: '',
  eta: '',
  type: 'download'
})

function onImageLoad(e: Event) {
  const target = e.target as HTMLImageElement
  if (!target) return
  const w = target.naturalWidth
  const h = target.naturalHeight
  // Image non-poster (paysage) ou basse résolution : affichée entière (contain) sur un fond flouté
  // de la même image, au lieu d'être étirée en "cover" (ce qui la rendait très floue).
  const isLandscape = w > h * 1.1
  const isLowRes = w < 300
  target.classList.toggle('is-landscape', isLandscape || isLowRes)
  const poster = target.parentElement
  if (poster) {
    poster.style.setProperty('--poster-bg', isLandscape || isLowRes ? `url("${target.currentSrc || target.src}")` : 'none')
  }
}

function onImageError(e: Event, game: any) {
  const target = e.target as HTMLImageElement
  if (!target) return
  const currentSrc = target.src || ''
  const appId = game?.app_id

  if (appId) {
    const candidates = [
      ...(game?.fallback_header_url ? [game.fallback_header_url] : []),
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
      `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`
    ]
    const tried = Number(target.dataset.fallbackStep || '0')
    const nextSrc = candidates[tried]
    if (nextSrc) {
      target.dataset.fallbackStep = String(tried + 1)
      if (currentSrc !== nextSrc) {
        target.src = nextSrc
        return
      }
    }
  }
  // Petite icône 32x32 de la communauté Steam, puis image par défaut (jamais avant l'URL exacte de Steam)
  const useIconOrDefault = () => {
    if (game?.fallback_logo_url && !target.dataset.iconTried) {
      target.dataset.iconTried = '1'
      target.src = game.fallback_logo_url
    } else {
      target.classList.remove('is-landscape')
      target.src = defaultGameImg
    }
  }

  // Dernier recours : l'URL d'image exacte donnée par Steam (jeux récents avec chemin à hash)
  if (appId && !target.dataset.catalogTried) {
    target.dataset.catalogTried = '1'
    axios.get(`/steam-catalog/app/${appId}`)
      .then((res) => {
        const url = res.data?.image_url
        if (url && url !== target.src) target.src = url
        else useIconOrDefault()
      })
      .catch(() => useIconOrDefault())
    return
  }
  target.classList.remove('is-landscape')
  target.src = defaultGameImg
}

onMounted(async () => {
  await Promise.allSettled([
    gameStore.fetchMyGames(),
    gameStore.scanSteamGames(),
    gameStore.scanEpicGames(),
    categoryStore.fetchCategories(),
    friendsStore.fetchFriends(),
    groupStore.fetchMyGroups()
  ])
  groupStore.setupWebSocketListeners()

  // Setup Tauri listeners
  // Safe to call, internal check handles it
  tauriAPI.onInstallProgress((data: any) => {
      if (installingGameId.value) {
        installProgress.value = {
          progress: data.progress,
          speed: data.speed || '',
          downloaded: data.downloaded || '',
          total: data.total || '',
          eta: data.eta || '',
          type: data.type || 'download'
        }
      }
  })

  tauriAPI.onInstallComplete(async (data: any) => {
      try {
        await axios.post('/installation/status', {
          gameId: data.gameId,
          status: 'installed',
          path: data.path
        })
        
        const game = gameStore.myGames.find((g: any) => (g._id === data.gameId || g.folder_name === data.gameId))
        if (game) {
          game.installed = true
          game.status = 'installed'
        }

        new Notification('VEXT', { body: `✅ ${data.gameName} installed successfully!` })
        installingGameId.value = null
        await gameStore.fetchMyGames()
      } catch (error) {
        console.error('Failed to sync installation status:', error)
      }
  })

  tauriAPI.onGameStatus((data: any) => {
      if (data.status === 'running') {
          runningGameId.value = data.folderName
      } else if (data.status === 'stopped') {
          runningGameId.value = null
      }
  })
})

// Computed Properties
const filteredGames = computed(() => {
  let games = gameStore.allUnifiedGames || []

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    games = games.filter((g: any) => (g.game_name || g.name || '').toLowerCase().includes(query))
  }

  return games
})

// Sections affichées dans la grille : Installés / Non installés, ou une seule liste « Tous les jeux »
const gridSections = computed(() => {
  const games = filteredGames.value
  if (showAllGames.value) {
    return [{ key: 'all', title: 'All Games', icon: 'fa-th', games }]
  }
  return [
    { key: 'installed', title: 'Installed', icon: 'fa-check-circle', games: games.filter((g: any) => g.installed) },
    { key: 'uninstalled', title: 'Not Installed', icon: 'fa-download', games: games.filter((g: any) => !g.installed) }
  ].filter(section => section.games.length > 0)
})

const recentlyPlayed = computed(() => {
  return (gameStore.allUnifiedGames || []).filter((g: any) => g.installed).slice(0, 3)
})

const featuredLibrary = computed(() => {
    // Only show games marked as favorite
    return (gameStore.myGames || []).filter((g: any) => g.favorite)
})

const filteredFriends = computed(() => {
  let friends = friendsStore.friends
  
  if (currentFriendFilter.value === 'online') {
    friends = friends.filter(f => f.status === 'online' || f.status === 'in-game')
  } else if (currentFriendFilter.value === 'in-game') {
    friends = friends.filter(f => f.status === 'in-game')
  }
  
  return friends
})

// Actions
const handleAddGame = async () => {
  try {
    const response = await axios.post('/game-ownership/redeem-key', {
        key: newGameKey.value,
        gameName: newGameName.value
    })
    
    if (response.status === 200 || response.status === 201) {
      alertStore.showAlert({
        title: 'Success',
        message: 'Game added successfully!',
        type: 'success'
      })
      showAddGameModal.value = false
      newGameKey.value = ''
      newGameName.value = ''
      await gameStore.fetchHomeData()
    } else {
      alertStore.showAlert({
        title: 'Error',
        message: response.data.message || 'Error adding game',
        type: 'error'
      })
    }
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.response?.data?.message || 'Network error',
      type: 'error'
    })
  }
}

const installGame = async (game: any) => {
  if (!await alertStore.showConfirm({
    title: 'Install Game',
    message: `Install ${game.game_name}?`,
    type: 'info',
    confirmText: 'Install',
    cancelText: 'Cancel'
  })) return

  try {
    if (!(window as any).__TAURI__) {
      alertStore.showAlert({
        title: 'Error',
        message: 'Installation requires App',
        type: 'error'
      })
      return
    }

    let installPath = localStorage.getItem('vextInstallPath') || localStorage.getItem('etherInstallPath')
    if (!installPath) {
      const selectedPath = await pathSelector.value?.show()
      installPath = selectedPath || null
      if (!installPath) return
      localStorage.setItem('vextInstallPath', installPath)
    }

    const gameId = game._id || game.folder_name
    const result = await tauriAPI.installGame(
      game.zipUrl,
      installPath,
      game.folder_name || gameId,
      gameId,
      game.game_name,
      game.version || '1.0.0',
      {}
    )

    if (result.success) {
      installingGameId.value = gameId
      installProgress.value = {
        progress: 0,
        speed: '0 MB/s',
        downloaded: '0 MB',
        total: '...',
        eta: '...',
        type: 'download'
      }
    }
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Installation Error',
      message: error.message || 'Installation error',
      type: 'error'
    })
  }
}

const installSteamGame = async (game: any) => {
  if (!game?.app_id) return
  try {
    await tauriAPI.installSteamGame(game.app_id, game.game_name || game.name)
    alertStore.showAlert({
      title: 'Installation Steam',
      message: `Steam redémarre un instant, puis télécharge ${game.game_name || game.name} automatiquement.`,
      type: 'info'
    })
    setTimeout(() => {
      gameStore.scanSteamGames()
    }, 30000)
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Erreur Installation',
      message: `Erreur: ${error.message || error}`,
      type: 'error'
    })
  }
}

const uninstallSteamGame = async (game: any) => {
  if (!game?.app_id) return
  try {
    await tauriAPI.uninstallSteamGame(game.app_id)
    alertStore.showAlert({
      title: 'Désinstallation Steam',
      message: `Demande de désinstallation envoyée à Steam pour ${game.game_name || game.name}.`,
      type: 'info'
    })
    setTimeout(() => {
      gameStore.scanSteamGames()
    }, 4000)
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Erreur Désinstallation',
      message: `Erreur: ${error.message || error}`,
      type: 'error'
    })
  }
}

const installEpicGame = async (game: any) => {
  if (!game?.app_name) return
  try {
    await tauriAPI.installEpicGame(game.app_name)
    alertStore.showAlert({
      title: 'Installation Epic Games',
      message: `Téléchargement lancé dans Epic Games pour ${game.game_name || game.name} !`,
      type: 'info'
    })
    setTimeout(() => {
      gameStore.scanEpicGames()
    }, 4000)
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Erreur Installation',
      message: `Erreur: ${error.message || error}`,
      type: 'error'
    })
  }
}

const uninstallEpicGame = async (game: any) => {
  if (!game?.app_name) return
  try {
    await tauriAPI.uninstallEpicGame(game.app_name)
    alertStore.showAlert({
      title: 'Désinstallation Epic Games',
      message: `Demande de désinstallation envoyée à Epic Games pour ${game.game_name || game.name}.`,
      type: 'info'
    })
    setTimeout(() => {
      gameStore.scanEpicGames()
    }, 4000)
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Erreur Désinstallation',
      message: `Erreur: ${error.message || error}`,
      type: 'error'
    })
  }
}

const launchGame = async (gameOrFolder: any) => {
  const game = typeof gameOrFolder === 'object' 
    ? gameOrFolder 
    : (gameStore.allUnifiedGames || []).find((g: any) => g.folder_name === gameOrFolder || g._id === gameOrFolder || g.app_id === gameOrFolder || g.app_name === gameOrFolder)

  if (game?.platform === 'steam' || game?.app_id) {
    try {
      await tauriAPI.launchSteamGame(game.app_id)
      runningGameId.value = game.folder_name || game.app_id
      alertStore.showAlert({
        title: 'Steam',
        message: `Lancement de ${game.game_name}...`,
        type: 'info'
      })
    } catch (error: any) {
      alertStore.showAlert({
        title: 'Launch Error',
        message: `Erreur lors du lancement Steam: ${error.message || error}`,
        type: 'error'
      })
    }
    return
  }

  if (game?.platform === 'epic' || game?.app_name) {
    try {
      await tauriAPI.launchEpicGame(game.app_name)
      runningGameId.value = game.app_name
      alertStore.showAlert({
        title: 'Epic Games',
        message: `Lancement de ${game.game_name}...`,
        type: 'info'
      })
    } catch (error: any) {
      alertStore.showAlert({
        title: 'Launch Error',
        message: `Erreur lors du lancement Epic Games: ${error.message || error}`,
        type: 'error'
      })
    }
    return
  }

  if (!(window as any).__TAURI__) return

  try {
    const installPath = localStorage.getItem('vextInstallPath') || localStorage.getItem('etherInstallPath')
    if (!installPath) {
      alertStore.showAlert({
        title: 'Configuration Error',
        message: 'Install path not configured.',
        type: 'warning'
      })
      return
    }

    const folderName = typeof gameOrFolder === 'string' ? gameOrFolder : gameOrFolder?.folder_name
    const userStore = useUserStore()
    const token = localStorage.getItem('token')
    const plainUser = userStore.user ? JSON.parse(JSON.stringify(userStore.user)) : null;
    
    const userData = { user: plainUser, token: token }
    await statsService.startSession(folderName);
    await tauriAPI.launchGame(installPath, folderName, userData)
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Launch Error',
      message: `Launch error: ${error.message}`,
      type: 'error'
    })
  }
}

// Social Actions
const toggleAddFriend = () => {
  showAddFriendInput.value = !showAddFriendInput.value
  if (showAddFriendInput.value) {
    showFilterMenu.value = false
    setTimeout(() => document.getElementById('lib-friend-input')?.focus(), 100)
  }
}

const toggleFilterMenu = () => {
  showFilterMenu.value = !showFilterMenu.value
  if (showFilterMenu.value) {
    showAddFriendInput.value = false
  }
}

const setFriendFilter = (filter: 'all' | 'online' | 'in-game') => {
  currentFriendFilter.value = filter
  showFilterMenu.value = false
}

const addFriend = async () => {
  if (!newFriendUsername.value.trim()) return
  
  isAddingFriend.value = true
  try {
    await friendsStore.sendFriendRequest(newFriendUsername.value.trim())
    newFriendUsername.value = ''
    alertStore.showAlert({
      title: 'Success',
      message: 'Request sent!',
      type: 'success'
    })
    showAddFriendInput.value = false
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.message || 'Error sending request',
      type: 'error'
    })
  } finally {
    isAddingFriend.value = false
  }
}

const toggleGroupsPanel = () => {
  showGroupsPanel.value = !showGroupsPanel.value
  if (showGroupsPanel.value) {
    showAddFriendInput.value = false
    showFilterMenu.value = false
  }
}

const toggleGroupExpand = (groupId: string) => {
  expandedGroupId.value = expandedGroupId.value === groupId ? null : groupId
}

const handleAddFriendFromGroup = async (username: string) => {
  try {
    await friendsStore.sendFriendRequest(username)
    alertStore.showAlert({
      title: 'Success',
      message: `Friend request sent to ${username}`,
      type: 'success'
    })
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.message || 'Failed to send request',
      type: 'error'
    })
  }
}
</script>

<template>
  <div class="library-layout">
    <!-- Main Content -->
    <div class="main-content">
        
        <!-- Header -->
        <div class="library-header">
            <div class="search-bar">
                <i class="fas fa-search"></i>
                <input v-model="searchQuery" placeholder="Search your games...">
            </div>
            <div class="filters">
                <button :class="{ active: showAllGames }" @click="showAllGames = !showAllGames" title="Afficher tous les jeux dans une seule liste">
                    <i class="fas fa-th"></i> All Games ({{ gameStore.allUnifiedGames.length }})
                </button>
                <button class="btn-icon" @click="showAddGameModal = true" title="Redeem Key"><i class="fas fa-key"></i></button>
            </div>
        </div>

        <div class="scroll-area">
            
            <!-- Recently Played -->
            <section v-if="recentlyPlayed.length > 0" class="section">
                <h3><i class="fas fa-clock"></i> Recently Played</h3>
                <div class="recent-row">
                    <div v-for="game in recentlyPlayed" :key="game._id || game.app_id" class="recent-card">
                        <div class="recent-bg" :style="{ backgroundImage: `url(${game.image_url || defaultGameImg})` }"></div>
                        <div class="recent-content">
                            <img :src="game.image_url || defaultGameImg" class="recent-logo" @error="(e: any) => onImageError(e, game)">
                            <div class="recent-info">
                                <h4>{{ game.game_name }}</h4>
                                <span class="status-text">
                                    <i v-if="game.platform === 'steam'" class="fab fa-steam"></i>
                                    {{ game.platform === 'steam' ? 'Steam' : 'Ready to Play' }}
                                </span>
                            </div>
                            <button @click="launchGame(game)" class="btn-play-sm" :title="'Play ' + game.game_name">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Featured / Favorites -->
            <section v-if="featuredLibrary.length > 0" class="section">
                <h3><i class="fas fa-star"></i> Featured</h3>
                <div class="featured-row">
                    <div v-for="game in featuredLibrary" :key="game._id || game.app_id" class="feat-card">
                        <img :src="game.image_url || defaultGameImg" @error="(e: any) => onImageError(e, game)">
                        <div class="feat-overlay">
                            <h4>{{ game.game_name }}</h4>
                            <button v-if="game.installed" @click="launchGame(game)" class="btn-action">PLAY</button>
                            <button v-else @click="installGame(game)" class="btn-action install-icon" title="Install">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Games Grid : Installed / Not Installed (ou All Games) -->
            <section v-for="section in gridSections" :key="section.key" class="section">
                <h3><i class="fas" :class="section.icon"></i> {{ section.title }} ({{ section.games.length }})</h3>
                <div class="games-grid">
                    <div v-for="game in section.games" :key="game._id || game.app_id" class="grid-card">
                        <div class="card-poster">
                            <img :src="game.image_url || defaultGameImg" :alt="game.game_name" loading="lazy" @load="onImageLoad" @error="(e: any) => onImageError(e, game)">
                            <div class="poster-overlay">
                                <div v-if="installingGameId === (game._id || game.folder_name)" class="install-status">
                                    <i class="fas fa-spinner fa-spin"></i> {{ installProgress.progress }}%
                                </div>
                                <template v-else-if="game.installed">
                                    <button @click="launchGame(game)" class="btn-grid-play" :title="game.platform === 'steam' ? 'Play on Steam' : game.platform === 'epic' ? 'Play on Epic Games' : 'Play'"><i class="fas fa-play"></i></button>
                                    <button v-if="game.platform === 'steam'" @click.stop="uninstallSteamGame(game)" class="btn-grid-uninstall" title="Désinstaller de Steam"><i class="fas fa-trash-alt"></i></button>
                                    <button v-else-if="game.platform === 'epic'" @click.stop="uninstallEpicGame(game)" class="btn-grid-uninstall" title="Désinstaller d'Epic Games"><i class="fas fa-trash-alt"></i></button>
                                </template>
                                <template v-else>
                                    <button v-if="game.platform === 'steam'" @click="installSteamGame(game)" class="btn-grid-install" title="Installer via Steam"><i class="fas fa-download"></i></button>
                                    <button v-else-if="game.platform === 'epic'" @click="installEpicGame(game)" class="btn-grid-install" title="Installer via Epic Games"><i class="fas fa-download"></i></button>
                                    <button v-else @click="installGame(game)" class="btn-grid-install" title="Install"><i class="fas fa-download"></i></button>
                                </template>
                            </div>
                        </div>
                        <div class="card-details">
                            <h4 :title="game.game_name">{{ game.game_name }}</h4>
                            <div class="card-badges">
                                <span v-if="game.platform === 'steam'" class="badge-steam"><i class="fab fa-steam"></i> STEAM</span>
                                <span v-else-if="game.platform === 'epic'" class="badge-epic"><i class="fas fa-bolt"></i> EPIC</span>
                                <span v-if="game.installed" class="badge-installed">INSTALLED</span>
                                <span v-else class="badge-not-installed">NOT INSTALLED</span>
                                <span class="badge-genre">{{ game.genre || 'Game' }}</span>
                            </div>
                        </div>
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
                <button @click="addFriend" :disabled="isAddingFriend" class="sidebar-btn-small">OK</button>
            </div>
        </div>

        <!-- Filter Menu -->
        <div v-if="showFilterMenu" class="sidebar-collapsible">
            <div class="filter-row">
                <button :class="['filter-pill', { active: currentFriendFilter === 'all' }]" @click="setFriendFilter('all')">All</button>
                <button :class="['filter-pill', { active: currentFriendFilter === 'online' }]" @click="setFriendFilter('online')">Online</button>
                <button :class="['filter-pill', { active: currentFriendFilter === 'in-game' }]" @click="setFriendFilter('in-game')">In-Game</button>
            </div>
        </div>

        <!-- Groups Panel -->
        <div v-if="showGroupsPanel" class="sidebar-collapsible groups-panel">
            <div class="groups-panel-header">
                <span>Recent Groups</span>
                <button @click="showGroupsPanel = false" class="icon-btn-mini"><i class="fas fa-times"></i></button>
            </div>
            <div v-if="groupStore.myGroups.length === 0" class="empty-groups">
                <i class="fas fa-users-slash"></i>
                <span>No groups yet</span>
            </div>
            <div v-else class="groups-compact-list">
                <div v-for="group in groupStore.myGroups.slice(0, 5)" :key="group.id" class="group-compact-item">
                    <div class="group-compact-header" @click="toggleGroupExpand(group.id)">
                        <div class="group-compact-info">
                            <span class="group-compact-name">{{ group.name }}</span>
                            <span class="group-compact-count">{{ group.members.length }} members</span>
                        </div>
                        <i :class="['fas', expandedGroupId === group.id ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                    </div>
                    <transition name="expand">
                        <div v-if="expandedGroupId === group.id" class="group-members-list">
                            <div class="group-members-actions">
                                <button class="btn-invite-all" title="Invite whole group to game">
                                    <i class="fas fa-gamepad"></i> Invite All
                                </button>
                            </div>
                            <div v-for="member in group.members.slice(0, 8)" :key="member.id" class="group-member-mini">
                                <div class="member-mini-avatar">
                                    <div class="status-dot" :class="member.is_online ? 'online' : 'offline'"></div>
                                </div>
                                <span class="member-mini-name">{{ member.username || ('User ' + member.id.slice(0, 6)) }}</span>
                                <button @click="handleAddFriendFromGroup(member.username || ('user' + member.id.slice(0, 6)))" class="btn-add-mini" title="Add Friend">
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
            <input placeholder="Search friends...">
        </div>

        <div class="friends-list">
            <div v-if="friendsStore.loading" class="loading-friends">
                <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            
            <template v-else>
                <div v-for="friend in filteredFriends" :key="friend.id" class="friend-item">
                    <div class="friend-avatar">
                        <img :src="friend.profile_pic || '/default-avatar.svg'" alt="Avatar">
                        <div class="status-dot" :class="friend.status"></div>
                    </div>
                    <div class="friend-info">
                        <div class="friend-name">{{ friend.username }}</div>
                        <div class="friend-status">{{ friend.status }}</div>
                    </div>
                    <button class="btn-msg" @click.stop="chatStore.openChat(friend)"><i class="fas fa-comment"></i></button>
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
        <h3>Redeem Game Key</h3>
        <input v-model="newGameKey" placeholder="XXXX-XXXX-XXXX" class="glass-input">
        <input v-model="newGameName" placeholder="Game Name (Optional)" class="glass-input">
        <button @click="handleAddGame" class="btn-neon full-width">Redeem</button>
      </div>
    </div>

    <InstallPathSelector ref="pathSelector" />
  </div>
</template>

<style scoped>
.library-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    height: 100%;
    background: transparent;
    color: var(--text-primary);
    overflow: hidden;
}

/* Main Content */
.main-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.library-header {
    padding: 20px 30px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: space-between;
    align-items: center;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    z-index: 10;
}

.search-bar {
    position: relative;
    width: 280px;
    max-width: 100%;
}
.search-bar input {
    width: 100%;
    padding: 10px 10px 10px 35px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    color: var(--text-primary);
}
.search-bar i {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: #b0b9c3;
}

.filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.filters button {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.filters button:hover, .filters button.active {
    background: rgba(255, 126, 179, 0.1);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
}
.filters button.btn-steam-tab:hover,
.filters button.btn-steam-tab.active {
    background: rgba(102, 192, 244, 0.12) !important;
    border-color: #66c0f4 !important;
    color: #66c0f4 !important;
}
.filters button.btn-epic-tab:hover,
.filters button.btn-epic-tab.active {
    background: rgba(255, 255, 255, 0.12) !important;
    border-color: #f5f5f5 !important;
    color: #ffffff !important;
}

.scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 30px;
}
.scroll-area::-webkit-scrollbar { width: 6px; }
.scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.section { margin-bottom: 40px; }
.section h3 {
    font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 20px;
    display: flex; align-items: center; gap: 10px;
}

/* Recently Played */
.recent-row {
    display: flex; gap: 20px; overflow-x: auto; padding-bottom: 10px;
}
.recent-card {
    min-width: 300px; height: 160px;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
    transition: transform 0.2s;
}
.recent-card:hover { transform: translateY(-4px); border-color: #ff7eb3; }

.recent-bg {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover; background-position: center;
    filter: brightness(0.4);
}
.recent-content {
    position: relative; z-index: 2;
    height: 100%; padding: 20px;
    display: flex; align-items: center; gap: 15px;
}
.recent-logo { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
.recent-info { flex: 1; }
.recent-info h4 { margin: 0; font-size: 1.1rem; }
.status-text { font-size: 0.8rem; color: #7afcff; }
.btn-play-sm {
    width: 40px; height: 40px; border-radius: 50%;
    background: #ff7eb3; border: none; color: white;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 10px rgba(255, 126, 179, 0.4);
}

/* Featured Row */
.featured-row { display: flex; gap: 15px; }
.feat-card {
    width: 180px; height: 240px;
    border-radius: 12px; overflow: hidden;
    position: relative;
    border: 1px solid rgba(255,255,255,0.1);
}
.feat-card img { width: 100%; height: 100%; object-fit: cover; }
.feat-overlay {
    position: absolute; bottom: 0; left: 0; width: 100%;
    padding: 15px;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    transform: translateY(100%); transition: transform 0.3s;
    display: flex; flex-direction: column; gap: 8px;
}
.feat-card:hover .feat-overlay { transform: translateY(0); }
.btn-action {
    background: #ff7eb3; border: none; color: white;
    padding: 6px; border-radius: 4px; cursor: pointer; font-weight: 700;
}
.btn-action.install { background: #7afcff; color: #120c18; }
.btn-action.install-icon { 
    background: #7afcff; color: #120c18; 
    width: 32px; height: 32px; 
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    padding: 0;
}

/* Grid */
.games-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;
}
.grid-card {
    background: var(--glass-bg);
    border-radius: 12px; padding: 10px;
    border: 1px solid var(--glass-border);
    transition: all 0.2s;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.grid-card:hover { background: rgba(255,255,255,0.08); transform: translateY(-4px); }

.card-poster {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    margin-bottom: 10px;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
}
.card-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.25s ease;
}
.card-poster { overflow: hidden; }
.card-poster::before {
    content: '';
    position: absolute; inset: -20px;
    background-image: var(--poster-bg, none);
    background-size: cover; background-position: center;
    filter: blur(18px) brightness(0.55);
    z-index: 0;
}
.card-poster img { position: relative; z-index: 1; }
.card-poster img.is-landscape {
    object-fit: contain !important;
    image-rendering: auto;
}
.poster-overlay {
    z-index: 2;
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.65);
    display: flex; align-items: center; justify-content: center;
    gap: 12px;
    opacity: 0; transition: opacity 0.2s;
}
.grid-card:hover .poster-overlay { opacity: 1; }

.btn-grid-play, .btn-grid-install {
    width: 48px; height: 48px; border-radius: 50%;
    border: none; font-size: 1.15rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s ease;
}
.btn-grid-play { background: #ff7eb3; color: white; box-shadow: 0 0 15px rgba(255, 126, 179, 0.5); }
.btn-grid-play:hover { transform: scale(1.08); box-shadow: 0 0 20px rgba(255, 126, 179, 0.8); }
.btn-grid-play i, .btn-play-sm i {
    font-size: 1.15rem;
    color: #ffffff;
    display: inline-block;
}
.btn-grid-play i { margin-left: 2px; }
.btn-grid-install { background: #7afcff; color: #120c18; box-shadow: 0 0 15px rgba(122, 252, 255, 0.5); }
.btn-grid-install:hover { transform: scale(1.08); box-shadow: 0 0 20px rgba(122, 252, 255, 0.8); }

.btn-grid-uninstall {
    width: 38px; height: 38px; border-radius: 50%;
    border: 1px solid rgba(248, 113, 113, 0.4);
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    font-size: 0.95rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}
.btn-grid-uninstall:hover {
    background: rgba(239, 68, 68, 0.85);
    color: white;
    transform: scale(1.1);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.5);
}

.card-details { min-width: 0; }
.card-details h4 { margin: 0 0 6px 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-badges { display: flex; flex-wrap: wrap; gap: 5px; font-size: 0.7rem; align-items: center; }
.badge-installed { color: #7afcff; background: rgba(122, 252, 255, 0.1); padding: 2px 6px; border-radius: 4px; }
.badge-not-installed {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.12);
    border: 1px solid rgba(148, 163, 184, 0.25);
    padding: 2px 6px;
    border-radius: 4px;
}
.badge-genre { color: var(--text-secondary); background: var(--glass-border); padding: 2px 6px; border-radius: 4px; }
.badge-steam {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #66c0f4;
    background: rgba(27, 40, 56, 0.9);
    border: 1px solid rgba(102, 192, 244, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow: 0 0 8px rgba(102, 192, 244, 0.15);
}
.badge-epic {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #ffffff;
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.35);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.15);
}

/* Sidebar */
.friends-sidebar {
    background: var(--glass-bg);
    border-left: 1px solid var(--glass-border);
    display: flex; flex-direction: column;
}
.sidebar-header {
    padding: 20px; display: flex; justify-content: space-between; align-items: center;
}
.sidebar-actions button {
    background: none; border: none; color: var(--text-secondary); cursor: pointer; margin-left: 10px;
    padding: 5px; border-radius: 4px; transition: all 0.2s;
}
.sidebar-actions button:hover, .sidebar-actions button.active { 
    color: white; background: rgba(255,255,255,0.1);
}

.sidebar-collapsible {
    padding: 10px 20px;
    background: rgba(0,0,0,0.2);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    animation: expand 0.2s ease-out;
}

.add-friend-row { display: flex; gap: 8px; }
.sidebar-input-container {
    flex: 1;
}
/* Deep selector to style the input inside the child component */
:deep(.autocomplete-input) {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 4px;
    padding: 6px 10px;
    color: white;
    font-size: 0.9rem;
}
:deep(.autocomplete-input):focus {
    border-color: #7afcff;
}

.sidebar-btn-small {
    background: #7afcff; color: #120c18; border: none; border-radius: 4px;
    padding: 0 12px; font-weight: bold; cursor: pointer;
}

.filter-row { display: flex; gap: 5px; }
.filter-pill {
    flex: 1; background: transparent; border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-muted); padding: 4px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
}
.filter-pill:hover { color: var(--text-primary); background: var(--glass-border); }
.filter-pill.active { border-color: #7afcff; color: #7afcff; background: rgba(122, 252, 255, 0.1); }

.search-friends {
    margin: 0 20px 20px; position: relative;
}
.search-friends input {
    width: 100%; padding: 8px 10px 8px 30px;
    background: var(--glass-bg); border: none; border-radius: 6px; color: var(--text-primary);
}
.search-friends i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #555; }

.friends-list { flex: 1; overflow-y: auto; padding: 0 20px 20px; }
.friend-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px; border-radius: 8px;
    transition: background 0.2s;
    cursor: pointer;
}
.friend-item:hover { background: rgba(255,255,255,0.05); }

.friend-avatar { position: relative; width: 36px; height: 36px; }
.friend-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.status-dot {
    position: absolute; bottom: 0; right: 0; width: 10px; height: 10px;
    border-radius: 50%; border: 2px solid #120c18;
}
.status-dot.online { background: #00ff00; }
.status-dot.offline { background: #555; }
.status-dot.in-game { background: #ff7eb3; }

.friend-info { flex: 1; overflow: hidden; }
.friend-name { font-weight: 600; font-size: 0.9rem; }
.friend-status { font-size: 0.75rem; color: #777; }

.btn-msg { background: none; border: none; color: #b0b9c3; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
.friend-item:hover .btn-msg { opacity: 1; }

/* Modals */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-glass {
  background: var(--bg-secondary); padding: 30px; border-radius: 16px; width: 400px;
  border: 1px solid var(--glass-border);
}
.glass-input {
  width: 100%; padding: 12px; margin-bottom: 15px;
  background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary);
}
.btn-neon {
  background: #ff7eb3; color: white; padding: 12px; border: none; border-radius: 8px; width: 100%; font-weight: 700; cursor: pointer;
}

/* Groups Panel - Enhanced */
.groups-panel {
  max-height: 400px; 
  overflow-y: auto;
  padding-bottom: 5px;
}
.groups-panel::-webkit-scrollbar { width: 4px; }
.groups-panel::-webkit-scrollbar-thumb { 
  background: rgba(255, 126, 179, 0.3); 
  border-radius: 2px; 
}
.groups-panel::-webkit-scrollbar-thumb:hover { background: rgba(255, 126, 179, 0.5); }

.groups-panel-header {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding-bottom: 12px; 
  border-bottom: 1px solid rgba(255, 126, 179, 0.1);
  margin-bottom: 12px;
}
.groups-panel-header span { 
  font-size: 0.85rem; 
  font-weight: 700; 
  color: #ff7eb3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.icon-btn-mini {
  background: rgba(255, 126, 179, 0.1); 
  border: none; 
  color: #ff7eb3;
  cursor: pointer; 
  padding: 6px 8px; 
  border-radius: 6px;
  transition: all 0.2s;
}
.icon-btn-mini:hover { 
  background: #ff7eb3; 
  color: white; 
  transform: scale(1.05);
}

.empty-groups {
  text-align: center; 
  padding: 30px 20px; 
  color: #888;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 12px;
}
.empty-groups i { 
  font-size: 2.5rem; 
  opacity: 0.3;
  color: #ff7eb3;
}
.empty-groups span { font-size: 0.85rem; }

.groups-compact-list { 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
}

.group-compact-item {
  background: linear-gradient(135deg, rgba(255, 126, 179, 0.05) 0%, rgba(122, 252, 255, 0.05) 100%);
  border-radius: 10px;
  border: 1px solid rgba(255, 126, 179, 0.15);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}
.group-compact-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #ff7eb3, #7afcff);
  opacity: 0;
  transition: opacity 0.3s;
}
.group-compact-item:hover {
  border-color: rgba(255, 126, 179, 0.4);
  box-shadow: 0 4px 12px rgba(255, 126, 179, 0.15);
  transform: translateY(-2px);
}
.group-compact-item:hover::before {
  opacity: 1;
}

.group-compact-header {
  padding: 12px 14px; 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  cursor: pointer; 
  transition: background 0.2s;
}
.group-compact-header:hover { 
  background: rgba(255, 126, 179, 0.08); 
}
.group-compact-header i {
  color: #ff7eb3;
  transition: transform 0.3s;
}

.group-compact-info { 
  flex: 1; 
  min-width: 0;
}
.group-compact-name {
  font-size: 0.9rem; 
  font-weight: 600; 
  display: block;
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.group-compact-count { 
  font-size: 0.72rem; 
  color: #7afcff;
  font-weight: 500;
}

.group-members-list {
  padding: 12px 14px 14px; 
  border-top: 1px solid rgba(255, 126, 179, 0.1);
  background: rgba(0, 0, 0, 0.2);
  animation: slideDown 0.25s ease-out;
}

.group-members-actions { 
  margin-bottom: 12px; 
}
.btn-invite-all {
  width: 100%; 
  background: linear-gradient(135deg, rgba(255, 126, 179, 0.2) 0%, rgba(255, 126, 179, 0.1) 100%);
  border: 1px solid rgba(255, 126, 179, 0.4);
  color: #ff7eb3; 
  padding: 8px 12px; 
  border-radius: 6px; 
  cursor: pointer;
  font-size: 0.8rem; 
  font-weight: 700; 
  display: flex; 
  align-items: center;
  justify-content: center; 
  gap: 8px; 
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.btn-invite-all:hover { 
  background: linear-gradient(135deg, #ff7eb3 0%, #ff5a9e 100%);
  color: white;
  border-color: #ff7eb3;
  box-shadow: 0 4px 12px rgba(255, 126, 179, 0.3);
  transform: translateY(-1px);
}

.group-member-mini {
  display: flex; 
  align-items: center; 
  gap: 10px;
  padding: 8px 10px; 
  border-radius: 6px; 
  margin-bottom: 5px;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
}
.group-member-mini:hover { 
  background: rgba(122, 252, 255, 0.08);
  transform: translateX(3px);
}

.member-mini-avatar {
  width: 28px; 
  height: 28px; 
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 126, 179, 0.2), rgba(122, 252, 255, 0.2));
  border: 2px solid rgba(122, 252, 255, 0.3);
  position: relative;
  display: flex; 
  align-items: center; 
  justify-content: center;
  flex-shrink: 0;
}
.member-mini-name { 
  flex: 1; 
  font-size: 0.82rem;
  color: var(--text-primary);
  font-weight: 500;
}

.btn-add-mini {
  width: 26px; 
  height: 26px; 
  border-radius: 50%;
  background: rgba(122, 252, 255, 0.15); 
  border: 1px solid rgba(122, 252, 255, 0.3);
  color: #7afcff;
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 0.7rem; 
  transition: all 0.3s;
  flex-shrink: 0;
}
.btn-add-mini:hover { 
  background: #7afcff; 
  color: #120c18;
  border-color: #7afcff;
  box-shadow: 0 0 12px rgba(122, 252, 255, 0.5);
  transform: scale(1.15);
}

.more-members {
  text-align: center; 
  padding: 10px; 
  font-size: 0.75rem; 
  color: #999;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  margin-top: 8px;
  font-style: italic;
}

/* Transitions */
@keyframes slideDown {
  from { 
    opacity: 0; 
    transform: translateY(-8px); 
    max-height: 0;
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
    max-height: 500px;
  }
}
.expand-enter-active { 
  animation: slideDown 0.3s ease-out; 
}
.expand-leave-active { 
  animation: slideDown 0.25s ease-in reverse; 
}

</style>
