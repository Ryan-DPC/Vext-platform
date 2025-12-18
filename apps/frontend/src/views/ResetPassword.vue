<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useToastStore } from '@/stores/toastStore'

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()

const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)

onMounted(() => {
    token.value = route.query.token || ''
    if (!token.value) {
        toastStore.error('Jeton de réinitialisation manquant.')
        router.push('/login')
    }
})

const handleSubmit = async () => {
    if (password.value !== confirmPassword.value) {
        toastStore.error('Les mots de passe ne correspondent pas.')
        return
    }

    if (password.value.length < 6) {
        toastStore.error('Le mot de passe doit contenir au moins 6 caractères.')
        return
    }

    isLoading.value = true
    try {
        await axios.post('/auth/reset-password', { 
            token: token.value, 
            password: password.value 
        })
        toastStore.success('Mot de passe réinitialisé avec succès !')
        router.push('/login')
    } catch (error) {
        toastStore.error(error.response?.data?.message || 'Une erreur est survenue.')
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="auth-container">
        <div class="auth-card">
            <h2>Réinitialisation</h2>
            <p class="description">Entrez votre nouveau mot de passe.</p>
            
            <form @submit.prevent="handleSubmit" class="auth-form">
                <div class="form-group">
                    <label for="password">Nouveau mot de passe</label>
                    <input 
                        type="password" 
                        id="password" 
                        v-model="password" 
                        required 
                        placeholder="••••••••"
                        class="form-input"
                    >
                </div>

                <div class="form-group">
                    <label for="confirmPassword">Confirmer le mot de passe</label>
                    <input 
                        type="password" 
                        id="confirmPassword" 
                        v-model="confirmPassword" 
                        required 
                        placeholder="••••••••"
                        class="form-input"
                    >
                </div>

                <button type="submit" class="auth-btn" :disabled="isLoading">
                    <span v-if="isLoading" class="loader"></span>
                    <span v-else>Changer le mot de passe</span>
                </button>
            </form>

            <div class="auth-links">
                <RouterLink to="/login" class="link">Retour à la connexion</RouterLink>
            </div>
        </div>
    </div>
</template>

<style scoped>
.auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 80px);
    padding: 20px;
}

.auth-card {
    background: rgba(30, 25, 40, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 40px;
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    text-align: center;
}

h2 {
    margin-bottom: 10px;
    color: var(--text-primary);
    font-size: 1.8rem;
}

.description {
    color: var(--text-secondary);
    margin-bottom: 20px;
    font-size: 0.95rem;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    text-align: left;
}

label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.form-input {
    width: 100%;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    background: rgba(255, 255, 255, 0.1);
}

.auth-btn {
    background: linear-gradient(45deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;
}

.auth-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 126, 179, 0.4);
}

.auth-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.auth-links {
    margin-top: 20px;
    font-size: 0.9rem;
}

.link {
    color: var(--accent-primary);
    text-decoration: none;
    transition: color 0.2s;
}

.link:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
}

.loader {
    width: 20px;
    height: 20px;
    border: 2px solid #ffffff;
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
}

@keyframes rotation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
