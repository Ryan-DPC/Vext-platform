<script setup>
import { RouterView } from 'vue-router'
import ToastNotification from './components/ToastNotification.vue'
import AlertModal from './components/AlertModal.vue'
import SakuraBackground from './components/SakuraBackground.vue'
import ChatPopup from '@/components/ChatPopup.vue'
import TitleBar from '@/components/TitleBar.vue' // Import TitleBar
import { useUserStore } from '@/stores/userStore'
import { useChatStore } from '@/stores/chatStore'
import { useThemeStore } from '@/stores/themeStore'

const userStore = useUserStore()
const chatStore = useChatStore()
const themeStore = useThemeStore() // Initialize theme
</script>

<template>
  <TitleBar /> <!-- Add TitleBar -->
  <div class="app-content">
    <RouterView />
  </div>
  <SakuraBackground />
  <SakuraBackground />
  <ToastNotification />
  <AlertModal />
  
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
