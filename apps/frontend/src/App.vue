<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { getCurrentWindow } from '@tauri-apps/api/window'
import ToastNotification from './components/ToastNotification.vue'
import AlertModal from './components/AlertModal.vue'
import UpdateModal from './components/UpdateModal.vue'
import SakuraBackground from './components/SakuraBackground.vue'
import ChatPopup from '@/components/ChatPopup.vue'
import TitleBar from '@/components/TitleBar.vue' // Import TitleBar
import { useUserStore } from '@/stores/userStore'
import { useChatStore } from '@/stores/chatStore'
import { useThemeStore } from '@/stores/themeStore'
import { useUpdaterStore } from '@/stores/updaterStore'

const userStore = useUserStore()
const chatStore = useChatStore()
const themeStore = useThemeStore() // Initialize theme
const updaterStore = useUpdaterStore()

onMounted(() => {
  if (window.__TAURI_INTERNALS__) {
    try {
      const win = getCurrentWindow()
      win.show().catch(() => {})
      win.setFocus().catch(() => {})
    } catch (e) {
      console.warn('Failed to ensure window shown:', e)
    }
  }

  updaterStore.init()
  // Verification silencieuse des mises a jour 3s apres l'ouverture
  setTimeout(() => {
    updaterStore.checkForUpdates(true)
  }, 3000)
})
</script>

<template>
  <TitleBar /> <!-- Add TitleBar -->
  <div class="app-content">
    <RouterView />
  </div>
  <SakuraBackground />
  <ToastNotification />
  <AlertModal />
  <UpdateModal />
  
  <Transition name="chat-pop">
    <ChatPopup 
      v-if="userStore.isAuthenticated && chatStore.activeChatFriend" 
      :friend="chatStore.activeChatFriend" 
      @close="chatStore.closeChat()" 
    />
  </Transition>
</template>

<style>
.app-content {
  padding-top: 32px; /* Space for TitleBar */
}
</style>
