<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="content-header">
    <h1>{{ title }}</h1>
    <div class="header-actions">
        <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.content-header h1 {
  margin: 0;
  font-size: 2rem;
}
.header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}
</style>
