<script setup lang="ts">
defineProps<{
  width?: string;
  height?: string;
  borderRadius?: string;
}>();
</script>

<template>
  <div 
    class="skeleton-loader" 
    :style="{ 
      width: width || '100%', 
      height: height || '1em',
      borderRadius: borderRadius || '4px' 
    }"
  ></div>
</template>

<style scoped>
.skeleton-loader {
  background: rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

.skeleton-loader::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
