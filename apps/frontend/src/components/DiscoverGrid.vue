<script setup lang="ts">
/**
 * Grille de découverte UNIFIÉE : jeux Vext + catalogue Steam (+ Epic plus tard) mélangés, sans sections séparées.
 * Une seule recherche (query) interroge toutes les sources ; les chips (category) trient/filtrent l'ensemble.
 */
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import { useSteamPurchaseStore } from '../stores/steamPurchaseStore'
import { getApiUrl } from '../utils/url'

const props = defineProps<{ query: string; category: string; genre?: number }>()

interface Card {
  key: string
  source: 'vext' | 'steam'
  title: string
  image: string
  isFree: boolean
  price?: string
  oldPrice?: string
  discount?: number
  rating?: number | null
  appid?: number
  storeUrl?: string
  vextId?: string
}

const router = useRouter()
const gameStore = useGameStore()
const purchase = useSteamPurchaseStore()
const defaultImg = `${getApiUrl()}/public/default-game.svg`

const steamItems = ref<Card[]>([])
const searchItems = ref<Card[]>([])
const page = ref(1)
const hasMore = ref(false)
const loading = ref(false)
const error = ref('')

const isSearching = computed(() => props.query.trim().length >= 2)
const ownedIds = computed(() => new Set(gameStore.steamGames.map((g: any) => String(g.app_id))))

// --- Conversion des sources vers une carte commune -------------------------------------------------
function fromSteam(a: any): Card {
  const p = a.price
  return {
    key: `steam_${a.appid}`,
    source: 'steam',
    title: a.name,
    image: a.image_url,
    isFree: !!a.is_free,
    price: p ? p.final_formatted || `${(p.final / 100).toFixed(2)}` : undefined,
    oldPrice: p && p.discount_percent > 0 ? p.initial_formatted : undefined,
    discount: p?.discount_percent || 0,
    rating: a.review_percent ?? null,
    appid: a.appid,
    storeUrl: a.store_url
  }
}

function fromVext(g: any): Card {
  const price = Number(g.price) || 0
  return {
    key: `vext_${g._id || g.id}`,
    source: 'vext',
    title: g.game_name,
    image: g.image_url || defaultImg,
    isFree: price <= 0,
    price: price > 0 ? `${price} CHF` : undefined,
    rating: g.rating ?? null,
    vextId: g._id || g.id
  }
}

// Jeux Vext mis dans le même flux que les autres (jamais dans une section à part) :
// ils apparaissent là où leurs critères correspondent à la catégorie active.
const vextForCategory = computed<Card[]>(() => {
  if (props.genre) return [] // pas de genre connu pour les jeux Vext
  const games: any[] = gameStore.games || []
  switch (props.category) {
    case 'trending':
    case 'new_releases':
      return games.map(fromVext)
    case 'free':
      return games.filter(g => !(Number(g.price) > 0)).map(fromVext)
    case 'top_rated':
      return games.filter(g => (g.rating || 0) >= 4).map(fromVext)
    default:
      return []
  }
})

const vextMatches = computed<Card[]>(() => {
  const q = props.query.trim().toLowerCase()
  return (gameStore.games || []).filter((g: any) => String(g.game_name || '').toLowerCase().includes(q)).map(fromVext)
})

const cards = computed<Card[]>(() => {
  if (isSearching.value) return dedupe([...vextMatches.value, ...searchItems.value])
  return dedupe([...vextForCategory.value, ...steamItems.value])
})

function dedupe(list: Card[]): Card[] {
  const seen = new Set<string>()
  return list.filter(c => (seen.has(c.key) ? false : (seen.add(c.key), true)))
}

// --- Chargement ------------------------------------------------------------------------------------
async function load(reset = false) {
  if (loading.value || isSearching.value) return
  loading.value = true
  error.value = ''
  try {
    if (reset) {
      page.value = 1
      steamItems.value = []
    }
    const res = await axios.get('/steam-catalog/browse', { params: { sort: props.category, genre: props.genre || undefined, page: page.value, limit: 48 } })
    steamItems.value = [...steamItems.value, ...(res.data.items || []).map(fromSteam)]
    hasMore.value = !!res.data.hasMore
    page.value += 1
  } catch (e: any) {
    hasMore.value = false
    error.value = e.response?.status === 401 ? '' : 'Catalogue indisponible pour le moment.'
  } finally {
    loading.value = false
  }
}

let timer: any = null
watch(() => props.query, (q) => {
  clearTimeout(timer)
  if (q.trim().length < 2) {
    searchItems.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      const res = await axios.get('/steam-catalog/search', { params: { q: q.trim(), limit: 40 } })
      searchItems.value = (res.data || []).map(fromSteam)
    } catch {
      searchItems.value = []
    }
  }, 300)
})

watch(() => [props.category, props.genre], () => load(true))
onMounted(() => load(true))

