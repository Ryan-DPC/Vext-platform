<template>
  <div class="bg-glow pink-glow"></div>
  <div class="bg-glow cyan-glow"></div>
</template>

<style scoped>
.bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.1;
  pointer-events: none;
  z-index: 0;
}
.pink-glow {
  top: -200px;
  left: -200px;
  background: #ff7eb3;
}
.cyan-glow {
  bottom: -200px;
  right: -200px;
  background: #7afcff;
}
</style>
