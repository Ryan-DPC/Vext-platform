import { defineStore } from 'pinia'
import axios from 'axios'
import tauriAPI from '../tauri-adapter'

export const useGameStore = defineStore('game', {
    state: () => ({
        games: [] as any[],
        myGames: [] as any[],
        steamGames: [] as any[],
        epicGames: [] as any[],
        newGames: [] as any[],
        featuredGames: [] as any[],
        isLoading: false,
        isScanningSteam: false,
        isScanningEpic: false
    }),
    getters: {
        getFilteredGames: (state) => (category: string) => {
            if (!category || category === 'trending') return state.games
            if (category === 'new') return state.newGames
            if (category === 'top') return [...state.games].sort((a, b) => (b.rating || 0) - (a.rating || 0))
            return state.games.filter(g => g.genre?.toLowerCase() === category.toLowerCase())
        },
        allUnifiedGames: (state) => {
            const mappedSteam = state.steamGames.map(sg => ({
                _id: sg.id,
                game_name: sg.name,
                image_url: sg.image_url,
                hero_url: sg.hero_url,
                installed: sg.installed ?? false,
                platform: 'steam',
                app_id: sg.app_id,
                folder_name: sg.folder_name,
                genre: 'Steam Game',
                install_path: sg.install_path,
                is_third_party: true
            }))

            const mappedEpic = state.epicGames.map(eg => ({
                _id: eg.id,
                game_name: eg.name,
                image_url: eg.image_url,
                hero_url: eg.hero_url,
                installed: eg.installed ?? false,
                platform: 'epic',
                app_name: eg.app_name,
                folder_name: eg.folder_name,
                genre: 'Epic Game',
                install_path: eg.install_path,
                is_third_party: true
            }))

            return [...state.myGames, ...mappedSteam, ...mappedEpic]
        }
    },
    actions: {
        async scanSteamGames() {
            this.isScanningSteam = true
            try {
                const results = await tauriAPI.scanSteamGames()
                this.steamGames = results || []
            } catch (error) {
                console.error('Failed to scan Steam games:', error)
            } finally {
                this.isScanningSteam = false
            }
        },
        async scanEpicGames() {
            this.isScanningEpic = true
            try {
                const results = await tauriAPI.scanEpicGames()
                this.epicGames = results || []
            } catch (error) {
                console.error('Failed to scan Epic games:', error)
            } finally {
                this.isScanningEpic = false
            }
        },
        async scanAllPlatforms() {
            await Promise.allSettled([
                this.scanSteamGames(),
                this.scanEpicGames(),
                this.fetchMyGames()
            ])
        },
        async fetchHomeData() {
            this.isLoading = true
            try {
                const response = await axios.get('/games/all')
                this.games = Array.isArray(response.data) ? response.data : (response.data.games || [])
                this.newGames = response.data.newGames || []

                // Populate featuredGames
                let featured = [...this.games]
                this.featuredGames = featured.slice(0, 4)
            } catch (error) {
                console.error('Failed to fetch home data:', error)
            } finally {
                this.isLoading = false
            }
        },
        async fetchMyGames() {
            this.isLoading = true
            try {
                const response = await axios.get('/library/my-games')
                this.myGames = response.data || []
            } catch (error) {
                console.error('Failed to fetch my games:', error)
            } finally {
                this.isLoading = false
            }
        }
    }
})
