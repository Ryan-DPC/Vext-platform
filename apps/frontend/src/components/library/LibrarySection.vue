<template>
  <div class="library-section" v-if="games.length > 0">
    <div class="section-header">
      <h2 class="section-title">{{ title }}</h2>
      <button class="view-all-btn" @click="$emit('view-all')">
        See all <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <div class="scroller-container">
      <button class="scroll-btn left" @click="scroll('left')" v-show="canScrollLeft">
        <i class="fas fa-chevron-left"></i>
      </button>

      <div class="games-row" ref="rowRef" @scroll="checkScroll">
        <GameCard
          v-for="game in games"
          :key="game.id"
          :game="game"
          @play="$emit('play', $event)"
          @click="$emit('click', $event)"
          @context="$emit('context', $event, $event)"
        />
      </div>

      <button class="scroll-btn right" @click="scroll('right')" v-show="canScrollRight">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import GameCard from './GameCard.vue';
import type { Game } from '../types/Game';

defineProps<{
  title: string;
  games: Game[];
}>();

defineEmits<{
  (e: 'view-all'): void;
  (e: 'play', game: Game): void;
  (e: 'click', game: Game): void;
  (e: 'context', event: MouseEvent, game: Game): void;
}>();

const rowRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(true);

const checkScroll = () => {
  if (!rowRef.value) return;
  const { scrollLeft, scrollWidth, clientWidth } = rowRef.value;
  canScrollLeft.value = scrollLeft > 0;
  // Use a small buffer (1px) for float calculation errors
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 1;
};

const scroll = (direction: 'left' | 'right') => {
  if (!rowRef.value) return;

  const scrollAmount = rowRef.value.clientWidth * 0.8; // Scroll 80% of width
  const targetScroll =
    direction === 'left'
      ? rowRef.value.scrollLeft - scrollAmount
      : rowRef.value.scrollLeft + scrollAmount;

  rowRef.value.scrollTo({
    left: targetScroll,
    behavior: 'smooth',
  });
};

onMounted(() => {
  checkScroll();
  // Re-check on window resize
  window.addEventListener('resize', checkScroll);
});
</script>

<style scoped>
.library-section {
  margin-bottom: 40px;
  position: relative;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 15px;
  padding: 0 40px; /* Align with scroll padding */
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.view-all-btn {
  background: none;
  border: none;
  color: #b0b9c3;
  font-size: 14px;
  cursor: pointer;
  padding: 5px 10px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-all-btn:hover {
  color: #ff7eb3;
}

.scroller-container {
  position: relative;
  /* Ensure hover effects (scale) don't get cut off by overflow */
  padding: 20px 0;
  margin: -20px 0; /* Compensate for padding */
}

.games-row {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 0 40px; /* Side padding */
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

.games-row::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 100%; /* Full height click area */
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 20;
  opacity: 0;
  transition:
    opacity 0.3s ease,
    background 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scroller-container:hover .scroll-btn {
  opacity: 1;
}

.scroll-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  color: #ff7eb3;
}

.scroll-btn.left {
  left: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.8), transparent);
}

.scroll-btn.right {
  right: 0;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.8), transparent);
}
</style>
