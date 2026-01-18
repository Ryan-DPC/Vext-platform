<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastNotification from './components/ToastNotification.vue';
import AlertModal from './components/AlertModal.vue';
import SakuraBackground from './components/SakuraBackground.vue';
import ChatPopup from '@/components/ChatPopup.vue';
import TitleBar from '@/components/TitleBar.vue'; // Import TitleBar
import { useUserStore } from '@/stores/userStore';
import { useChatStore } from '@/stores/chatStore';
import { useThemeStore } from '@/stores/themeStore';

const userStore = useUserStore();
const chatStore = useChatStore();
const themeStore = useThemeStore(); // Initialize theme

// Auto-Updater Logic
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { onMounted } from 'vue';
import { useAlertStore } from '@/stores/alertStore'; // Ensure this matches your store setup

const alertStore = useAlertStore();

onMounted(async () => {
  // Check for updates
  try {
     // Safety check for Tauri environment
    if (!(window as any).__TAURI__) return;
    
    const update = await check();
    if (update) {
      console.log(`[Updater] Found update: ${update.version} from ${update.date}`);
      const yes = await alertStore.showConfirm({
        title: 'Update Available',
        message: `A new version of VEXT is available (${update.version}).\nUpdate now?`,
        confirmText: 'Update & Restart',
        cancelText: 'Later',
        type: 'info'
      });

      if (yes) {
        await update.downloadAndInstall();
        await relaunch();
      }
    }
  } catch (error) {
    console.error('[Updater] Failed to check for updates:', error);
  }
});
</script>

<template>
  <TitleBar />
  <!-- Add TitleBar -->
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
  padding-top: 32px;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
