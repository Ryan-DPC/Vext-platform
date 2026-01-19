<template>
  <div class="game-card" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
    <!-- Image Container with Aspect Ratio -->
    <div class="image-container">
      <img
        :src="game.cover_url || game.coverInfo?.coverUrl || '/placeholder-game.jpg'"
        :alt="game.title"
        class="game-cover"
        loading="lazy"
      />

      <!-- Hover Overlay -->
      <transition name="fade">
        <div v-if="isHovered" class="overlay">
          <div class="actions">
            <button class="play-btn" @click.stop="$emit('play', game)">
              <i class="fas fa-play"></i>
            </button>
            <div class="secondary-actions">
              <button class="action-btn" title="Details" @click.stop="$emit('click', game)">
                <i class="fas fa-info"></i>
              </button>
              <button
                class="action-btn"
                title="Options"
                @click.stop="$emit('context', $event, game)"
              >
                <i class="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Title (Hidden on hover in some Netflix styles, but good to keep for clarity) -->
    <div class="info">
      <h3 class="game-title">{{ game.title || game.name }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Game } from '../types/Game';

defineProps<{
  game: Game;
}>();

defineEmits<{
  (e: 'click', game: Game): void;
  (e: 'play', game: Game): void;
  (e: 'context', event: MouseEvent, game: Game): void;
}>();

const isHovered = ref(false);
</script>

<style scoped>
.game-card {
  position: relative;
  width: 220px; /* Poster width */
  flex-shrink: 0;
  cursor: pointer;
  transition:
    transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
    box-shadow 0.3s ease;
  z-index: 1;
}

.game-card:hover {
  transform: scale(1.05);
  z-index: 10;
}

.image-container {
  position: relative;
  width: 100%;
  aspect-ratio: 2/3; /* Standard poster ratio */
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a2e;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.3s ease;
}

.game-card:hover .image-container {
  box-shadow: 0 0 20px rgba(255, 126, 179, 0.4); /* Neon accent glow */
  border: 1px solid rgba(255, 126, 179, 0.5);
}

.game-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.3s ease;
}

/* Darken image slightly on hover to make buttons pop */
.game-card:hover .game-cover {
  filter: brightness(0.6);
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.play-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%);
  border: none;
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 117, 140, 0.5);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 25px rgba(255, 117, 140, 0.8);
}

.secondary-actions {
  display: flex;
  gap: 15px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(5px);
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.info {
  margin-top: 10px;
  text-align: center;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.game-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.game-card:hover .info {
  opacity: 1;
  color: #ff7eb3;
}

/* Vue Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
