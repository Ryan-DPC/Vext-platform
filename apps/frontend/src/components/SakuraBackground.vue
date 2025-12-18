<script setup lang="ts">
const petals = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100 + '%',
  animationDuration: 15 + Math.random() * 15 + 's', // Slow duration (15-30s)
  animationDelay: '-' + (Math.random() * 20) + 's', // Start at random times
  opacity: 0.3 + Math.random() * 0.5,
  size: 10 + Math.random() * 10 + 'px'
}))
</script>

<template>
  <div class="sakura-container">
    <div 
      v-for="petal in petals" 
      :key="petal.id" 
      class="petal" 
      :style="{ 
        left: petal.left, 
        animationDuration: petal.animationDuration, 
        animationDelay: petal.animationDelay,
        opacity: petal.opacity,
        width: petal.size,
        height: petal.size
      }"
    ></div>
  </div>
</template>

<style scoped>
.sakura-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1; /* Behind everything */
  overflow: hidden;
  background: var(--bg-primary); 
  transition: background 0.3s ease;
}

.petal {
  position: absolute;
  top: -20px;
  background: linear-gradient(135deg, #ff7eb3, #ff758c);
  border-radius: 100% 0 100% 0;
  animation: fall linear infinite, sway ease-in-out infinite alternate;
  box-shadow: 0 0 5px rgba(255, 126, 179, 0.5);
}

@keyframes fall {
  0% {
    top: -10%;
    transform: rotate(0deg);
  }
  100% {
    top: 110%;
    transform: rotate(360deg);
  }
}

@keyframes sway {
  0% {
    margin-left: 0;
  }
  100% {
    margin-left: 50px;
  }
}
</style>
