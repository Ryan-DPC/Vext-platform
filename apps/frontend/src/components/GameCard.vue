<template>
  <div class="game-card">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button>Play</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  image?: string
}>()
</script>

<style scoped>
.game-card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
  width: 200px;
}
</style>
