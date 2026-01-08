<script setup lang="ts">
import GlassCard from './GlassCard.vue';
import SkeletonLoader from './SkeletonLoader.vue';
</script>

<template>
  <GlassCard>
    <div class="skeleton-preview">
      <SkeletonLoader width="60%" height="60%" border-radius="8px" />
    </div>
    <div class="skeleton-body">
      <SkeletonLoader width="80%" height="1.2em" style="margin-bottom: 8px;" />
      <SkeletonLoader width="40%" height="0.8em" style="margin-bottom: 16px;" />
      <div class="skeleton-footer">
        <SkeletonLoader width="30%" height="1em" />
        <SkeletonLoader width="40%" height="32px" border-radius="6px" />
      </div>
    </div>
  </GlassCard>
</template>

<style scoped>
.skeleton-preview {
  height: 180px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-body {
  padding: 16px;
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
