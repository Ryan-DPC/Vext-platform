<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useAlertStore } from '../stores/alertStore'
import { useRouter } from 'vue-router'
import tauriAPI from '../tauri-adapter'
import { getApiUrl } from '../utils/url'
const defaultGameImg = `${getApiUrl()}/public/default-game.svg`
import heroBg from '@/assets/images/hero-bg.png'
import heroBg2 from '@/assets/images/hero-bg-2.png'
import heroBg3 from '@/assets/images/hero-bg-3.png'

const router = useRouter()
const gameStore = useGameStore()
const alertStore = useAlertStore()
const searchQuery = ref('')
const activeCategory = ref(localStorage.getItem('home_active_category') || 'trending')
const collectionFilter = ref<'all' | 'installed' | 'steam' | 'epic' | 'vext'>('all')

const multiplatformGames = computed(() => {
  let list = gameStore.allUnifiedGames || []
  if (collectionFilter.value === 'installed') {
    return list.filter((g: any) => g.installed)
  }
  if (collectionFilter.value === 'steam') {
    return list.filter((g: any) => g.platform === 'steam')
  }
  if (collectionFilter.value === 'epic') {
    return list.filter((g: any) => g.platform === 'epic')
  }
  if (collectionFilter.value === 'vext') {
    return list.filter((g: any) => !g.platform || g.platform === 'vext')
  }
  return list
})

const launchUnifiedGame = async (game: any) => {
  if (game?.platform === 'steam' || game?.app_id) {
    try {
      await tauriAPI.launchSteamGame(game.app_id)
      alertStore.showAlert({
        title: 'Steam',
        message: `Lancement de ${game.game_name}...`,
        type: 'info'
      })
    } catch (e: any) {
      alertStore.showAlert({
        title: 'Erreur Steam',
        message: `${e.message || e}`,
        type: 'error'
      })
    }
  } else if (game?.platform === 'epic' || game?.app_name) {
    try {
      await tauriAPI.launchEpicGame(game.app_name)
      alertStore.showAlert({
        title: 'Epic Games',
        message: `Lancement de ${game.game_name}...`,
        type: 'info'
      })
    } catch (e: any) {
      alertStore.showAlert({
        title: 'Erreur Epic Games',
        message: `${e.message || e}`,
        type: 'error'
      })
    }
  } else {
    router.push({ name: 'library' })
  }
}

const installUnifiedGame = async (game: any) => {
  if (game?.platform === 'steam' || game?.app_id) {
    try {
      await tauriAPI.installSteamGame(game.app_id)
      alertStore.showAlert({
        title: 'Installation Steam',
        message: `Téléchargement lancé dans Steam pour ${game.game_name} !`,
        type: 'info'
      })
      setTimeout(() => gameStore.scanSteamGames(), 4000)
    } catch (e: any) {
      alertStore.showAlert({
        title: 'Erreur Steam',
        message: `${e.message || e}`,
        type: 'error'
      })
    }
  } else if (game?.platform === 'epic' || game?.app_name) {
    try {
      await tauriAPI.installEpicGame(game.app_name)
      alertStore.showAlert({
        title: 'Installation Epic Games',
        message: `Téléchargement lancé dans Epic Games pour ${game.game_name} !`,
        type: 'info'
      })
      setTimeout(() => gameStore.scanEpicGames(), 4000)
    } catch (e: any) {
      alertStore.showAlert({
        title: 'Erreur Epic Games',
        message: `${e.message || e}`,
        type: 'error'
      })
    }
  } else {
    router.push({ name: 'library' })
  }
}
watch(activeCategory, (newVal) => {
  localStorage.setItem('home_active_category', newVal)
})

// Filtered Search Results
const searchResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return []
  const query = searchQuery.value.toLowerCase()
  return gameStore.games.filter((g: any) => 
    g.game_name.toLowerCase().includes(query)
  ).slice(0, 5) // Limit to 5 results
})

const selectGame = (gameId: string) => {
  goToGameDetails(gameId)
  searchQuery.value = '' // Clear search after selection
}

