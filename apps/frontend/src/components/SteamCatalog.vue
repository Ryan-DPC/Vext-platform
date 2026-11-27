<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useGameStore } from '../stores/gameStore'
import { useSteamPurchaseStore } from '../stores/steamPurchaseStore'

interface CatalogApp {
  appid: number
  name: string
  is_free: boolean
  price: { final: number; initial: number; discount_percent: number; final_formatted?: string; initial_formatted?: string } | null
  image_url: string
  store_url: string
}

const gameStore = useGameStore()
const purchase = useSteamPurchaseStore()

const lists = ref<Record<string, CatalogApp[]>>({})
const results = ref<CatalogApp[]>([])
const query = ref('')
const activeList = ref<'top_sellers' | 'specials' | 'new_releases' | 'coming_soon'>('top_sellers')
const loading = ref(false)
const error = ref('')

const tabs = [
  { key: 'top_sellers', label: 'Top ventes' },
  { key: 'specials', label: 'Promotions' },
  { key: 'new_releases', label: 'Nouveautés' },
  { key: 'coming_soon', label: 'Bientôt' }
] as const

const ownedIds = computed(() => new Set(gameStore.steamGames.map((g: any) => String(g.app_id))))
const isSearching = computed(() => query.value.trim().length >= 2)
const shown = computed(() => (isSearching.value ? results.value : lists.value[activeList.value] || []))

onMounted(async () => {
  loading.value = true
  try {
    lists.value = (await axios.get('/steam-catalog/featured')).data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Catalogue Steam indisponible'
  } finally {
    loading.value = false
  }
})

let timer: any = null
watch(query, (q) => {
  clearTimeout(timer)
  if (q.trim().length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      results.value = (await axios.get('/steam-catalog/search', { params: { q: q.trim(), limit: 30 } })).data
    } catch {
      results.value = []
    }
  }, 300)
})

const priceLabel = (app: CatalogApp) =>
  app.is_free ? 'Gratuit' : app.price ? (app.price.final_formatted || `${(app.price.final / 100).toFixed(2)}`) : 'Voir sur Steam'

// Une image absente ou en 404 (jeu sans header) est masquée plutôt que cassée
const hideImage = (e: Event) => ((e.target as HTMLImageElement).style.visibility = 'hidden')
</script>

<template>
  <section class="steam-catalog">
    <div class="sc-head">
      <div class="sc-title"><i class="fab fa-steam"></i> STEAM</div>
      <div class="sc-search">
        <i class="fas fa-search"></i>
        <input v-model="query" placeholder="Rechercher dans le catalogue Steam..." />
      </div>
    </div>

    <div v-if="!isSearching" class="sc-tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: activeList === t.key }" @click="activeList = t.key">
        {{ t.label }}
      </button>
    </div>

    <p v-if="error" class="sc-msg">{{ error }}</p>
    <p v-else-if="loading" class="sc-msg">Chargement...</p>
    <p v-else-if="shown.length === 0" class="sc-msg">{{ isSearching ? 'Aucun résultat.' : 'Aucun jeu à afficher.' }}</p>

    <div class="sc-grid">
      <div v-for="app in shown" :key="app.appid" class="sc-card">
        <div class="sc-img">
          <img :src="app.image_url" :alt="app.name" loading="lazy" @error="hideImage" />
          <span v-if="app.price && app.price.discount_percent > 0" class="sc-discount">-{{ app.price.discount_percent }}%</span>
        </div>
        <div class="sc-info">
          <h4 :title="app.name">{{ app.name }}</h4>
          <div class="sc-bottom">
            <span class="sc-price">
              <s v-if="app.price && app.price.discount_percent > 0">{{ app.price.initial_formatted }}</s>
              {{ priceLabel(app) }}
            </span>
            <button v-if="ownedIds.has(String(app.appid))" class="sc-btn owned" disabled><i class="fas fa-check"></i> Possédé</button>
            <button v-else-if="purchase.isPending(app.appid)" class="sc-btn pending" disabled><i class="fas fa-spinner fa-spin"></i> En attente</button>
            <button v-else class="sc-btn" @click="purchase.buy(app)"><i class="fas fa-shopping-cart"></i> Acheter</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.steam-catalog { margin-bottom: 50px; }
.sc-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
.sc-title { font-weight: 800; letter-spacing: 1px; color: #66c0f4; font-size: 1.05rem; }
.sc-search { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 12px; min-width: 260px; }
.sc-search input { background: transparent; border: none; outline: none; color: #fff; width: 100%; }
.sc-tabs { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.sc-tabs button { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; padding: 6px 14px; border-radius: 8px; cursor: pointer; }
.sc-tabs button.active { border-color: #66c0f4; color: #66c0f4; }
.sc-msg { color: #aaa; padding: 12px 0; }
.sc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
.sc-card { background: rgba(20,14,30,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.sc-img { position: relative; aspect-ratio: 460 / 215; background: #100b17; }
.sc-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sc-discount { position: absolute; top: 8px; right: 8px; background: #4c6b22; color: #a4d007; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem; }
.sc-info { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.sc-info h4 { margin: 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-bottom { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.sc-price { font-weight: 700; display: flex; flex-direction: column; font-size: 0.9rem; }
.sc-price s { color: #888; font-weight: 400; font-size: 0.75rem; }
.sc-btn { background: linear-gradient(135deg, #1b9fff, #1a5fd8); border: none; color: #fff; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; }
.sc-btn.owned { background: rgba(76,175,80,0.25); color: #7ddc83; cursor: default; }
.sc-btn.pending { background: rgba(255,255,255,0.1); color: #ccc; cursor: default; }
</style>
