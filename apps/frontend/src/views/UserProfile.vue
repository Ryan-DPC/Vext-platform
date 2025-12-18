<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
import { getApiUrl } from '../utils/url'

const route = useRoute()
const userId = route.params.userId as string

const user = ref<any>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const response = await axios.get(`/users/${userId}`)
    user.value = response.data.user
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Utilisateur introuvable'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <p>Chargement du profil...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <h2>❌ Erreur</h2>
      <p>{{ error }}</p>
      <RouterLink to="/home" class="back-link">← Retour à l'accueil</RouterLink>
    </div>

    <!-- Profile Content -->
    <div v-else-if="user">
      <!-- Profile Header -->
      <header class="profile-header">
        <div class="profile-header-section">
          <div class="profile-avatar">
            <img :src="user.profile_pic || `${getApiUrl()}/public/default-game.svg`">
          </div>
          <div class="profile-info">
            <h1>{{ user.username || 'Utilisateur' }}</h1>
            <p class="profile-title">Joueur</p>
            <div class="profile-stats">
              <span class="stat-item">
                <strong>Elo:</strong> {{ user.elo || 1000 }}
              </span>
              <span class="stat-item">
                <strong>Veltrix Credits (VTX):</strong> {{ user.tokens || 0 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <nav class="profile-nav">
          <ul>
            <li>
              <a class="active">À propos</a>
            </li>
          </ul>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="profile-main">
        <div class="about-section">
          <div class="profile-left-column">
            <!-- Information Section -->
            <section class="profile-section">
              <h3>Informations</h3>
              <div class="info-detail">
                <div class="info-row">
                  <span class="info-label">Membre depuis</span>
                  <span class="info-value">{{ new Date(user.created_at || Date.now()).toLocaleDateString() }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Elo</span>
                  <span class="info-value">{{ user.elo || 1000 }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Rang</span>
                  <span class="info-value">{{ user.rank || 'Joueur' }}</span>
                </div>
              </div>
            </section>

            <!-- Badges Section -->
            <section class="badges profile-section">
              <h3>Badges</h3>
              <p>Badges publics non disponibles</p>
            </section>
          </div>

          <div class="profile-right-column">
            <!-- Skills Section -->
            <section class="profile-section">
              <h3>Compétences</h3>
              <ul class="skills-list">
                <li>Jeux multijoueurs</li>
                <li>Jeux de stratégie</li>
                <li>Jeux de réflexion</li>
                <li>Jeux compétitifs</li>
              </ul>
            </section>
          </div>
        </div>

        <RouterLink to="/home" class="back-link">← Retour à l'accueil</RouterLink>
      </main>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  color: #fff;
}

.loading-state, .error-state {
  text-align: center;
  padding: 80px 20px;
}

.error-state h2 {
  color: #ff4444;
  margin-bottom: 16px;
}

.back-link {
  display: inline-block;
  margin-top: 24px;
  padding: 12px 24px;
  background: #333;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.2s;
}

.back-link:hover {
  background: #444;
}

.profile-header {
  background: #2a2a2a;
  padding: 30px;
  border-bottom: 1px solid #3a3a3a;
}

.profile-header-section {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info h1 {
  font-size: 2rem;
  margin-bottom: 8px;
}

.profile-title {
  color: #aaa;
  margin-bottom: 16px;
}

.profile-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  color: #ccc;
}

.profile-nav ul {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}

.profile-nav a {
  padding: 12px 20px;
  color: #aaa;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-nav a.active {
  color: #4a9eff;
  border-bottom-color: #4a9eff;
}

.profile-main {
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.about-section {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
}

.profile-section {
  background: #2a2a2a;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.profile-section h3 {
  margin-bottom: 16px;
  font-size: 1.3rem;
}

.info-detail .info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #3a3a3a;
}

.info-label {
  color: #aaa;
}

.info-value {
  color: #fff;
}

.badges p {
  color: #aaa;
}

.skills-list {
  list-style: none;
  padding: 0;
}

.skills-list li {
  padding: 8px 0;
  color: #ccc;
}

@media (max-width: 900px) {
  .about-section {
    grid-template-columns: 1fr;
  }
}
</style>
