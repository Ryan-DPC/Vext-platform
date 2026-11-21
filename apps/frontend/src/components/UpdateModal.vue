<script setup lang="ts">
import { useUpdaterStore } from '@/stores/updaterStore'
import { computed } from 'vue'

const updaterStore = useUpdaterStore()

const formattedDownloaded = computed(() => {
  const mb = updaterStore.downloadedBytes / (1024 * 1024)
  return mb.toFixed(1)
})

const formattedTotal = computed(() => {
  const mb = updaterStore.totalBytes / (1024 * 1024)
  return mb.toFixed(1)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="updaterStore.isModalOpen && updaterStore.updateInfo" class="update-modal-overlay" @click.self="updaterStore.closeModal">
      <div class="update-modal">
        <div class="modal-header">
          <div class="header-icon">
            <i class="fas fa-rocket"></i>
          </div>
          <div>
            <h3>Mise à jour disponible</h3>
            <p class="subtitle">Une nouvelle version de VEXT est prête</p>
          </div>
          <button v-if="updaterStore.status !== 'downloading'" @click="updaterStore.closeModal" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="version-banner">
          <div class="version-badge current">
            <span class="label">Actuelle</span>
            <span class="val">v{{ updaterStore.updateInfo.current_version }}</span>
          </div>
          <div class="version-arrow">
            <i class="fas fa-arrow-right"></i>
          </div>
          <div class="version-badge new">
            <span class="label">Nouvelle</span>
            <span class="val">v{{ updaterStore.updateInfo.version }}</span>
          </div>
        </div>

        <div v-if="updaterStore.updateInfo.body" class="release-notes">
          <h4>Nouveautés & Corrections :</h4>
          <div class="notes-content">
            {{ updaterStore.updateInfo.body }}
          </div>
        </div>

        <!-- Download & Install Progress -->
        <div v-if="updaterStore.status === 'downloading'" class="progress-section">
          <div class="progress-labels">
            <span>Téléchargement et installation...</span>
            <span class="percent">{{ updaterStore.progress }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" :style="{ width: updaterStore.progress + '%' }"></div>
          </div>
          <div v-if="updaterStore.totalBytes > 0" class="bytes-info">
            {{ formattedDownloaded }} Mo / {{ formattedTotal }} Mo
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="updaterStore.status === 'error'" class="error-banner">
          <i class="fas fa-exclamation-triangle"></i>
          <span>{{ updaterStore.errorMessage || 'Échec de la mise à jour.' }}</span>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button 
            v-if="updaterStore.status !== 'downloading'" 
            @click="updaterStore.closeModal" 
            class="btn-secondary"
          >
            Plus tard
          </button>
          
          <button 
            v-if="updaterStore.status !== 'downloading'" 
            @click="updaterStore.startUpdate" 
            class="btn-primary"
          >
            <i class="fas fa-cloud-download-alt"></i> Mettre à jour maintenant
          </button>

          <button 
            v-else 
            disabled 
            class="btn-primary disabled"
          >
            <i class="fas fa-spinner fa-spin"></i> Installation en cours...
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(10, 6, 14, 0.75);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.update-modal {
  background: rgba(24, 18, 32, 0.95);
  border: 1px solid rgba(255, 126, 179, 0.3);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 126, 179, 0.2);
  border-radius: 16px;
  width: 480px;
  max-width: 90vw;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.header-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 126, 179, 0.25), rgba(122, 252, 255, 0.25));
  border: 1px solid rgba(255, 126, 179, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff7eb3;
  font-size: 1.3rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #ffffff;
  font-weight: 700;
}

.subtitle {
  margin: 2px 0 0 0;
  font-size: 0.85rem;
  color: #b0b9c3;
}

.btn-close {
  position: absolute;
  top: 0; right: 0;
  background: none;
  border: none;
  color: #888;
  font-size: 1rem;
  cursor: pointer;
  padding: 6px;
  transition: color 0.2s;
}
.btn-close:hover { color: #fff; }

.version-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
}

.version-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.version-badge .label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
}
.version-badge.current .val {
  font-size: 1rem;
  font-weight: 600;
  color: #b0b9c3;
}
.version-badge.new .val {
  font-size: 1.1rem;
  font-weight: 700;
  color: #7afcff;
}

.version-arrow {
  color: #ff7eb3;
  font-size: 1rem;
}

.release-notes {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px 14px;
  max-height: 120px;
  overflow-y: auto;
}
.release-notes h4 {
  margin: 0 0 6px 0;
  font-size: 0.8rem;
  color: #ff7eb3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.notes-content {
  font-size: 0.82rem;
  color: #d1d5db;
  line-height: 1.45;
  white-space: pre-wrap;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #b0b9c3;
}
.progress-labels .percent {
  font-weight: 700;
  color: #7afcff;
}
.progress-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff7eb3, #7afcff);
  transition: width 0.2s ease;
  box-shadow: 0 0 10px rgba(122, 252, 255, 0.5);
}
.bytes-info {
  font-size: 0.75rem;
  color: #777;
  text-align: right;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #b0b9c3;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.btn-primary {
  background: linear-gradient(135deg, #ff7eb3, #ff5c9e);
  border: none;
  color: white;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 0 15px rgba(255, 126, 179, 0.4);
  transition: all 0.2s;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 22px rgba(255, 126, 179, 0.7);
}
.btn-primary.disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
