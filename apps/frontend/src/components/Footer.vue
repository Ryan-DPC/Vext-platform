<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer>
    <div class="footer-logo">
      <img src="@/assets/images/Logo.svg" alt="Mini Games Store Logo">
    </div>
    <ul>
      <li><RouterLink to="/home">Accueil</RouterLink></li>
      <li><RouterLink to="/library">Bibliothèque</RouterLink></li>
      <li><RouterLink to="/store">Boutique</RouterLink></li>
      <li><RouterLink to="/terms">Conditions Générales</RouterLink></li>
      <li><RouterLink to="/privacy">Politique de Confidentialité</RouterLink></li>
    </ul>
    <div class="social-icons">
      <a href="https://facebook.com" target="_blank"><i class="fab fa-facebook"></i></a>
      <a href="https://twitter.com" target="_blank"><i class="fab fa-twitter"></i></a>
      <a href="https://instagram.com" target="_blank"><i class="fab fa-instagram"></i></a>
    </div>
    <p>&copy; 2025 Mini Games Store. Tous droits réservés.</p>
  </footer>
</template>

<style scoped>
</style>
