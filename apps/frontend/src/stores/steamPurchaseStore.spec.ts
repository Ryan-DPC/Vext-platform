import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const openExternalUrl = vi.fn(async (_url: string) => 'ok')
vi.mock('../tauri-adapter', () => ({ default: { openExternalUrl: (url: string) => openExternalUrl(url) } }))

import { useSteamPurchaseStore } from './steamPurchaseStore'
import { useGameStore } from './gameStore'
import { useToastStore } from './toastStore'

const app = { appid: 1245620, name: 'ELDEN RING', store_url: 'https://store.steampowered.com/app/1245620' }

describe('steamPurchaseStore', () => {
  beforeEach(() => {
    localStorage.clear()
    openExternalUrl.mockClear()
    setActivePinia(createPinia())
  })

  it('ouvre la page Steam et mémorise l\'achat en attente', async () => {
    const store = useSteamPurchaseStore()
    await store.buy(app)
    expect(openExternalUrl).toHaveBeenCalledWith(app.store_url)
    expect(store.isPending(app.appid)).toBe(true)
    expect(JSON.parse(localStorage.getItem('vext_pending_steam_purchases') || '[]')).toHaveLength(1)
    store.stopPolling()
  })

  it('ne duplique pas un achat déjà en attente', async () => {
    const store = useSteamPurchaseStore()
    await store.buy(app)
    await store.buy(app)
    expect(store.pending).toHaveLength(1)
    store.stopPolling()
  })

  it('détecte l\'achat quand le jeu apparaît dans la bibliothèque Steam', async () => {
    const store = useSteamPurchaseStore()
    const games = useGameStore()
    const toast = useToastStore()
    await store.buy(app)
    store.stopPolling()

    // la relecture de la bibliothèque (API Steam) renvoie désormais le jeu
    games.scanSteamGames = vi.fn(async () => { games.steamGames = [{ app_id: String(app.appid), name: app.name }] }) as any
    await store.check(true)

    expect(store.isPending(app.appid)).toBe(false)
    expect(toast.toasts.some(t => t.type === 'success' && t.message.includes('ELDEN RING'))).toBe(true)
    expect(JSON.parse(localStorage.getItem('vext_pending_steam_purchases') || '[]')).toHaveLength(0)
  })

  it('garde l\'achat en attente tant que le jeu n\'est pas possédé', async () => {
    const store = useSteamPurchaseStore()
    const games = useGameStore()
    await store.buy(app)
    store.stopPolling()
    games.scanSteamGames = vi.fn(async () => { games.steamGames = [] }) as any
    await store.check(true)
    expect(store.isPending(app.appid)).toBe(true)
  })
})
