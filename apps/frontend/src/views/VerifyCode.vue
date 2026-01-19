<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import axios from 'axios';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const email = ref('');
const code = ref(['', '', '', '', '', '']);
const error = ref('');
const isLoading = ref(false);
const timeLeft = ref(600); // 10 minutes in seconds

// Timer countdown
let timerInterval: number | null = null;

onMounted(() => {
  email.value = (route.query.email as string) || '';

  timerInterval = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      if (timerInterval) clearInterval(timerInterval);
    }
  }, 1000);
});

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const handleInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // Only allow digits
  if (!/^\d*$/.test(value)) {
    input.value = '';
    code.value[index] = '';
    return;
  }

  code.value[index] = value.slice(-1); // Only keep last digit

  // Auto-focus next input
  if (value && index < 5) {
    const nextInput = document.getElementById(`code-${index + 1}`);
    nextInput?.focus();
  }
};

const handleKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !code.value[index] && index > 0) {
    const prevInput = document.getElementById(`code-${index - 1}`);
    prevInput?.focus();
  }
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  const pastedData = event.clipboardData?.getData('text') || '';
  const digits = pastedData.replace(/\D/g, '').slice(0, 6);

  for (let i = 0; i < digits.length; i++) {
    code.value[i] = digits[i] || '';
  }

  // Focus the next empty input or last input
  const nextEmptyIndex = code.value.findIndex((c) => !c);
  const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
  document.getElementById(`code-${focusIndex}`)?.focus();
};

const handleVerify = async () => {
  const fullCode = code.value.join('');

  if (fullCode.length !== 6) {
    error.value = 'Veuillez entrer les 6 chiffres';
    return;
  }

  isLoading.value = true;
  error.value = '';

  try {
    const response = await axios.post('/auth/verify-code', {
      email: email.value,
      code: fullCode,
    });

    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      await userStore.fetchProfile();
      router.push('/home');
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Code invalide';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="verify-container">
    <!-- Ambient Background -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <div class="verify-card">
      <div class="logo-header">
        <img src="@/assets/images/logo.png" alt="VEXT" class="verify-logo" />
        <h1>Vérification</h1>
        <p class="subtitle">Entrez le code à 6 chiffres envoyé à</p>
        <p class="email-display">{{ email }}</p>
      </div>

      <div class="timer" :class="{ 'timer-warning': timeLeft < 60 }">
        <i class="fas fa-clock"></i>
        {{ formatTime(timeLeft) }}
      </div>

      <form @submit.prevent="handleVerify">
        <div class="code-inputs" @paste="handlePaste">
          <input
            v-for="(_, index) in code"
            :key="index"
            :id="`code-${index}`"
            type="text"
            inputmode="numeric"
            maxlength="1"
            :value="code[index]"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            class="code-input"
            :autofocus="index === 0"
          />
        </div>

        <div v-if="error" class="error-msg">
          <i class="fas fa-exclamation-circle"></i> {{ error }}
        </div>

        <button type="submit" :disabled="isLoading || timeLeft === 0" class="btn-primary">
          {{ isLoading ? 'VÉRIFICATION...' : 'VÉRIFIER' }}
        </button>

        <div class="resend-link" v-if="timeLeft === 0">
          <span class="expired-text">Code expiré</span>
          <router-link to="/register">Réessayer l'inscription</router-link>
        </div>
      </form>
      <div class="back-link">
        <button type="button" class="btn-text" @click="router.push('/register')">
          <i class="fas fa-arrow-left"></i> Revenir à l'inscription
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Previous styles remain... */

.back-link {
  margin-top: 1.5rem;
  text-align: center;
}

.btn-text {
  background: none;
  border: none;
  color: #b0b9c3;
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.btn-text:hover {
  color: #fff;
}

/* ... existing styles continue */

.verify-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0;
  background-color: transparent;
  color: white;
  overflow: hidden;
  z-index: 9999;
}

/* Ambient Glows */
.bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  pointer-events: none;
}
.pink-glow {
  background: #ff7eb3;
  top: -100px;
  left: -100px;
}
.cyan-glow {
  background: #7afcff;
  bottom: -100px;
  right: -100px;
}

.verify-card {
  background: transparent;
  backdrop-filter: none;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  border: none;
  box-shadow: none;
  z-index: 10;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-header {
  text-align: center;
  margin-bottom: 2rem;
}

.verify-logo {
  width: 70px;
  height: 70px;
  object-fit: contain;
  margin-bottom: 1rem;
  border-radius: 14px;
  box-shadow: 0 0 20px rgba(255, 126, 179, 0.2);
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(to right, #fff, #b0b9c3);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.subtitle {
  color: #b0b9c3;
  margin-top: 0.5rem;
  font-size: 0.95rem;
}

.email-display {
  color: #7afcff;
  font-weight: 600;
  font-size: 1rem;
  margin-top: 0.5rem;
}

.timer {
  text-align: center;
  font-size: 1.2rem;
  color: #7afcff;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.timer-warning {
  color: #ff4757;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.code-inputs {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 2rem;
}

.code-input {
  width: 50px;
  height: 60px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  outline: none;
  transition: all 0.3s ease;
}

.code-input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ff7eb3;
  box-shadow: 0 0 15px rgba(255, 126, 179, 0.3);
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(45deg, #ff7eb3, #ff758c);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 1rem;
  box-shadow: 0 4px 15px rgba(255, 118, 136, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 118, 136, 0.5);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.error-msg {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
  color: #ff4757;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.resend-link {
  margin-top: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.expired-text {
  color: #ff4757;
  font-size: 0.9rem;
}

.resend-link a {
  color: #7afcff;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.resend-link a:hover {
  color: #ff7eb3;
  text-shadow: 0 0 10px rgba(255, 126, 179, 0.5);
}
</style>
