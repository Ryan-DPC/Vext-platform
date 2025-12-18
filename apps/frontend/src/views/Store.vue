<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useItemStore } from '../stores/itemStore'
import { useUserStore } from '../stores/userStore'
import { useAlertStore } from '../stores/alertStore'
// import defaultGameImg from '@/assets/images/default-game.svg'
import { getApiUrl } from '../utils/url';
const defaultGameImg = `${getApiUrl()}/public/default-game.svg`;

const itemStore = useItemStore()
const userStore = useUserStore()
const alertStore = useAlertStore()
const typeFilter = ref('')
const rarityFilter = ref('')

onMounted(async () => {
  await itemStore.fetchStoreItems()
})

const applyFilters = () => {
  itemStore.fetchStoreItems({
    type: typeFilter.value,
    rarity: rarityFilter.value
  })
}

const buyItem = async (itemId: string, price: number) => {
  if (await alertStore.showConfirm({
    title: 'Purchase Confirmation',
    message: `Buy this item for ${price} VTX?`,
    type: 'info',
    confirmText: 'Buy',
    cancelText: 'Cancel'
  })) {
    try {
      const result = await itemStore.purchaseItem(itemId)
      alertStore.showAlert({
        title: 'Success',
        message: `Item purchased! Remaining VTX: ${result.remainingTokens}`,
        type: 'success'
      })
      await itemStore.fetchStoreItems()
    } catch (error: any) {
      alertStore.showAlert({
        title: 'Error',
        message: error.response?.data?.message || 'Purchase failed',
        type: 'error'
      })
    }
  }
}

const equipItem = async (itemId: string) => {
  try {
    await itemStore.equipItem(itemId)
    alertStore.showAlert({
      title: 'Success',
      message: 'Item equipped!',
      type: 'success'
    })
    await itemStore.fetchStoreItems()
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.response?.data?.message || 'Error',
      type: 'error'
    })
  }
}
</script>

<template>
  <div class="store-container">
    <!-- Background Glows -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <div class="store-layout">
      
      <!-- Sidebar Filters -->
      <div class="glass-panel sidebar">
        <div class="sidebar-header">
          <h2>Marketplace</h2>
        </div>
        
        <div class="filter-group">
          <label>Type</label>
          <select v-model="typeFilter" @change="applyFilters" class="glass-select">
            <option value="">All Types</option>
            <option value="profile_picture">Avatars</option>
            <option value="badge">Badges</option>
            <option value="banner">Banners</option>
            <option value="avatar_frame">Frames</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Rarity</label>
          <select v-model="rarityFilter" @change="applyFilters" class="glass-select">
            <option value="">All Rarities</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>

        <div class="promo-box">
          <h3>Special Offer</h3>
          <p>Get 50% off on all Epic items this weekend!</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <div class="content-header">
          <h1>Featured Items</h1>
          <div class="balance-display">
            <i class="fas fa-coins"></i> {{ userStore.user?.tokens?.toLocaleString() || 0 }} VTX
          </div>
        </div>

        <div v-if="itemStore.isLoading" class="loading-state">
          <i class="fas fa-circle-notch fa-spin"></i> Loading...
        </div>

        <div v-else class="items-grid">
          <div v-for="item in itemStore.storeItems" :key="item.id" class="item-card">
            <div class="card-preview">
              <img :src="item.image_url || defaultGameImg" loading="lazy" decoding="async">
              <div class="rarity-tag" :class="item.rarity">{{ item.rarity }}</div>
              <div v-if="item.owned" class="owned-overlay"><i class="fas fa-check"></i> Owned</div>
            </div>
            
            <div class="card-body">
              <h3>{{ item.name }}</h3>
              <p class="desc">{{ item.description || 'No description' }}</p>
              
              <div class="card-footer">
                <div class="price">
                  <i class="fas fa-coins"></i> {{ item.price }}
                </div>
                
                <button v-if="item.owned && !item.equipped" @click="equipItem(item.id)" class="btn-action equip">
                  EQUIP
                </button>
                <button v-else-if="item.equipped" class="btn-action equipped" disabled>
                  EQUIPPED
                </button>
                <button v-else @click="buyItem(item.id, item.price)" class="btn-action buy">
                  BUY
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="!itemStore.isLoading && itemStore.storeItems.length === 0" class="empty-grid">
            No items found matching your filters.
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Variables */
:root {
  --neon-pink: #ff7eb3;
  --neon-cyan: #7afcff;
  --glass-bg: rgba(30, 25, 40, 0.6);
}

.store-container {
  min-height: 100%; width: 100%;
  position: relative;
  background-color: transparent; color: white;
  padding: 20px;
  /* Removed height: 100% and overflow: hidden to allow full page scroll */
}

