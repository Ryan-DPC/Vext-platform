<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h3>📁 Configuration du dossier d'installation</h3>
        <button @click="close" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <p>Choisissez où installer vos jeux VEXT.</p>
        <p class="info">Un sous-dossier "VEXT" sera créé automatiquement.</p>

        <div class="form-group">
          <label for="install-path">Chemin d'installation</label>
          <div class="input-with-button">
            <input
              id="install-path"
              v-model="installPath"
              type="text"
              placeholder="C:/Games ou D:/MesJeux"
              @keyup.enter="confirm"
            />
            <button v-if="isDesktop" @click="browseFolder" type="button" class="btn-browse">
              📁 Parcourir...
            </button>
          </div>
          <small class="hint">
            Exemples: C:/Games, D:/MesJeux, C:/Users/VotreNom/Documents/Games
          </small>
        </div>

        <div class="form-actions">
          <button @click="confirm" class="btn-primary" :disabled="!installPath">Confirmer</button>
          <button @click="close" class="btn-secondary">Annuler</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import tauriAPI from '../tauri-adapter';

const isVisible = ref(false);
const installPath = ref('');
const resolveCallback = ref<((value: string | null) => void) | null>(null);
const isDesktop = ref(false);

onMounted(async () => {
  // Check if running in Tauri
  if ((window as any).__TAURI__) {
    isDesktop.value = true;
  }
});

const show = (): Promise<string | null> => {
  installPath.value = '';
  isVisible.value = true;

  return new Promise((resolve) => {
    resolveCallback.value = resolve;
  });
};

const close = () => {
  isVisible.value = false;
  if (resolveCallback.value) {
    resolveCallback.value(null);
    resolveCallback.value = null;
  }
};

const confirm = () => {
  if (!installPath.value) return;

  isVisible.value = false;
  if (resolveCallback.value) {
    resolveCallback.value(installPath.value);
    resolveCallback.value = null;
  }
};

const browseFolder = async () => {
  if (!(window as any).__TAURI__) return;

  const selectedPath = await tauriAPI.selectFolder();
  if (selectedPath) {
    installPath.value = selectedPath;
  }
};

defineExpose({ show, close });
</script>

<style scoped>
.modal-overlay {
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

.modal-content {
  background: #1a1b26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: white;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: white;
}

.modal-body {
  padding: 30px;
}

.modal-body p {
  margin-bottom: 10px;
  color: #ccc;
}

.info {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #fff;
}

.input-with-button {
  display: flex;
  gap: 8px;
}

.form-group input {
  flex: 1;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-browse {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-browse:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.form-group input:focus {
  outline: none;
  border-color: white;
  background: rgba(255, 255, 255, 0.08);
}

.hint {
  display: block;
  margin-top: 8px;
  font-size: 0.85rem;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 50px; /* Pill shape */
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: white;
  color: #120c18;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: scale(1.02);
  background: #f0f0f0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.btn-primary:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
