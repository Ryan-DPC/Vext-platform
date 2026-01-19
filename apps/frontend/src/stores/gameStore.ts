import { defineStore } from 'pinia';
import axios from 'axios';

export const useGameStore = defineStore('game', {
  state: () => ({
    games: [] as any[],
    myGames: [] as any[],
    newGames: [] as any[],
    featuredGames: [] as any[],
    favoriteIds: new Set<string>(), // Local cache of favored game IDs
    isLoading: false,
  }),
  getters: {
    getFilteredGames: (state) => (category: string) => {
      if (!category || category === 'trending') return state.games;
      if (category === 'new') return state.newGames;
      if (category === 'top')
        return [...state.games].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      return state.games.filter((g) => g.genre?.toLowerCase() === category.toLowerCase());
    },
  },
  actions: {
    // Load favorites from backend (via user profile)
    async loadFavorites() {
      try {
        const userStore = (await import('./userStore')).useUserStore();
        if (userStore.user?.favorites) {
          this.favoriteIds = new Set(userStore.user.favorites);
        }
      } catch (e) {
        console.error('Failed to load favorites from user store', e);
      }
    },

    async toggleFavorite(gameId: string) {
      // Optimistic update
      if (this.favoriteIds.has(gameId)) {
        this.favoriteIds.delete(gameId);
      } else {
        this.favoriteIds.add(gameId);
      }

      // Update myGames state local reflection
      const game = this.myGames.find((g) => (g._id === gameId || g.folder_name === gameId));
      if (game) {
        game.isFavorite = this.favoriteIds.has(gameId);
      }

      // Sync with backend
      try {
        await axios.post('/users/api/users/favorites/toggle', { gameId });
        // Also update user store to keep it in sync
        const userStore = (await import('./userStore')).useUserStore();
        // Force refresh profile silently to get latest favorites
        await userStore.fetchProfile();
      } catch (e) {
        console.error('Failed to save favorites to backend', e);
        // TODO: Revert optimistic update on failure?
      }
    },

    async fetchHomeData() {
      this.isLoading = true;
      try {
        const response = await axios.get('/games/all');
        this.games = Array.isArray(response.data) ? response.data : response.data.games || [];
        this.newGames = response.data.newGames || [];

        // Populate featuredGames
        const featured = [...this.games];
        this.featuredGames = featured.slice(0, 4);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async fetchMyGames() {
      this.isLoading = true;
      this.loadFavorites(); // Ensure favorites are loaded
      try {
        const response = await axios.get('/library/my-games');
        this.myGames = response.data.map((g: any) => ({
          ...g,
          isFavorite: this.favoriteIds.has(g._id) || this.favoriteIds.has(g.folder_name)
        })) || [];

        // Immediately check installation status after fetching
        this.checkInstallationStatus();
      } catch (error) {
        console.error('Failed to fetch my games:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async checkInstallationStatus() {
      // If not in Tauri, skip
      if (!(window as any).__TAURI__) return;

      const tauriAPI = (await import('../tauri-adapter')).default;

      try {
        const libraryPathsStr = localStorage.getItem('vextLibraryPaths');
        let paths: string[] = libraryPathsStr ? JSON.parse(libraryPathsStr) : [];
        const legacyPath = localStorage.getItem('etherInstallPath');
        if (legacyPath && !paths.includes(legacyPath)) {
          paths.push(legacyPath);
        }
        paths = [...new Set(paths)].filter((p) => !!p);

        if (paths.length > 0 && this.myGames.length > 0) {
          // Check concurrently
          await Promise.all(
            this.myGames.map(async (game: any) => {
              const gameId = game.folder_name || game.slug;
              if (!gameId) return;

              for (const path of paths) {
                try {
                  const exists = await tauriAPI.checkGameInstalled(path, gameId);
                  if (exists) {
                    game.installed = true;
                    game.status = 'installed';
                    break;
                  }
                } catch (e) {
                  // ignore
                }
              }
            })
          );
        }
      } catch (e) {
        console.error("Error checking installation status:", e);
      }
    },
  },
});