// Carousel State
const currentSlide = ref(0)
const slides = [
  {
    id: 1,
    title: 'VEXT CHESS:\nSTRATEGY EVOLVED',
    desc: 'Master the board in this futuristic take on the classic game. Ranked matches available now.',
    image: heroBg,
    badge: 'FEATURED'
  },
  {
    id: 2,
    title: 'CYBER LEGENDS:\nARENA',
    desc: 'Join the ultimate battle for supremacy in the neon-soaked arena.',
    image: heroBg2,
    badge: 'NEW SEASON'
  },
  {
    id: 3,
    title: 'NEON RACER:\nOVERDRIVE',
    desc: 'High-speed racing through the digital cityscape. Customize your ride.',
    image: heroBg3,
    badge: 'EARLY ACCESS'
  }
]

let slideInterval: any = null

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % slides.length
}

const goToGameDetails = (gameId: string) => {
  router.push({ name: 'game-details', params: { id: gameId } })
}

const handlePlayNow = (slide: any) => {
  // Extract main title part (before colon or newline)
  const title = slide.title.split(':')[0].split('\n')[0].trim().toLowerCase()
  
  // Find matching game in store
  const game = gameStore.games.find((g: any) => 
    g.game_name.toLowerCase().includes(title) || 
    title.includes(g.game_name.toLowerCase())
  )

  if (game) {
    goToGameDetails(game._id || game.id)
  } else {
    // Optional: Show a toast or alert
    alert('This game is coming soon!')
  }
}

const prevSlide = () => {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
}

const setSlide = (index: number) => {
  currentSlide.value = index
}

onMounted(async () => {
  await Promise.allSettled([
    gameStore.fetchHomeData(),
    gameStore.scanAllPlatforms()
  ])
  slideInterval = setInterval(nextSlide, 5000)
})

onUnmounted(() => {
  if (slideInterval) clearInterval(slideInterval)
})

const categories = [
  { id: 'trending', name: 'Trending', icon: 'fas fa-fire' },
  { id: 'new', name: 'New Releases', icon: 'fas fa-rocket' },
  { id: 'top', name: 'Top Rated', icon: 'fas fa-star' },
  { id: 'rpg', name: 'RPG', icon: 'fas fa-dungeon' },
  { id: 'strategy', name: 'Strategy', icon: 'fas fa-chess' }
]
</script>

