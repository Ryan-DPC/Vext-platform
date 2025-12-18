<script setup lang="ts">
import { useAlertStore } from '@/stores/alertStore'
import { storeToRefs } from 'pinia'

const store = useAlertStore()
const { isVisible, options } = storeToRefs(store)
const { handleConfirm, handleCancel } = store
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
                    <button v-if="options.showCancel" 
                            @click="handleCancel" 
                            class="btn-secondary">
                        {{ options.cancelText }}
                    </button>
                    
                    <button @click="handleConfirm" 
                            class="btn-primary"
                            :class="options.type">
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

.alert-modal {
    width: 90%;
    max-width: 450px;
    background: #1a1a1a;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transform: translateY(0);
}

.alert-header h3 {
    margin: 0 0 16px 0;
    font-size: 1.5rem;
    color: #fff;
}

.alert-body p {
    color: #ccc;
    font-size: 1.1rem;
    line-height: 1.5;
    margin-bottom: 24px;
}

.alert-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

button {
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: transform 0.2s;
}

button:hover {
    transform: translateY(-2px);
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

.btn-primary {
    background: #00dc82;
    color: #000;
}

/* Type variants */
.error .btn-primary {
    background: #ff4444;
    color: white;
}

.warning .btn-primary {
    background: #ff9800;
    color: black;
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
    animation: modalSlideIn 0.3s ease-out;
}

.fade-leave-active .alert-modal {
    animation: modalSlideOut 0.3s ease-in;
}

@keyframes modalSlideIn {
    from { transform: scale(0.9) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes modalSlideOut {
    from { transform: scale(1) translateY(0); opacity: 1; }
    to { transform: scale(0.9) translateY(20px); opacity: 0; }
}
</style>
