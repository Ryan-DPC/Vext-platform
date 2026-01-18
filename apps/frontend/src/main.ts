import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

// Configure axios globally with interceptors
import './utils/axiosConfig';

import './assets/css/global.css';

// Initialize Tauri Adapter (polyfills window.electronAPI)
// import './tauri-adapter'

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
import i18n from './i18n';
app.use(i18n);

// Initialize auth from localStorage
import { useUserStore } from './stores/userStore';

const userStore = useUserStore();
userStore.initializeAuth();

// WebSocket connection is now handled by UserStore.initializeAuth()

app.mount('#app');