<template>
  <div class="home-container">
    <!-- Ambient Background -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <div class="scroll-content">
      
      <!-- Centered Content Wrapper -->
      <div class="centered-wrapper">
        <!-- Hero Carousel Section -->
        <section class="hero-section">
          <div class="carousel-container">
            <div class="carousel-track" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
              <div v-for="slide in slides" :key="slide.id" class="hero-card">
                <img :src="slide.image" :alt="slide.title" class="hero-bg" />
                <div class="hero-overlay"></div>
                <div class="hero-content">
                  <div class="hero-text">
                    <div class="badge">{{ slide.badge }}</div>
                    <h1>{{ slide.title }}</h1>
                    <p>{{ slide.desc }}</p>
                    <div class="hero-actions">
                      <button class="btn-neon btn-play" @click="handlePlayNow(slide)">PLAY NOW</button>
                      <button class="btn-glass">WATCH TRAILER</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Carousel Controls -->
            <button class="carousel-nav prev" @click="prevSlide"><i class="fas fa-chevron-left"></i></button>
            <button class="carousel-nav next" @click="nextSlide"><i class="fas fa-chevron-right"></i></button>
            
          </div>
          
          <div class="carousel-dots">
            <button 
              v-for="(slide, index) in slides" 
              :key="slide.id" 
              class="dot" 
              :class="{ active: currentSlide === index }"
              @click="setSlide(index)"
            ></button>
          </div>
        </section>

        <!-- Multi-Platform Collection Section -->
        <section class="collection-section">
          <div class="collection-header-row">
            <div>
              <div class="collection-title-badge"><i class="fas fa-layer-group"></i> MULTI-LAUNCHER UNIFIÉ</div>
              <h2 class="collection-title">MA COLLECTION ({{ gameStore.allUnifiedGames.length }})</h2>
              <p class="collection-subtitle">Vos jeux Steam, Epic Games et VEXT réunis avec lancement &amp; installation directe</p>
            </div>
            <router-link to="/library" class="btn-all-library">
              Ouvrir la bibliothèque <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>

          <!-- Collection Filter Pills -->
          <div class="collection-pills">
            <button :class="{ active: collectionFilter === 'all' }" @click="collectionFilter = 'all'">
              Tous ({{ gameStore.allUnifiedGames.length }})
            </button>
            <button :class="{ active: collectionFilter === 'installed' }" @click="collectionFilter = 'installed'">
              <i class="fas fa-check-circle"></i> Installés ({{ gameStore.allUnifiedGames.filter((g: any) => g.installed).length }})
            </button>
            <button :class="{ active: collectionFilter === 'steam' }" @click="collectionFilter = 'steam'" class="pill-steam">
              <i class="fab fa-steam"></i> Steam ({{ gameStore.steamGames.length }})
            </button>
            <button :class="{ active: collectionFilter === 'epic' }" @click="collectionFilter = 'epic'" class="pill-epic">
              <i class="fas fa-bolt"></i> Epic ({{ gameStore.epicGames.length }})
            </button>
            <button :class="{ active: collectionFilter === 'vext' }" @click="collectionFilter = 'vext'">
              VEXT ({{ gameStore.myGames.length }})
            </button>
          </div>

          <!-- Collection Grid -->
          <div class="collection-grid">
            <div 
              v-for="game in multiplatformGames.slice(0, 12)" 
              :key="game._id || game.app_id || game.app_name" 
              class="collection-card"
            >
              <div class="collection-card-poster">
                <img :src="game.image_url || defaultGameImg" :alt="game.game_name" loading="lazy" />
                <div class="collection-overlay">
                  <button 
                    v-if="game.installed" 
                    @click="launchUnifiedGame(game)" 
                    class="btn-col-play" 
                    :title="game.platform === 'steam' ? 'Lancer sur Steam' : game.platform === 'epic' ? 'Lancer sur Epic Games' : 'Lancer'"
                  >
                    <i class="fas fa-play"></i>
                  </button>
                  <button 
                    v-else 
                    @click="installUnifiedGame(game)" 
                    class="btn-col-install" 
                    :title="game.platform === 'steam' ? 'Installer via Steam' : game.platform === 'epic' ? 'Installer via Epic Games' : 'Installer'"
                  >
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
              <div class="collection-card-info">
                <h4 :title="game.game_name">{{ game.game_name }}</h4>
                <div class="collection-badges">
                  <span v-if="game.platform === 'steam'" class="badge-mini-steam"><i class="fab fa-steam"></i> STEAM</span>
                  <span v-else-if="game.platform === 'epic'" class="badge-mini-epic"><i class="fas fa-bolt"></i> EPIC</span>
                  <span v-else class="badge-mini-vext">VEXT</span>
                  <span v-if="game.installed" class="badge-mini-installed">INSTALLÉ</span>
                  <span v-else class="badge-mini-not-installed">DISPO</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Discover Section -->
        <section class="discover-section">
          <div class="section-header">
            <h2>
              <!-- <img src="@/assets/images/sakura-branch.svg" alt="Sakura" class="title-decoration"> -->
              DISCOVER
            </h2>
          </div>

          <!-- Search & Filter -->
          <div class="filter-bar">
            <div class="search-input">
              <i class="fas fa-search search-icon"></i>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search games..."
                @keyup.enter="searchResults.length > 0 && selectGame(searchResults[0]._id || searchResults[0].id)"
              >
              
               <!-- Search Dropdown -->
              <div v-if="searchResults.length > 0" class="search-dropdown">
                <ul>
                  <li 
                    v-for="game in searchResults" 
                    :key="game._id || game.id"
                    @click="selectGame(game._id || game.id)"
                  >
                    <img :src="game.image_url || defaultGameImg" class="thumb">
                    <div class="info">
                        <span class="title">{{ game.game_name }}</span>
                        <span class="price">{{ game.price > 0 ? game.price + ' CHF' : 'FREE' }}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div class="categories-row">
              <button 
                v-for="cat in categories" 
                :key="cat.id"
                class="cat-pill"
                type="button"
                :class="{ active: activeCategory === cat.id }"
                @click.prevent="activeCategory = cat.id"
              >
                <i :class="cat.icon"></i> {{ cat.name }}
              </button>
            </div>
          </div>
        </section>
      </div>
      <!-- End Centered Wrapper -->

      <!-- Featured Games Grid (Full Width / Separate) -->
      <section class="games-grid-section">
        <div class="section-title">
          <i class="fas fa-gamepad"></i> FEATURED GAMES
        </div>
        
        <div class="games-grid">
          <div v-for="game in gameStore.getFilteredGames(activeCategory)" :key="game._id" class="game-card-neon">
            <div class="card-image">
              <img :src="game.image_url || defaultGameImg" alt="Game">
              <div class="card-overlay">
                <button class="btn-view" @click="goToGameDetails(game.id)">VIEW DETAILS</button>
              </div>
            </div>
            <div class="card-info">
              <h3>{{ game.game_name }}</h3>
              <div class="card-meta">
                <span class="genre">{{ game.genre || 'Action' }}</span>
                <span class="price" v-if="game.price > 0">{{ game.price }} CHF</span>
                <span class="price free" v-else>FREE</span>
              </div>
            </div>
          </div>
          
          <!-- Fallback if no games -->
          <!-- Fallback if no games -->
          <template v-if="gameStore.getFilteredGames(activeCategory).length === 0">
             <div class="no-games-placeholder">
                <p>No featured games available at the moment.</p>
             </div>
          </template>
        </div>
      </section>

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
  --text-main: var(--text-primary);
  --text-dim: var(--text-secondary);
}

