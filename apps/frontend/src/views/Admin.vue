<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import axios from 'axios'

const userStore = useUserStore()
const router = useRouter()

const syncStatus = ref<any>(null)
const isLoading = ref(false)
const isSyncing = ref(false)
const lastSyncResults = ref<any>(null)

onMounted(async () => {
  // Check if user is admin
  if (!userStore.user?.isAdmin) {
    router.push('/home')
    return
  }
  await fetchSyncStatus()
})

const fetchSyncStatus = async () => {
  isLoading.value = true
  try {
    const response = await axios.get('/admin/sync-status')
    syncStatus.value = response.data
  } catch (error) {
    console.error('Failed to fetch sync status:', error)
    alert('Erreur lors de la récupération du statut')
  } finally {
    isLoading.value = false
  }
}

const syncGames = async (force: boolean = false) => {
  if (!confirm(force ? 'Force sync ALL games?' : 'Sync changed games?')) {
    return
  }

  isSyncing.value = true
  try {
    const response = await axios.post('/admin/sync-games', { force })
    
    const data = response.data
    lastSyncResults.value = data
    
    if (data.success) {
      const synced = data.results.filter((r: any) => r.success && !r.skipped).length
      const skipped = data.results.filter((r: any) => r.skipped).length
      const failed = data.results.filter((r: any) => !r.success).length
      
      alert(`Sync terminé!\nSynchronisés: ${synced}\nIgnorés: ${skipped}\nÉchecs: ${failed}`)
      await fetchSyncStatus()
    } else {
      alert('Erreur: ' + data.error)
    }
  } catch (error) {
    console.error('Sync failed:', error)
    alert('Erreur lors de la synchronisation')
  } finally {
    isSyncing.value = false
  }
}

const syncDB = async () => {
  if (!confirm('Sync database? (Not implemented yet)')) {
    return
  }

  try {
    const response = await axios.post('/admin/sync-db')
    
    const data = response.data
    alert(data.message || 'DB sync complet')
  } catch (error) {
    console.error('DB sync failed:', error)
    alert('Erreur lors de la synchro DB')
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Jamais synchronisé'
  return new Date(dateString).toLocaleString('fr-FR')
}
</script>

<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1>🛠️ Admin Panel</h1>
      <p>Gestion des jeux de développement et synchronisation</p>
    </div>

    <div class="admin-content">
      <!-- Action Buttons -->
      <div class="action-cards">
        <div class="action-card">
          <div class="card-icon">🎮</div>
          <h3>Sync Games</h3>
          <p>Synchronise les jeux modifiés depuis le dossier /me vers Cloudinary</p>
          <div class="button-group">
            <button 
              @click="syncGames(false)" 
              :disabled="isSyncing"
              class="btn btn-primary"
            >
              {{ isSyncing ? 'Syncing...' : 'Sync Changes' }}
            </button>
            <button 
              @click="syncGames(true)" 
              :disabled="isSyncing"
              class="btn btn-warning"
            >
              Force Sync All
            </button>
          </div>
        </div>

        <div class="action-card">
          <div class="card-icon">💾</div>
          <h3>Sync Database</h3>
          <p>Synchronise la base de données (placeholder)</p>
          <button @click="syncDB" class="btn btn-secondary">
            Sync DB
          </button>
        </div>

        <div class="action-card">
          <div class="card-icon">🔄</div>
          <h3>Refresh Status</h3>
          <p>Recharge le statut de synchronisation</p>
          <button @click="fetchSyncStatus" :disabled="isLoading" class="btn btn-secondary">
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <!-- Sync Status -->
      <div class="status-section">
        <h2>📊 Statut de Synchronisation</h2>
        
        <div v-if="isLoading" class="loading">Chargement...</div>
        
        <div v-else-if="syncStatus" class="games-status">
          <div v-for="(game, slug) in syncStatus.games" :key="slug" class="game-status-card">
            <div class="game-status-header">
              <h3>{{ game.gameName }}</h3>
              <span class="slug">{{ slug }}</span>
            </div>
            <div class="game-status-info">
              <div class="info-row">
                <span class="label">Prix:</span>
                <span class="value">{{ game.price }} CHF</span>
              </div>
              <div class="info-row">
                <span class="label">Actif:</span>
                <span :class="['value', game.enabled ? 'enabled' : 'disabled']">
                  {{ game.enabled ? '✅ Oui' : '❌ Non' }}
                </span>
              </div>
              <div class="info-row">
                <span class="label">Dernière sync:</span>
                <span class="value">{{ formatDate(syncStatus.syncStatus[slug]?.lastSync) }}</span>
              </div>
              <div v-if="syncStatus.syncStatus[slug]?.checksum" class="info-row">
                <span class="label">Checksum:</span>
                <span class="value checksum">{{ syncStatus.syncStatus[slug].checksum.substring(0, 16) }}...</span>
              </div>
            </div>
          </div>
          
          <p v-if="!syncStatus?.games || Object.keys(syncStatus.games).length === 0" class="no-games">
            Aucun jeu trouvé dans slug.json
          </p>
        </div>
      </div>

      <!-- Last Sync Results -->
      <div v-if="lastSyncResults" class="results-section">
        <h2>📋 Derniers Résultats</h2>
        <div class="results-grid">
          <div 
            v-for="result in lastSyncResults.results" 
            :key="result.game"
            :class="['result-card', result.success ? 'success' : 'error']"
          >
            <div class="result-header">
              <span class="game-name">{{ result.game }}</span>
              <span class="status-icon">
                {{ result.success ? (result.skipped ? '⏭️' : '✅') : '❌' }}
              </span>
            </div>
            <div v-if="result.skipped" class="result-message">Pas de changements</div>
            <div v-else-if="result.success" class="result-details">
              <div>📦 {{ (result.size / 1024).toFixed(2) }} KB</div>
              <div class="url-link">
                <a :href="result.url" target="_blank">Voir sur Cloudinary →</a>
              </div>
            </div>
            <div v-else class="result-error">{{ result.error }}</div>
          </div>
        </div>
      </div>

      <!-- Info Section -->
      <div class="info-section">
        <h2>ℹ️ Information</h2>
        <ul>
          <li><strong>Synchronisation automatique:</strong> Toutes les heures</li>
          <li><strong>Dossier source:</strong> <code>/me</code></li>
          <li><strong>Détection:</strong> Checksum basé sur manifest.json et fichiers</li>
          <li><strong>Upload:</strong> Cloudinary (folder: games/dev)</li>
          <li><strong>Format:</strong> ZIP incluant tous les fichiers (sauf node_modules)</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  color: #fff;
}

