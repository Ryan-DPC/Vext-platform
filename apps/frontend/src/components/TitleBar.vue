<script setup>
import { getCurrentWindow } from '@tauri-apps/api/window';

const isTauri = !!window.__TAURI_INTERNALS__;
let appWindow;

if (isTauri) {
  try {
    appWindow = getCurrentWindow();
  } catch (e) {
    console.warn('Failed to get current window:', e);
  }
}

const minimize = () => appWindow?.minimize();
const toggleMaximize = () => appWindow?.toggleMaximize();
const close = () => appWindow?.close();
</script>

<template>
  <div class="titlebar">
    <div class="titlebar-logo">
        <span class="text-xs font-bold tracking-widest text-gray-500 uppercase select-none">VEXT</span>
    </div>
    <div class="titlebar-controls">
      <div class="titlebar-button" @click="minimize">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13H5v-2h14z"/></svg>
      </div>
      <div class="titlebar-button" @click="toggleMaximize">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>
      </div>
      <div class="titlebar-button close" @click="close">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
      </div>
    </div>
  </div>

</template>

<style scoped>
.titlebar {
  height: 32px;
  background: #1a1a1ae6; /* Dark slightly transparent */
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  padding-left: 15px;
  backdrop-filter: blur(5px);
  border-bottom: 1px solid #333;
  -webkit-app-region: drag; /* Standard dragging for Wry/WebView2 */
}

.titlebar-logo {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #fff;
  font-weight: 600;
  pointer-events: none;
  letter-spacing: 0.5px;
}

.titlebar-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag; /* CRITICAL: Allows buttons to be clicked */
}

.titlebar-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 46px;
  height: 100%;
  color: #fff;
  transition: background 0.2s;
  cursor: default;
}

.titlebar-button:hover {
  background: #333;
}

.titlebar-button.close:hover {
  background: #e81123;
  color: #fff;
}
</style>
