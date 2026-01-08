<script setup lang="ts">
defineProps<{
  hoverEffect?: boolean;
}>();
</script>

<template>
  <div class="glass-card" :class="{ 'hover-effect': hoverEffect }">
    <slot></slot>
  </div>
</template>

<style scoped>
.glass-card {
  background: rgba(30, 25, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
}

.glass-card.hover-effect:hover {
  transform: translateY(-5px);
  border-color: #7afcff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
</style>
