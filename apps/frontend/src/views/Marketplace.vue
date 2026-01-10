<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMarketplaceStore } from '../stores/marketplaceStore'
import { useAlertStore } from '../stores/alertStore'
// import defaultGameImg from '@/assets/images/default-game.svg'
import { getApiUrl } from '../utils/url';
import BackgroundGlow from '../components/ui/BackgroundGlow.vue';
import GlassCard from '../components/ui/GlassCard.vue';
import GlassButton from '../components/ui/GlassButton.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';

const defaultGameImg = `${getApiUrl()}/public/default-game.svg`;
import tauriAPI from '../tauri-adapter';

const marketplaceStore = useMarketplaceStore()
const alertStore = useAlertStore()

const activeTab = ref('marketplace')
const showSellModal = ref(false)
const selectedGameForSale = ref('')
const sellPrice = ref(0)

// Filters
// Filters
const genreFilter = ref('')
const priceRange = ref(100) // Actual filter value (debounced/on change)
const displayPrice = ref(100) // Visual value for slider

onMounted(async () => {
  await Promise.all([
    marketplaceStore.fetchUsedGames(),
    marketplaceStore.fetchActiveSales(),
    marketplaceStore.fetchOwnedGames()
  ])
})

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'transactions') {
    marketplaceStore.fetchTransactions()
  }
}

// Update display price immediately, update filter price on change (mouse up)
const updatePrice = (event: Event) => {
  const target = event.target as HTMLInputElement
  displayPrice.value = Number(target.value)
}

const commitPrice = () => {
  priceRange.value = displayPrice.value
}

