<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, ref } from 'vue'

const route = useRoute()

const isActive = (path: string) => computed(() => route.path === path || route.path.startsWith(path + '/'))

const navItems = [
  { name: 'Accueil', path: '/', icon: 'fas fa-home' },
  { name: 'Bibliothèque', path: '/library', icon: 'fas fa-gamepad' },
  { name: 'Boutique', path: '/store', icon: 'fas fa-shopping-bag' },
  { name: 'Marketplace', path: '/marketplace', icon: 'fas fa-exchange-alt' },
  { name: 'Social', path: '/social', icon: 'fas fa-users' },
  { name: 'Paramètres', path: '/settings', icon: 'fas fa-cog' }
]

const hoveredIndex = ref<number | null>(null)
</script>

<template>
  <aside class="sidebar" @mouseleave="hoveredIndex = null">
    <div class="logo-area">
      <img src="@/assets/images/logo.png" alt="VEXT" class="logo" />
    </div>

    <div class="nav-columns">
      <!-- Icons Column -->
      <div class="icons-column">
        <RouterLink 
          v-for="(item, index) in navItems" 
          :key="item.path" 
          :to="item.path" 
          class="icon-item"
          :class="{ 
            active: isActive(item.path).value,
            hovered: hoveredIndex === index
          }"
          @mouseenter="hoveredIndex = index"
        >
          <div class="icon">
              <i :class="item.icon"></i>
          </div>
          <div class="active-indicator" v-if="isActive(item.path).value"></div>
        </RouterLink>
      </div>

      <!-- Labels Column -->
      <div class="labels-column">
        <RouterLink 
          v-for="(item, index) in navItems" 
          :key="item.path" 
          :to="item.path" 
          class="label-item"
          :class="{ 
            active: isActive(item.path).value,
            hovered: hoveredIndex === index
          }"
          @mouseenter="hoveredIndex = index"
        >
          <span class="label">{{ item.name }}</span>
        </RouterLink>
      </div>
    </div>
    
    <div class="sidebar-footer">
      <!-- Optional footer content -->
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 60px; /* Slimmer collapsed width */
  height: 100vh;
  background: rgba(18, 12, 24, 0.2); /* 80% transparent (0.2 opacity) as requested */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  transition: width 0.3s ease, background 0.3s ease;
  z-index: 100;
  overflow: hidden; /* Prevent content spill during transition */
}

.sidebar:hover {
  width: 220px; /* Expand on hover */
  background: rgba(18, 12, 24, 0.95); /* Dark background only on hover for readability */
  backdrop-filter: blur(10px);
}

.logo-area {
  margin-bottom: 40px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.logo {
  width: 45px;
  height: 45px;
  object-fit: contain;
}

.nav-columns {
  display: flex;
  width: 100%;
  flex: 1;
}

/* Icons Column */
.icons-column {
  width: 60px; /* Fixed width matching collapsed state */
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.icon-item {
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-secondary);
  position: relative;
  transition: all 0.2s;
}

.icon {
  font-size: 1.2rem;
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-primary);
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 10px var(--accent-primary);
}

/* Labels Column */
.labels-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.sidebar:hover .labels-column {
  opacity: 1;
  transform: translateX(0);
}

.label-item {
  height: 50px;
  display: flex;
  align-items: center;
  padding-left: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
  font-weight: 600;
}

/* Shared Hover/Active States */
.icon-item:hover, .label-item:hover,
.icon-item.hovered, .label-item.hovered {
  color: var(--text-primary);
}

/* Apply background only to the label item or both if desired. 
   To make it look like a single row, we might want to apply bg to both or a container.
   Given the split, we apply a subtle bg to both.
*/
.icon-item.hovered, .label-item.hovered {
   background: rgba(255, 255, 255, 0.05);
}

.icon-item.active, .label-item.active {
  color: var(--accent-primary);
}

.icon-item.active {
  background: linear-gradient(90deg, rgba(255, 126, 179, 0.1) 0%, transparent 100%);
}

.label-item.active {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 126, 179, 0.1) 100%); /* Or continue the gradient */
  background: rgba(255, 126, 179, 0.05); /* Simplified for split layout */
}
</style>
