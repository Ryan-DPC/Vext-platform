<template>
  <div class="library-view">
    <!-- Hero Banner (Featured Game) -->
    <div class="hero-banner" v-if="featuredGame">
      <div class="hero-backdrop">
        <img
          :src="featuredGame.cover_url || '/placeholder-game.jpg'"
          alt="Featured"
          class="hero-bg"
        />
        <div class="hero-gradient"></div>
      </div>

      <div class="hero-content">
        <h1 class="hero-title">{{ featuredGame.title }}</h1>
        <p class="hero-description">{{ featuredGame.description }}</p>

        <div class="hero-actions">
          <button class="play-btn-large" @click="playGame(featuredGame)">
            <i class="fas fa-play"></i> Play Now
          </button>
          <button class="details-btn" @click="showDetails(featuredGame)">
            <i class="fas fa-info-circle"></i> More Info
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
    </div>

    <!-- Library Sections -->
    <div class="library-content" v-else>
      <LibrarySection
        title="Recently Played"
        :games="recentGames"
        @play="playGame"
        @click="showDetails"
      />

      <LibrarySection title="My Games" :games="allGames" @play="playGame" @click="showDetails" />

      <LibrarySection
        title="Favorites"
        :games="favoriteGames"
        @play="playGame"
        @click="showDetails"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import LibrarySection from '../components/library/LibrarySection.vue';
import type { Game } from '../types/Game';
import axios from '../utils/axiosConfig';

const loading = ref(true);
const games = ref<Game[]>([]); // All user games

// Computed sections
const allGames = computed(() => games.value);
const recentGames = computed(() => games.value.slice(0, 5)); // Mock: just take first 5
const favoriteGames = computed(() => games.value.filter((g) => g.rating && g.rating > 4)); // Mock filter

const featuredGame = computed(() => {
  if (games.value.length === 0) return null;
  return games.value[Math.floor(Math.random() * games.value.length)];
});

const loadGames = async () => {
  try {
    loading.value = true;
    // Fetch from API
    // const response = await axios.get('/library/my-games');
    // games.value = response.data.data;

    // Mock data for immediate preview
    setTimeout(() => {
      games.value = [
        {
          id: '1',
          title: 'Cyberpunk 2077',
          description: 'Action RPG in Night City.',
          cover_url: 'https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg',
          rating: 5,
        },
        {
          id: '2',
          title: 'Elden Ring',
          description: 'Open world action RPG.',
          cover_url: 'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_Art.jpg',
          rating: 5,
        },
        {
          id: '3',
          title: 'Hades',
          description: 'God-like rogue-like dungeon crawler.',
          cover_url: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Hades_cover_art.jpg',
          rating: 5,
        },
        {
          id: '4',
          title: 'Minecraft',
          description: 'Build anything you can imagine.',
          cover_url: 'https://upload.wikimedia.org/wikipedia/en/5/51/Minecraft_cover.png',
          rating: 4,
        },
        {
          id: '5',
          title: 'Valorant',
          description: '5v5 character-based tactical shooter.',
          cover_url: 'https://upload.wikimedia.org/wikipedia/en/0/07/Valorant_cover_art.jpg',
          rating: 4,
        },
        {
          id: '6',
          title: 'League of Legends',
          description: 'MOBA game.',
          cover_url:
            'https://upload.wikimedia.org/wikipedia/en/2/2a/League_of_Legends_Logo_2019.png',
          rating: 3,
        },
      ];
      loading.value = false;
    }, 800);
  } catch (error) {
    console.error('Failed to load games', error);
    loading.value = false;
  }
};

const playGame = (game: Game) => {
  console.log('Play', game.title);
  // Launch logic here
};

const showDetails = (game: Game) => {
  console.log('Details', game.title);
  // Modal logic here
};

onMounted(() => {
  loadGames();
});
</script>

<style scoped>
.library-view {
  min-height: 100vh;
  background: #0a0a0f;
  color: white;
  padding-bottom: 50px;
  overflow-x: hidden;
}

/* Hero Banner */
.hero-banner {
  position: relative;
  height: 70vh; /* Cinematic height */
  width: 100%;
  display: flex;
  align-items: flex-end;
  padding-bottom: 60px;
}

.hero-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
}

.hero-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(to top, #0a0a0f 10%, rgba(10, 10, 15, 0.6) 50%, rgba(10, 10, 15, 0.4) 100%),
    linear-gradient(to right, #0a0a0f 30%, transparent 70%);
}

.hero-content {
  position: relative;
  z-index: 2;
  width: 50%;
  padding-left: 60px;
}

.hero-title {
  font-size: 5rem;
  font-weight: 800;
  margin: 0 0 20px;
  line-height: 1;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
  /* Neon text effect */
  background: linear-gradient(to right, #fff, #b0b9c3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 1.2rem;
  color: #d1d5db;
  margin-bottom: 30px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  max-width: 600px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-actions {
  display: flex;
  gap: 20px;
}

.play-btn-large {
  padding: 15px 40px;
  font-size: 1.5rem;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  background: white;
  color: black;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition:
    transform 0.2s,
    background 0.2s;
}

.play-btn-large:hover {
  background: #ff7eb3;
  transform: scale(1.05);
}

.details-btn {
  padding: 15px 30px;
  font-size: 1.5rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: rgba(109, 109, 110, 0.7);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: background 0.2s;
}

.details-btn:hover {
  background: rgba(109, 109, 110, 0.4);
}

.library-content {
  position: relative;
  z-index: 10;
  margin-top: -50px; /* Pull sections up over banner */
}

.loading-container {
  height: 50vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 126, 179, 0.3);
  border-top-color: #ff7eb3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Animations */
.library-section {
  animation: slideUp 0.8s ease-out forwards;
  opacity: 0;
  transform: translateY(30px);
}

.library-section:nth-child(1) {
  animation-delay: 0.1s;
}
.library-section:nth-child(2) {
  animation-delay: 0.3s;
}
.library-section:nth-child(3) {
  animation-delay: 0.5s;
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
