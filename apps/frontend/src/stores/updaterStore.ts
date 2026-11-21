import { defineStore } from 'pinia'
import tauriAPI, { type UpdateInfo } from '../tauri-adapter'

export const useUpdaterStore = defineStore('updater', {
  state: () => ({
    status: 'idle' as 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'error',
    updateInfo: null as UpdateInfo | null,
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    errorMessage: '',
    isModalOpen: false,
    hasCheckedOnStartup: false
  }),

  actions: {
    init() {
      tauriAPI.onUpdateProgress((data) => {
        this.status = 'downloading'
        this.downloadedBytes = data.downloaded
        this.totalBytes = data.total
        this.progress = data.percentage || (data.total > 0 ? Math.round((data.downloaded / data.total) * 100) : 0)
      })
    },

    async checkForUpdates(silent = false) {
      if (this.status === 'downloading') return

      this.status = 'checking'
      this.errorMessage = ''

      try {
        const info = await tauriAPI.checkForUpdate()
        if (info && info.version) {
          this.updateInfo = info
          this.status = 'available'
          this.isModalOpen = true
        } else {
          this.status = 'up-to-date'
          this.updateInfo = null
          if (silent) {
            setTimeout(() => {
              if (this.status === 'up-to-date') this.status = 'idle'
            }, 5000)
          }
        }
      } catch (err: any) {
        console.error('Update check error:', err)
        this.status = 'error'
        this.errorMessage = err.message || String(err)
      } finally {
        this.hasCheckedOnStartup = true
      }
    },

    async startUpdate() {
      if (!this.updateInfo) return
      this.status = 'downloading'
      this.progress = 0
      this.errorMessage = ''

      try {
        await tauriAPI.downloadAndInstallUpdate()
      } catch (err: any) {
        console.error('Download and install error:', err)
        this.status = 'error'
        this.errorMessage = err.message || String(err)
      }
    },

    closeModal() {
      if (this.status !== 'downloading') {
        this.isModalOpen = false
      }
    }
  }
})
