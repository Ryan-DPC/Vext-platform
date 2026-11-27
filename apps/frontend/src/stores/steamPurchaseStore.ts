import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useToastStore } from './toastStore'
import tauriAPI from '../tauri-adapter'

const STORAGE_KEY = 'vext_pending_steam_purchases'
const POLL_MS = 20_000
const PENDING_MAX_MS = 30 * 60 * 1000
const FOCUS_THROTTLE_MS = 15_000
const IDLE_REFRESH_MS = 60_000

interface Pending {
    appid: number
    name: string
    since: number
}

function load(): Pending[] {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        return Array.isArray(raw) ? raw.filter((p: any) => p?.appid && Date.now() - p.since < PENDING_MAX_MS) : []
    } catch {
        return []
    }
}

/**
 * Achat d'un jeu Steam : Vext ouvre la page Steam, l'utilisateur paie sur Steam,
 * puis on détecte l'achat en relisant sa bibliothèque Steam liée (aucune notification Steam n'existe).
 */
export const useSteamPurchaseStore = defineStore('steamPurchase', {
    state: () => ({
        pending: load() as Pending[],
        timer: null as any,
        lastCheck: 0,
        initialized: false
    }),

    actions: {
        persist() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pending))
            } catch { /* stockage indisponible : on ignore */ }
        },

        async buy(app: { appid: number; name: string; store_url: string }) {
            if (!this.pending.some(p => p.appid === app.appid)) {
                this.pending.push({ appid: app.appid, name: app.name, since: Date.now() })
                this.persist()
            }
            await tauriAPI.openExternalUrl(app.store_url)
            useToastStore().info(`Page Steam ouverte pour « ${app.name} ». Vext détectera l'achat automatiquement.`)
            this.startPolling()
        },

        isPending(appid: number) {
            return this.pending.some(p => p.appid === appid)
        },

        startPolling() {
            if (this.timer || this.pending.length === 0) return
            this.timer = setInterval(() => this.check(), POLL_MS)
        },

        stopPolling() {
            if (this.timer) clearInterval(this.timer)
            this.timer = null
        },

        /** Relit la bibliothèque Steam liée et valide les achats en attente. */
        async check(force = false) {
            const now = Date.now()
            if (!force && now - this.lastCheck < FOCUS_THROTTLE_MS) return
            this.lastCheck = now

            this.pending = this.pending.filter(p => now - p.since < PENDING_MAX_MS)
            this.persist()
            if (this.pending.length === 0) {
                this.stopPolling()
                return
            }

            const gameStore = useGameStore()
            await gameStore.scanSteamGames(true)
            const owned = new Set(gameStore.steamGames.map((g: any) => String(g.app_id)))
            const bought = this.pending.filter(p => owned.has(String(p.appid)))
            if (bought.length) {
                const toast = useToastStore()
                bought.forEach(p => toast.success(`« ${p.name} » ajouté à votre bibliothèque !`))
                this.pending = this.pending.filter(p => !owned.has(String(p.appid)))
                this.persist()
            }
            if (this.pending.length === 0) this.stopPolling()
        },

        /** À appeler une fois au démarrage : suit les achats en attente et rafraîchit au retour sur la fenêtre. */
        init() {
            if (this.initialized) return
            this.initialized = true

            window.addEventListener('focus', () => {
                if (this.pending.length > 0) {
                    this.check()
                } else if (localStorage.getItem('token') || sessionStorage.getItem('token')) {
                    // Achat fait pendant que Vext était ouvert : on relit la bibliothèque (au plus 1×/min)
                    const now = Date.now()
                    if (now - this.lastCheck > IDLE_REFRESH_MS) {
                        this.lastCheck = now
                        useGameStore().scanSteamGames(true)
                    }
                }
            })
            this.startPolling()
        }
    }
})
