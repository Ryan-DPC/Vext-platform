<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'neon' | 'glass';
  disabled?: boolean;
  fullWidth?: boolean;
}>();
</script>

<template>
  <button 
    class="glass-btn" 
    :class="[variant, { 'full-width': fullWidth }]" 
    :disabled="disabled"
  >
    <slot></slot>
  </button>
</template>

<style scoped>
.glass-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
}

.glass-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Variants */
.glass-btn.primary {
  background: #7afcff;
  color: #120c18;
}
.glass-btn.primary:hover:not(:disabled) {
  background: #fff;
  box-shadow: 0 0 15px rgba(122, 252, 255, 0.4);
}

.glass-btn.success {
  background: #00ff00;
  color: #120c18;
}

.glass-btn.danger {
  background: rgba(255, 77, 77, 0.2);
  color: #ff4d4d;
  border: 1px solid #ff4d4d;
}
.glass-btn.danger:hover:not(:disabled) {
  background: rgba(255, 77, 77, 0.4);
}

.glass-btn.neon {
  background: #ff7eb3;
  color: white;
}
.glass-btn.neon:hover:not(:disabled) {
  box-shadow: 0 0 15px rgba(255, 126, 179, 0.5);
}

.glass-btn.glass {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}
.glass-btn.glass:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.full-width {
  width: 100%;
}
</style>