.home-container {
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  background-color: transparent; /* Use global background */
  color: var(--text-primary);
}

/* Local glows removed in favor of global MainLayout glows */

.scroll-content {
  height: 100%;
  overflow-y: auto;
  padding: 30px;
  position: relative;
  z-index: 1;
}
.scroll-content::-webkit-scrollbar { width: 6px; }
.scroll-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

/* Centered Wrapper */
.centered-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Hero Section & Carousel */
.hero-section { margin-bottom: 50px; }

.carousel-container {
  position: relative;
  height: 450px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid var(--glass-border);
}

.carousel-track {
  display: flex;
  height: 100%;
  transition: transform 0.5s ease-in-out;
}

.hero-card {
  min-width: 100%;
  position: relative;
  height: 100%;
}

.hero-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: fill;
  object-position: center;
}

.hero-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(90deg, rgba(18,12,24,0.8) 0%, rgba(18,12,24,0.6) 70%, rgba(18,12,24,0.3) 100%);
}

.hero-content {
  position: relative; z-index: 2;
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 40px 60px;
}

.hero-text { width: 100%; max-width: 100%; }

.badge {
  background: linear-gradient(45deg, #ff7eb3, #ff758c);
  color: white;
  display: inline-block; padding: 6px 16px;
  border-radius: 20px; font-weight: 800; font-size: 0.8rem;
  margin-bottom: 16px; /* Reduced margin */
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(255, 118, 136, 0.4);
}

.hero-text h1 {
  font-size: 3rem; /* Reduced from 4rem */
  line-height: 1.1; 
  margin: 0 0 16px 0; /* Reduced margin */
  font-weight: 900;
  text-transform: uppercase;
  white-space: normal;
  background: linear-gradient(to right, #fff, #b0b9c3);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(255,255,255,0.1));
}

.hero-text p { 
  font-size: 1.1rem; 
  color: var(--text-secondary); 
  margin-bottom: 30px; /* Reduced from 40px */
  line-height: 1.5; 
  max-width: 80%; 
}

.hero-actions { display: flex; gap: 16px; }

.btn-neon {
  background: #ff7eb3; color: white;
  border: none; padding: 16px 40px;
  border-radius: 12px; font-weight: 800;
  box-shadow: 0 0 20px rgba(255, 126, 179, 0.4);
  cursor: pointer; transition: all 0.3s;
  text-transform: uppercase; letter-spacing: 1px;
}
.btn-neon:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(255, 126, 179, 0.6); }

.btn-glass {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  color: white; padding: 16px 40px;
  border-radius: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.3s;
  backdrop-filter: blur(10px);
  text-transform: uppercase; letter-spacing: 1px;
}
.btn-glass:hover { background: rgba(255,255,255,0.15); border-color: white; }

/* Carousel Controls */
.carousel-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
  color: white; width: 40px; height: 40px; border-radius: 50%;
  cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(-50%) scale(0.9);
}
.carousel-container:hover .carousel-nav {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.carousel-nav:hover { background: #ff7eb3; border-color: #ff7eb3; transform: translateY(-50%) scale(1.1) !important; }
.carousel-nav.prev { left: 20px; }
.carousel-nav.next { right: 20px; }

.carousel-dots {
  display: flex; 
  gap: 10px; 
  justify-content: center;
  margin-top: 20px;
}
.dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: rgba(255,255,255,0.3); border: none; cursor: pointer;
  transition: all 0.3s;
}
.dot.active { background: #ff7eb3; transform: scale(1.2); box-shadow: 0 0 10px #ff7eb3; }

/* Collection Section */
.collection-section {
  margin-bottom: 50px;
}

.collection-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.collection-title-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 126, 179, 0.15);
  color: #ff7eb3;
  border: 1px solid rgba(255, 126, 179, 0.3);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.collection-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  margin: 0 0 4px 0;
  color: #ffffff;
}