.admin-header {
  margin-bottom: 40px;
}

.admin-header h1 {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.admin-header p {
  color: #aaa;
  font-size: 1.1rem;
}

.admin-content h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #fff;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.action-card {
  background: #2a2a2a;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  border: 2px solid #3a3a3a;
  transition: all 0.3s;
}

.action-card:hover {
  border-color: #4a9eff;
  transform: translateY(-5px);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.action-card h3 {
  font-size: 1.3rem;
  margin-bottom: 10px;
}

.action-card p {
  color: #aaa;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4a9eff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3a8eef;
}

.btn-warning {
  background: #ff9800;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #f57c00;
}

.btn-secondary {
  background: #666;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #777;
}

.status-section, .results-section, .info-section {
  background: #2a2a2a;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
}

.games-status {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.game-status-card {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #3a3a3a;
}

.game-status-header {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #3a3a3a;
}

.game-status-header h3 {
  margin-bottom: 5px;
  font-size: 1.2rem;
}

.slug {
  background: #3a3a3a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: monospace;
  color: #4a9eff;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 0.9rem;
}

.label {
  color: #aaa;
}

.value {
  color: #fff;
  font-weight: 500;
}

.value.enabled {
  color: #4CAF50;
}

.value.disabled {
  color: #f44336;
}

.checksum {
  font-family: monospace;
  font-size: 0.75rem;
  color: #888;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.result-card {
  padding: 15px;
  border-radius: 8px;
  border: 2px solid;
}

.result-card.success {
  background: #1a2a1a;
  border-color: #4CAF50;
}

.result-card.error {
  background: #2a1a1a;
  border-color: #f44336;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.game-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.status-icon {
  font-size: 1.5rem;
}

.result-message, .result-details, .result-error {
  font-size: 0.9rem;
  color: #ccc;
}

.url-link a {
  color: #4a9eff;
  text-decoration: none;
  font-size: 0.85rem;
}

.url-link a:hover {
  text-decoration: underline;
}

.info-section ul {
  list-style: none;
  padding: 0;
}

.info-section li {
  padding: 12px 0;
  border-bottom: 1px solid #3a3a3a;
  color: #ccc;
}

.info-section li:last-child {
  border-bottom: none;
}

.info-section code {
  background: #1a1a1a;
  padding: 2px 6px;
  border-radius: 3px;
  color: #4a9eff;
  font-family: monospace;
}

.loading, .no-games {
  text-align: center;
  padding: 40px;
  color: #888;
}
</style>