.bg-glow {
  position: absolute; width: 600px; height: 600px;
  border-radius: 50%; filter: blur(120px); opacity: 0.1; pointer-events: none;
}
.pink-glow { top: -200px; left: -200px; background: #ff7eb3; }
.cyan-glow { bottom: -200px; right: -200px; background: #7afcff; }

.store-layout {
  display: grid; grid-template-columns: 280px 1fr; gap: 24px;
  position: relative; z-index: 1;
  /* Removed height: 100% */
}

/* Sidebar */
.glass-panel {
  background: rgba(30, 25, 40, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 24px;
  display: flex; flex-direction: column; gap: 24px;
  height: fit-content; /* Only take needed height */
}

.sidebar-header h2 { margin: 0; font-size: 1.4rem; color: #ff7eb3; }

.filter-group label {
  display: block; margin-bottom: 8px; color: #b0b9c3; font-size: 0.9rem;
}

.glass-select {
  width: 100%; padding: 12px;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: white; cursor: pointer;
}
.glass-select:focus { outline: none; border-color: #7afcff; }

.promo-box {
  margin-top: 20px;
  background: linear-gradient(135deg, rgba(255, 126, 179, 0.2), rgba(122, 252, 255, 0.1));
  padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 126, 179, 0.3);
}
.promo-box h3 { margin: 0 0 10px 0; color: #ff7eb3; }
.promo-box p { margin: 0; font-size: 0.9rem; color: #eee; }

/* Main Content */
.main-content {
  display: flex; flex-direction: column;
  min-width: 0; /* Important for grid responsiveness */
}

.content-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
}
.content-header h1 { margin: 0; font-size: 2rem; }

.balance-display {
  background: rgba(255, 215, 0, 0.1); color: #ffd700;
  padding: 10px 20px; border-radius: 20px; font-weight: 700;
  border: 1px solid rgba(255, 215, 0, 0.3);
  display: flex; align-items: center; gap: 10px;
}

.items-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px; padding-bottom: 20px;
  /* Removed overflow-y: auto so it grows with content */
}

/* ... rest of item card styles ... */
.item-card {
  background: rgba(30, 25, 40, 0.6);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px; overflow: hidden;
  transition: all 0.3s;
}
.item-card:hover {
  transform: translateY(-5px);
  border-color: #7afcff;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.card-preview {
  height: 180px; position: relative; background: rgba(0,0,0,0.2);
  display: flex; align-items: center; justify-content: center;
}
.card-preview img { max-width: 80%; max-height: 80%; object-fit: contain; }

.rarity-tag {
  position: absolute; top: 10px; right: 10px;
  padding: 4px 8px; border-radius: 4px;
  font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
}
.rarity-tag.common { background: #888; color: white; }
.rarity-tag.rare { background: #4a9eff; color: white; }
.rarity-tag.epic { background: #9d4edd; color: white; }
.rarity-tag.legendary { background: #ffd700; color: black; }

.owned-overlay {
  position: absolute; bottom: 10px; left: 10px;
  background: rgba(0, 255, 0, 0.2); color: #00ff00;
  padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;
}

.card-body { padding: 16px; }
.card-body h3 { margin: 0 0 5px 0; font-size: 1rem; }
.desc { font-size: 0.8rem; color: #888; margin-bottom: 15px; height: 32px; overflow: hidden; }

.card-footer {
  display: flex; justify-content: space-between; align-items: center;
}
.price { color: #ffd700; font-weight: 700; }

.btn-action {
  padding: 6px 16px; border-radius: 6px; border: none;
  font-weight: 700; cursor: pointer; font-size: 0.8rem;
  transition: all 0.2s;
}
.btn-action.buy { background: #7afcff; color: #120c18; }
.btn-action.buy:hover { background: #fff; }
.btn-action.equip { background: #00ff00; color: #120c18; }
.btn-action.equipped { background: rgba(255,255,255,0.1); color: #888; cursor: default; }

.loading-state, .empty-grid {
  text-align: center; padding: 40px; color: #777; font-size: 1.2rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .store-layout {
    grid-template-columns: 220px 1fr;
    gap: 16px;
  }
  
  .glass-panel {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .store-layout {
    display: flex;
    flex-direction: column;
    padding-bottom: 40px;
  }

  .sidebar {
    width: 100%; /* Full width sidebar on mobile */
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    padding: 16px;
    margin-bottom: 20px;
  }

  .sidebar-header h2 { font-size: 1.2rem; margin-right: 15px; }

  .filter-group {
    margin-bottom: 0;
    min-width: 140px;
  }
  
  .promo-box {
    display: none;
  }

  /* .main-content no changes needed, it's just block flow now */

  .items-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      /* Let it flow */
  }
  
  .card-preview {
      height: 140px;
  }
}
</style>