// --- Actions ---------------------------------------------------------------------------------------
function open(c: Card) {
  if (c.source === 'vext' && c.vextId) router.push({ name: 'game-details', params: { id: c.vextId } })
}

// Image Steam absente (jeu récent) : on demande l'adresse exacte au serveur, sinon on masque
async function onImgError(e: Event, c: Card) {
  const img = e.target as HTMLImageElement
  if (c.source !== 'steam' || !c.appid || img.dataset.retried) {
    img.src = defaultImg
    return
  }
  img.dataset.retried = '1'
  try {
    const res = await axios.post('/steam-catalog/images', { appids: [c.appid] })
    const url = res.data?.[c.appid]?.header
    img.src = url && url !== img.src ? url : defaultImg
  } catch {
    img.src = defaultImg
  }
}
</script>

<template>
  <section class="discover-grid">
    <p v-if="error" class="dg-msg">{{ error }}</p>
    <p v-else-if="isSearching && cards.length === 0" class="dg-msg">Aucun jeu trouvé pour « {{ query }} ».</p>
    <p v-else-if="!loading && cards.length === 0" class="dg-msg">Aucun jeu à afficher pour le moment.</p>

    <div class="dg-grid">
      <div v-for="c in cards" :key="c.key" class="dg-card" :class="{ clickable: c.source === 'vext' }" @click="open(c)">
        <div class="dg-img">
          <img :src="c.image" :alt="c.title" loading="lazy" @error="(e: Event) => onImgError(e, c)" />
          <span v-if="c.source === 'vext'" class="dg-badge">VEXT</span>
          <span v-if="c.discount && c.discount > 0" class="dg-discount">-{{ c.discount }}%</span>
        </div>
        <div class="dg-info">
          <h4 :title="c.title">{{ c.title }}</h4>
          <div v-if="c.rating" class="dg-rating"><i class="fas fa-thumbs-up"></i> {{ c.source === 'steam' ? c.rating + '%' : c.rating }}</div>
          <div class="dg-bottom">
            <span class="dg-price">
              <s v-if="c.oldPrice">{{ c.oldPrice }}</s>
              <template v-if="c.isFree">Gratuit</template>
              <template v-else>{{ c.price || 'Voir sur Steam' }}</template>
            </span>

            <button v-if="c.source === 'vext'" class="dg-btn alt" @click.stop="open(c)">Voir</button>
            <template v-else>
              <button v-if="ownedIds.has(String(c.appid))" class="dg-btn owned" disabled><i class="fas fa-check"></i> Possédé</button>
              <button v-else-if="purchase.isPending(c.appid!)" class="dg-btn pending" disabled><i class="fas fa-spinner fa-spin"></i> En attente</button>
              <button v-else class="dg-btn" @click.stop="purchase.buy({ appid: c.appid!, name: c.title, store_url: c.storeUrl! })">
                <i class="fas fa-shopping-cart"></i> {{ c.isFree ? 'Obtenir' : 'Acheter' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <p v-if="loading" class="dg-msg">Chargement...</p>
    <div v-if="!isSearching && hasMore && !loading" class="dg-more">
      <button class="dg-btn" @click="load()">Charger plus</button>
    </div>
  </section>
</template>

<style scoped>
.discover-grid { margin: 10px 0 50px; }
.dg-msg { color: #aaa; padding: 12px 0; text-align: center; }
.dg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
.dg-card { background: rgba(20,14,30,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s, border-color 0.15s; }
.dg-card:hover { transform: translateY(-2px); border-color: rgba(255,126,179,0.45); }
.dg-card.clickable { cursor: pointer; }
.dg-img { position: relative; aspect-ratio: 460 / 215; background: #100b17; }
.dg-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dg-badge { position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #ff7eb3, #b44cff); color: #fff; font-weight: 800; font-size: 0.7rem; letter-spacing: 1px; padding: 2px 8px; border-radius: 6px; }
.dg-discount { position: absolute; top: 8px; right: 8px; background: #4c6b22; color: #a4d007; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem; }
.dg-info { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.dg-info h4 { margin: 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dg-rating { font-size: 0.78rem; color: #8fd18f; }
.dg-bottom { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.dg-price { font-weight: 700; display: flex; flex-direction: column; font-size: 0.9rem; }
.dg-price s { color: #888; font-weight: 400; font-size: 0.75rem; }
.dg-btn { background: linear-gradient(135deg, #1b9fff, #1a5fd8); border: none; color: #fff; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 600; white-space: nowrap; }
.dg-btn.alt { background: linear-gradient(135deg, #ff7eb3, #b44cff); }
.dg-btn.owned { background: rgba(76,175,80,0.25); color: #7ddc83; cursor: default; }
.dg-btn.pending { background: rgba(255,255,255,0.1); color: #ccc; cursor: default; }
.dg-more { display: flex; justify-content: center; margin-top: 18px; }
</style>
