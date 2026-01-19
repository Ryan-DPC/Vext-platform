<script setup lang="ts">
import { useAlertStore } from '@/stores/alertStore';
import { storeToRefs } from 'pinia';

const store = useAlertStore();
const { isVisible, options } = storeToRefs(store);
const { handleConfirm, handleCancel } = store;
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" class="alert-overlay">
      <div class="alert-modal glass-panel" :class="options.type">
        <div class="alert-header">
          <h3>{{ options.title }}</h3>
        </div>

        <div class="alert-body">
          <p>{{ options.message }}</p>
        </div>

        <div class="alert-actions">
          <button v-if="options.showCancel" @click="handleCancel" class="btn-secondary">
            {{ options.cancelText }}
          </button>

          <button @click="handleConfirm" class="btn-primary" :class="options.type">
            {{ options.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

/* Premium Dark Styles */
.alert-modal {
  width: 90%;
  max-width: 450px;
  background: #1a1b26; /* Dark navy */
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transform: translateY(0);
}

.alert-header h3 {
  margin: 0 0 16px 0;
  font-size: 1.4rem;
  color: white;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.alert-body p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 30px;
}

.alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

button {
  padding: 12px 24px;
  border-radius: 50px; /* Pill */
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

button:hover {
  transform: scale(1.03);
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

.btn-primary {
  background: white;
  color: #120c18;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.btn-primary:hover {
  background: #f0f0f0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

/* Type variants for Primary Button */
.error .btn-primary {
  background: #ff4444;
  color: white;
  box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
}
.error .btn-primary:hover {
  background: #ff5c5c;
}

/* Warning variant - Destructive */
.warning .btn-primary {
  background: white;
  color: #ff4444; /* Red text for danger/warning */
  box-shadow: 0 4px 15px rgba(255, 68, 68, 0.2);
}
.warning .btn-primary:hover {
  background: #fff0f0; /* Slight red tint on hover */
  color: #ff2222;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .alert-modal {
  animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-leave-active .alert-modal {
  animation: modalSlideOut 0.2s ease-in;
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes modalSlideOut {
  from {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  to {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
  }
}
</style>
