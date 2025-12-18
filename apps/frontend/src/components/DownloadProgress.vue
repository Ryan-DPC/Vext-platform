<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { socketService } from '../services/socket'

const isVisible = ref(false)
const currentPhase = ref<string | null>(null)
const gameData = ref({
  gameId: '',
  gameName: ''
})
const progressData = ref({
  progress: 0,
  speed: '',
  downloaded: '',
  total: '',
  eta: ''
})
const errorMessage = ref('')

const show = (gameId: string, gameName: string) => {
  isVisible.value = true
  currentPhase.value = 'download'
  gameData.value = { gameId, gameName }
  progressData.value = {
    progress: 0,
    speed: '',
    downloaded: '',
    total: '',
    eta: ''
  }
  errorMessage.value = ''
}

const close = () => {
  isVisible.value = false
  currentPhase.value = null
}

// WebSocket event listeners
const handleProgress = (data: any) => {
  if (data.gameId !== gameData.value.gameId) return

  if (data.type === 'download') {
    currentPhase.value = 'download'
    progressData.value = {
      progress: parseFloat(data.progress) || 0,
      speed: data.speed || '',
      downloaded: data.downloaded || '',
      total: data.total || '',
      eta: data.eta || ''
    }
  } else if (data.type === 'extract') {
    currentPhase.value = 'extract'
    progressData.value.progress = parseFloat(data.progress) || 0
  }
}

const handleComplete = (data: any) => {
  if (data.gameId !== gameData.value.gameId) return
  currentPhase.value = 'complete'
  gameData.value.gameName = data.gameName || gameData.value.gameName
}

const handleError = (data: any) => {
  if (data.gameId !== gameData.value.gameId) return
  currentPhase.value = 'error'
  errorMessage.value = data.error || 'Une erreur est survenue'
}

onMounted(() => {
  socketService.on('installation:progress', handleProgress)
  socketService.on('installation:complete', handleComplete)
  socketService.on('installation:error', handleError)
})

onUnmounted(() => {
  socketService.off('installation:progress')
  socketService.off('installation:complete')
  socketService.off('installation:error')
})

defineExpose({ show, close })
</script>

<template>
  <div v-if="isVisible" class="progress-overlay" @click.self="close">
    <div class="progress-modal">
      <div class="progress-header">
        <h3>{{ gameData.gameName || 'Installation' }}</h3>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="progress-body">
        <div v-if="currentPhase === 'download'" class="phase-info">
          <div class="phase-title">📥 Téléchargement...</div>
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: progressData.progress + '%' }"></div>
          </div>
          <div class="progress-text">{{ progressData.progress }}%</div>
          
          <div class="stats">
            <div class="stat">
              <span class="label">Vitesse:</span>
              <span class="value">{{ progressData.speed || 'Calcul...' }}</span>
            </div>
            <div class="stat">
              <span class="label">Téléchargé:</span>
              <span class="value">{{ progressData.downloaded || '0 MB' }} / {{ progressData.total || '?' }}</span>
            </div>
            <div class="stat">
              <span class="label">Temps restant:</span>
              <span class="value">{{ progressData.eta || 'Calcul...' }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="currentPhase === 'extract'" class="phase-info">
          <div class="phase-title">📦 Extraction...</div>
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: progressData.progress + '%' }"></div>
          </div>
          <div class="progress-text">{{ progressData.progress }}%</div>
        </div>

        <div v-else-if="currentPhase === 'complete'" class="phase-info success">
          <div class="phase-title">✅ Installation terminée!</div>
          <p>{{ gameData.gameName }} est maintenant installé et prêt à jouer.</p>
          <button @click="close" class="btn-primary">Fermer</button>
        </div>

        <div v-else-if="currentPhase === 'error'" class="phase-info error">
          <div class="phase-title">❌ Erreur</div>
          <p>{{ errorMessage }}</p>
          <button @click="close" class="btn-secondary">Fermer</button>
        </div>
      </div>


<style scoped>
.progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.progress-modal {
  background: #1e1e1e;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #333;
}

.progress-header h3 {
  margin: 0;
  font-size: 1.4rem;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #888;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.progress-body {
  padding: 30px 20px;
}

.phase-info {
  text-align: center;
}

.phase-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #4a9eff;
}

.progress-bar-container {
  width: 100%;
  height: 30px;
  background: #2a2a2a;
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4a9eff, #6bb3ff);
  transition: width 0.3s ease;
  border-radius: 15px;
}

.progress-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 20px;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  margin-top: 20px;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #333;
}

.stat .label {
  color: #888;
}

.stat .value {
  color: #fff;
  font-weight: 600;
}

.success {
  color: #4CAF50;
}

.error {
  color: #f44336;
}

.phase-info p {
  margin: 20px 0;
  line-height: 1.5;
}

.btn-primary, .btn-secondary {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-secondary {
  background: #666;
  color: white;
}

.btn-secondary:hover {
  background: #555;
}
</style>