.collection-subtitle {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
}

.btn-all-library {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-all-library:hover {
  background: rgba(255, 126, 179, 0.15);
  border-color: #ff7eb3;
  color: #ff7eb3;
  transform: translateX(2px);
}

.collection-pills {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.collection-pills button {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.collection-pills button:hover,
.collection-pills button.active {
  background: rgba(255, 126, 179, 0.15);
  border-color: #ff7eb3;
  color: #ff7eb3;
}
.collection-pills button.pill-steam:hover,
.collection-pills button.pill-steam.active {
  background: rgba(102, 192, 244, 0.15) !important;
  border-color: #66c0f4 !important;
  color: #66c0f4 !important;
}
.collection-pills button.pill-epic:hover,
.collection-pills button.pill-epic.active {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: #ffffff !important;
  color: #ffffff !important;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 16px;
}

.collection-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  padding: 8px;
  transition: all 0.2s ease;
  overflow: hidden;
}
.collection-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 126, 179, 0.3);
  transform: translateY(-4px);
}

.collection-card-poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: #00000040;
}
.collection-card-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.collection-card:hover .collection-card-poster img {
  transform: scale(1.04);
}

.collection-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.collection-card:hover .collection-overlay {
  opacity: 1;
}

.btn-col-play,
.btn-col-install {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-col-play {
  background: #ff7eb3;
  color: #ffffff;
  box-shadow: 0 0 15px rgba(255, 126, 179, 0.6);
}
.btn-col-play:hover {
  transform: scale(1.1);
}
.btn-col-install {
  background: #7afcff;
  color: #120c18;
  box-shadow: 0 0 15px rgba(122, 252, 255, 0.6);
}
.btn-col-install:hover {
  transform: scale(1.1);
}

.collection-card-info {
  margin-top: 8px;
}
.collection-card-info h4 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #ffffff;
}

.collection-badges {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}
.badge-mini-steam {
  font-size: 0.62rem;
  font-weight: 700;
  color: #66c0f4;
  background: rgba(27, 40, 56, 0.9);
  border: 1px solid rgba(102, 192, 244, 0.4);
  padding: 1px 5px;
  border-radius: 4px;
}
.badge-mini-epic {
  font-size: 0.62rem;
  font-weight: 700;
  color: #ffffff;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.35);
  padding: 1px 5px;
  border-radius: 4px;
}
.badge-mini-vext {
  font-size: 0.62rem;
  font-weight: 700;
  color: #ff7eb3;
  background: rgba(255, 126, 179, 0.15);
  border: 1px solid rgba(255, 126, 179, 0.35);
  padding: 1px 5px;
  border-radius: 4px;
}
.badge-mini-installed {
  font-size: 0.62rem;
  font-weight: 600;
  color: #7afcff;
  background: rgba(122, 252, 255, 0.12);
  padding: 1px 5px;
  border-radius: 4px;
}
.badge-mini-not-installed {
  font-size: 0.62rem;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
  padding: 1px 5px;
  border-radius: 4px;
}

/* Discover Section */
.discover-section { 
  margin-bottom: 40px; 
  display: flex;
  flex-direction: column;
  align-items: center; /* Center everything in this section */
  text-align: center;
}

.section-header { 
  margin-bottom: 24px; 
  width: 100%;
  display: flex;
  justify-content: center;
}
.section-header h2 {
  font-size: 1.5rem; letter-spacing: 2px; margin: 0;
  color: #ff7eb3; font-weight: 700;
  display: flex; align-items: center; gap: 15px;
}