// Real-time filtering (watch priceRange which updates on change)
const debounce = (fn: Function, delay: number) => {
  let timeoutId: any
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

const fetchGamesDebounced = debounce(() => {
  marketplaceStore.fetchUsedGames({
    genre: genreFilter.value,
    maxPrice: priceRange.value
  })
}, 500)

watch([genreFilter, priceRange], () => {
  fetchGamesDebounced()
})



const openSellModal = async () => {
  await marketplaceStore.fetchOwnedGames()
  showSellModal.value = true
}

const handleSellGame = async () => {
  if (!selectedGameForSale.value || sellPrice.value <= 0) {
    alertStore.showAlert({
      title: 'Validation Error',
      message: 'Please fill all fields',
      type: 'warning'
    })
    return
  }

  try {
    await marketplaceStore.sellGame(selectedGameForSale.value, sellPrice.value)
    
    if ((window as any).__TAURI__) {
      const installPath = localStorage.getItem('etherInstallPath')
      const game = marketplaceStore.ownedGames.find((g: any) => g.game_key === selectedGameForSale.value)
      
      if (installPath && game) {
        try {
          await tauriAPI.uninstallGame(installPath, game.game_key)
          new Notification('Ether Desktop', { body: `🗑️ ${game.game_name} uninstalled (listed for sale).` })
        } catch (err) {
          console.error('Failed to uninstall game:', err)
        }
      }
    }

    alertStore.showAlert({
      title: 'Success',
      message: 'Game listed for sale!',
      type: 'success'
    })
    showSellModal.value = false
    selectedGameForSale.value = ''
    sellPrice.value = 0
    
    await marketplaceStore.fetchOwnedGames()
    await marketplaceStore.fetchActiveSales()
  } catch (error: any) {
    alertStore.showAlert({
      title: 'Error',
      message: error.response?.data?.message || 'Error listing game',
      type: 'error'
    })
  }
}

const buyUsedGame = async (game: any) => {
  const price = game.asking_price || 0
  if (await alertStore.showConfirm({
    title: 'Purchase Confirmation',
    message: `Buy "${game.game_name}" for ${price.toFixed(2)} CHF?`,
    type: 'info',
    confirmText: 'Buy',
    cancelText: 'Cancel'
  })) {
    try {
      await marketplaceStore.buyUsedGame(game.ownership_token, game.seller_id)
      alertStore.showAlert({
        title: 'Success',
        message: 'Purchase successful!',
        type: 'success'
      })
      await marketplaceStore.fetchUsedGames()
    } catch (error: any) {
      alertStore.showAlert({
        title: 'Error',
        message: error.response?.data?.message || 'Purchase failed',
        type: 'error'
      })
    }
  }
}

const cancelSale = async (ownershipToken: string) => {
  if (await alertStore.showConfirm({
    title: 'Cancel Sale',
    message: 'Cancel this sale?',
    type: 'warning',
    confirmText: 'Yes, Cancel',
    cancelText: 'No'
  })) {
    try {
      await marketplaceStore.cancelSale(ownershipToken)
      alertStore.showAlert({
        title: 'Success',
        message: 'Sale cancelled.',
        type: 'success'
      })
      await marketplaceStore.fetchActiveSales()
      await marketplaceStore.fetchOwnedGames()
    } catch (error: any) {
      alertStore.showAlert({
        title: 'Error',
        message: error.response?.data?.message || 'Error',
        type: 'error'
      })
    }
  }
}

// Stats logic
const platformCommission = ref(0)
const developerCommission = ref(0)
const netAmount = ref(0)

const updateCommissions = ()  => {
  const price = sellPrice.value
  platformCommission.value = price * 0.05
  developerCommission.value = price * 0.02
  netAmount.value = price - platformCommission.value - developerCommission.value
}

const gameStats = ref(null as any)

const updateGameStats = async () => {
  if (!selectedGameForSale.value) {
    gameStats.value = null
    return
  }
  gameStats.value = await marketplaceStore.fetchGameStats(selectedGameForSale.value)
}

// Watch for selection change to update stats
watch(selectedGameForSale, () => {
    updateGameStats()
})
</script>

<template>
  <div class="marketplace-container">
    <BackgroundGlow />

    <div class="marketplace-layout">
        
        <!-- Header -->
        <PageHeader title="Community Market">
             <div class="tabs">
                <button :class="{ active: activeTab === 'marketplace' }" @click="switchTab('marketplace')">Buy Games</button>
                <button :class="{ active: activeTab === 'selling' }" @click="switchTab('selling')">My Listings</button>
                <button :class="{ active: activeTab === 'transactions' }" @click="switchTab('transactions')">History</button>
            </div>
            <GlassButton variant="neon" @click="openSellModal"><i class="fas fa-plus"></i> Sell Game</GlassButton>
        </PageHeader>

        <!-- Buy Tab -->
        <div v-if="activeTab === 'marketplace'" class="tab-content">
            <div class="filters-container">
                <div class="filter-group">
                    <i class="fas fa-search filter-icon"></i>
                    <input v-model="genreFilter" placeholder="Search by Genre..." class="glass-input search-input">
                </div>
                
                <div class="filter-group price-group">
                    <label>Max Price: <span class="price-val">{{ displayPrice }} CHF</span></label>
                    <input 
                      type="range" 
                      :value="displayPrice" 
                      @input="updatePrice" 
                      @change="commitPrice"
                      min="0" max="200" 
                      class="slider"
                    >
                </div>
            </div>

            <div v-if="marketplaceStore.isLoading" class="listings-grid">
                 <SkeletonCard v-for="n in 8" :key="n" />
            </div>
            
            <div v-else class="listings-grid">
                <GlassCard v-for="game in marketplaceStore.usedGames" :key="game.ownership_token" class="listing-card" :hover-effect="true">
                    <div class="card-img">
                        <img :src="game.image_url || defaultGameImg" loading="lazy" decoding="async">
                        <div class="price-tag">{{ game.asking_price }} CHF</div>
                    </div>
                    <div class="card-body">
                        <h3>{{ game.game_name }}</h3>
                        <div class="seller-info">
                            <span>Seller: {{ game.seller_name }}</span>
                        </div>
                        <GlassButton full-width variant="primary" @click="buyUsedGame(game)">BUY NOW</GlassButton>
                    </div>
                </GlassCard>
            </div>
        </div>

        <!-- Selling Tab -->
        <div v-if="activeTab === 'selling'" class="tab-content">
            <div class="listings-grid">
                <GlassCard v-for="sale in marketplaceStore.activeSales" :key="sale.ownership_token" class="listing-card my-listing" :hover-effect="true">
                    <div class="card-img">
                        <img :src="sale.image_url || defaultGameImg" loading="lazy" decoding="async">
                        <div class="price-tag">{{ sale.asking_price }} CHF</div>
                    </div>
                    <div class="card-body">
                        <h3>{{ sale.game_name }}</h3>
                        <div class="status-badge">Active</div>
                        <GlassButton full-width variant="danger" @click="cancelSale(sale.ownership_token)">CANCEL SALE</GlassButton>
                    </div>
                </GlassCard>
            </div>
             <div v-if="marketplaceStore.activeSales.length === 0" class="empty-state">
                You have no active listings.
            </div>
        </div>

        <!-- Transactions Tab -->
        <div v-if="activeTab === 'transactions'" class="tab-content">
            <div class="transactions-list">
                <div v-for="tx in marketplaceStore.transactions" :key="tx.id" class="tx-item">
                    <div class="tx-info">
                        <span class="tx-type" :class="tx.type">{{ tx.type }}</span>
                        <span class="tx-game">{{ tx.game_name }}</span>
                    </div>
                    <div class="tx-amount">{{ tx.amount }} {{ tx.currency }}</div>
                    <div class="tx-date">{{ new Date(tx.created_at).toLocaleDateString() }}</div>
                </div>
            </div>
        </div>

    </div>

    <!-- Sell Modal -->
    <div v-if="showSellModal" class="modal-overlay" @click.self="showSellModal = false">
        <div class="modal-glass">
            <h3>Sell a Game</h3>
            <div class="form-group">
                <label>Select Game</label>
                <select v-model="selectedGameForSale" class="glass-select">
                    <option v-for="game in marketplaceStore.ownedGames" :key="game.game_key" :value="game.game_key">
                        {{ game.game_name }}
                    </option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Price (CHF)</label>
                <input type="number" v-model="sellPrice" @input="updateCommissions" class="glass-input">
            </div>

            <div class="commission-info" v-if="sellPrice > 0">
                <div class="row"><span>Platform Fee (5%)</span> <span>-{{ platformCommission.toFixed(2) }}</span></div>
                <div class="row"><span>Dev Fee (2%)</span> <span>-{{ developerCommission.toFixed(2) }}</span></div>
                <div class="row total"><span>You Receive</span> <span>{{ netAmount.toFixed(2) }}</span></div>
            </div>

            <div class="stats-info" v-if="gameStats">
                <p>Avg Price: {{ gameStats.avg_price }} CHF</p>
                <p>Active Listings: {{ gameStats.active_listings }}</p>
            </div>

            <GlassButton full-width variant="neon" @click="handleSellGame">List for Sale</GlassButton>
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

.marketplace-container {
  height: 100%; width: 100%;
  position: relative; overflow: hidden;
  background-color: transparent; color: white;
  padding: 20px;
}

.marketplace-layout {
    position: relative; z-index: 1;
    height: 100%; display: flex; flex-direction: column;
}

.header-section {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 30px;
}

.tabs { display: flex; gap: 10px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; }
.tabs button {
    background: transparent; border: none; color: #b0b9c3;
    padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;
    transition: all 0.2s;
}
.tabs button.active { background: #ff7eb3; color: white; box-shadow: 0 0 15px rgba(255, 126, 179, 0.3); }

.tab-content { flex: 1; overflow-y: auto; }

/* Filters */
.filters-container {
    display: flex; gap: 30px; align-items: center; margin-bottom: 30px;
    background: var(--glass-bg); padding: 20px 30px; border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08); /* Fixed var */
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.filter-group {
    position: relative;
    display: flex; align-items: center;
}

.filter-icon {
    position: absolute; left: 15px; color: #b0b9c3; pointer-events: none;
}

.search-input {
    padding: 12px 12px 12px 45px !important;
    width: 300px;
    background: var(--glass-bg);
    border: 1px solid rgba(255,255,255,0.08); /* Fixed var */
    border-radius: 12px;
    color: white; font-size: 0.95rem;
    transition: all 0.3s;
}
.search-input:focus {
    background: rgba(255,255,255,0.1);
    border-color: #ff7eb3;
    box-shadow: 0 0 15px rgba(255, 126, 179, 0.1);
    outline: none;
}

.price-group {
    display: flex; flex-direction: column; gap: 10px; min-width: 250px;
}
.price-group label {
    font-size: 0.9rem; color: #b0b9c3; display: flex; justify-content: space-between;
}
.price-val { color: #ff7eb3; font-weight: 700; }

.slider {
    -webkit-appearance: none; width: 100%; height: 6px;
    background: rgba(255,255,255,0.1); border-radius: 3px; outline: none;
}
.slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 16px; height: 16px; border-radius: 50%;
    background: #ff7eb3; cursor: pointer;
    box-shadow: 0 0 10px rgba(255, 126, 179, 0.5);
    transition: transform 0.2s;
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

/* Grid */
.listings-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;
}

.card-img { height: 140px; position: relative; }
.card-img img { width: 100%; height: 100%; object-fit: cover; }
.price-tag {
    position: absolute; bottom: 10px; right: 10px;
    background: #7afcff; color: #120c18;
    padding: 4px 8px; border-radius: 4px; font-weight: 800;
}

.card-body { padding: 16px; }
.card-body h3 { margin: 0 0 10px 0; font-size: 1.1rem; }
.seller-info { font-size: 0.85rem; color: #aaa; margin-bottom: 15px; }


/* Transactions */
.transactions-list { display: flex; flex-direction: column; gap: 10px; }
.tx-item {
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;
}
.tx-type { text-transform: uppercase; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; margin-right: 10px; }
.tx-amount { font-weight: 700; color: #7afcff; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-glass {
  background: #2b213a; padding: 30px; border-radius: 16px; width: 450px;
  border: 1px solid rgba(255,255,255,0.08); /* Fixed var */
}
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; color: #b0b9c3; }
/* .glass-select rules */
.glass-select { width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: white; border-radius: 6px; }

/* .glass-input is used in the modal, but .search-input needs its own padding. 
   We keep .glass-input for general inputs but ensure .search-input wins or we don't apply .glass-input to search.
   The simplest fix for the search input being 'glass-input search-input' is to remove the conflict.
*/
.glass-input { width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: white; border-radius: 6px; }

.commission-info {
    background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;
}
.row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem; color: #b0b9c3; }
.row.total { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px; color: #7afcff; font-weight: 700; }

.loading, .empty-state { text-align: center; padding: 40px; color: #777; }
</style>
