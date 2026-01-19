import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // State
  const currentTheme = ref(localStorage.getItem('vext_theme') || 'default');
  const darkMode = ref(localStorage.getItem('vext_dark_mode') !== 'false'); // Default to true

  // Plugins (Mock for now, as per request to add the section)
  const plugins = ref(JSON.parse(localStorage.getItem('vext_plugins') || '[]'));

  // Brand Assets
  const CLOUDINARY_BASE = 'https://res.cloudinary.com/dzglyaqmf/image/upload/v1768824813/assets';
  const defaultGameImg = computed(() => {
    return darkMode.value
      ? `${CLOUDINARY_BASE}/vext-game-black.svg`
      : `${CLOUDINARY_BASE}/vext-game-white.svg`;
  });

  // Actions
  function setTheme(theme: string) {
    currentTheme.value = theme;
    localStorage.setItem('vext_theme', theme);
    applyTheme();
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    localStorage.setItem('vext_dark_mode', String(darkMode.value));
    applyTheme();
  }

  function addPlugin(plugin: { name: string; version: string; enabled: boolean }) {
    plugins.value.push(plugin);
    localStorage.setItem('vext_plugins', JSON.stringify(plugins.value));
  }

  function removePlugin(index: number) {
    plugins.value.splice(index, 1);
    localStorage.setItem('vext_plugins', JSON.stringify(plugins.value));
  }

  function applyTheme() {
    const root = document.documentElement;

    // Reset classes
    root.classList.remove(
      'theme-cyberpunk',
      'theme-minimal',
      'theme-retro',
      'light-mode',
      'dark-mode'
    );

    // Apply Mode
    if (darkMode.value) {
      root.classList.add('dark-mode');
    } else {
      root.classList.add('light-mode');
    }

    // Apply Theme
    if (currentTheme.value !== 'default') {
      root.classList.add(`theme-${currentTheme.value}`);
    }
  }

  // Initialize
  applyTheme();

  return {
    currentTheme,
    darkMode,
    plugins,
    defaultGameImg,
    setTheme,
    toggleDarkMode,
    addPlugin,
    removePlugin,
    applyTheme,
  };
});