.title-decoration {
  height: 40px;
  width: auto;
  mix-blend-mode: lighten; /* Attempt to hide dark background */
  filter: brightness(1.2) contrast(1.1); /* Enhance visibility */
}

.filter-bar {
  display: flex; 
  flex-direction: column; /* Stack search and filters */
  gap: 20px; 
  align-items: stretch; /* Stretch children to match width */
  width: fit-content; /* Width determined by content (filters) */
  max-width: 100%; /* Ensure it doesn't overflow on small screens */
  margin: 0 auto; /* Center the whole block */
}

.search-input {
  position: relative;
  width: 80%;
  margin: 0 auto;
  width: 80%;
  margin: 0 auto;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  z-index: 100;
}

.search-input:focus-within {
  background: rgba(255,255,255,0.1);
  border-color: #7afcff;
  box-shadow: 0 0 20px rgba(122, 252, 255, 0.1);
}

.search-input input {
  width: 100%;
  padding: 14px 14px 14px 45px;
  background: transparent;
  border: none;
  color: var(--text-primary); 
  font-size: 1rem;
  outline: none;
}

.search-icon { 
  position: absolute; 
  left: 16px; 
  color: var(--text-secondary); 
  pointer-events: none;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 0 0 12px 12px;
  margin-top: 5px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.search-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-dropdown li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid var(--glass-border);
  transition: background 0.2s;
}

.search-dropdown li:last-child {
  border-bottom: none;
}

.search-dropdown li:hover {
  background: rgba(255, 126, 179, 0.1);
}

.search-dropdown .thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.search-dropdown .info {
  display: flex;
  flex-direction: column;
}

.search-dropdown .title {
  font-weight: bold;
  font-size: 0.95rem;
  color: var(--text-primary);
  text-align: left;
}

.search-dropdown .price {
  font-size: 0.8rem;
  color: #ff7eb3;
  text-align: left;
}

.categories-row { 
  display: flex; 
  gap: 10px; 
  flex-wrap: wrap; 
  justify-content: center; /* Center the pills */
}

.cat-pill {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex; align-items: center; gap: 8px; font-weight: 600;
}

.cat-pill:hover, .cat-pill.active {
  background: transparent;
  border-color: #ff7eb3;
  color: var(--text-primary);
  box-shadow: 0 0 15px rgba(255, 126, 179, 0.1);
}

.cat-pill:hover i, .cat-pill.active i {
  color: #ff7eb3;
}

/* Games Grid */
.games-grid-section { margin-bottom: 50px; }

.section-title { 
    font-size: 1.2rem; font-weight: 700;
    display: flex; align-items: center; gap: 10px; color: var(--text-secondary);
    margin-bottom: 24px;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  /* If user wants grid full width, we don't constrain it. 
     If they want it aligned with the rest but "except the grid" meant something else...
     I'll leave it unconstrained here, but maybe add padding if it touches edges too much.
     The parent .scroll-content has 30px padding.
  */
}

.game-card-neon {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  position: relative;
  display: flex; flex-direction: column;
}

.game-card-neon:hover {
  transform: translateY(-8px);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.card-image {
  height: 180px;
  position: relative;
  overflow: hidden;
}

.card-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.game-card-neon:hover .card-image img { transform: scale(1.1); }

.card-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(18,12,24,0.8);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s;
  backdrop-filter: blur(2px);
}
.game-card-neon:hover .card-overlay { opacity: 1; }

.btn-view {
  background: transparent;
  border: 1px solid #ff7eb3; color: #ff7eb3;
  padding: 10px 24px; border-radius: 30px;
  font-weight: 700; cursor: pointer;
  transition: all 0.3s;
}
.btn-view:hover { background: #ff7eb3; color: white; box-shadow: 0 0 20px rgba(255, 126, 179, 0.4); }

.card-info { padding: 20px; flex: 1; display: flex; flex-direction: column; }
.card-info h3 { margin: 0 0 10px 0; font-size: 1.1rem; color: var(--text-primary); }

.card-meta { 
    display: flex; justify-content: space-between; align-items: center; 
    margin-top: auto; 
}
.genre { 
    font-size: 0.8rem; color: var(--text-secondary); 
    background: var(--glass-border); padding: 4px 10px; border-radius: 6px;
}
.price { color: #ff7eb3; font-weight: 700; }
.price.free { color: #ff7eb3; }

</style>
