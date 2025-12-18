<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const error = ref('')
const userStore = useUserStore()
const router = useRouter()


onMounted(async () => {
    // Check for token in URL (from GitHub callback) logic removed
})

const handleLogin = async () => {
    error.value = ''
    try {
        await userStore.login(email.value, password.value, rememberMe.value)
        router.push('/home')
    } catch (e: any) {
        error.value = e.response?.data?.message || 'Login failed'
    }
}


</script>

<template>
    <div class="login-container">
        <!-- Ambient Background -->
        <div class="bg-glow pink-glow"></div>
        <div class="bg-glow cyan-glow"></div>

        <div class="login-card">
            <div class="logo-header">
                <img src="@/assets/images/Logo.svg" alt="Ether" class="login-logo" />
                <h1>Welcome Back</h1>
                <p class="subtitle">Enter the Ether</p>
            </div>

            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <div class="input-wrapper">
                        <i class="fas fa-user input-icon"></i>
                        <input 
                            type="text" 
                            v-model="email" 
                            required 
                            placeholder="Username or Email" 
                            name="username"
                            autocomplete="username"
                        />
                    </div>
                </div>
                <div class="form-group">
                    <div class="input-wrapper">
                        <i class="fas fa-lock input-icon"></i>
                        <input 
                            :type="showPassword ? 'text' : 'password'" 
                            v-model="password" 
                            required 
                            placeholder="Password" 
                            name="password"
                            autocomplete="current-password"
                        />
                        <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                        </button>
                    </div>
                </div>
                
                <div v-if="error" class="error-msg">
                    <i class="fas fa-exclamation-circle"></i> {{ error }}
                </div>

                <div class="options-row">
                    <label class="remember-me">
                        <input type="checkbox" v-model="rememberMe">
                        <span>Remember me</span>
                    </label>
                    <router-link to="/forgot-password" class="forgot-password">Forgot Password?</router-link>
                </div>

                <button type="submit" :disabled="userStore.isLoading" class="btn-primary">
                    {{ userStore.isLoading ? 'AUTHENTICATING...' : 'LOGIN' }}
                </button>
                

                
                <div class="register-link">
                    New to Ether? 
                    <router-link to="/register">Create Account</router-link>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-container {
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
.pink-glow { background: #ff7eb3; top: -100px; left: -100px; }
.cyan-glow { background: #7afcff; bottom: -100px; right: -100px; }

.login-card {
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
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.logo-header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.login-logo {
    width: 80px;
    height: 80px;
    object-fit: contain;
    margin-bottom: 1rem;
    border-radius: 16px;
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

.form-group {
    margin-bottom: 1.2rem;
}

.input-wrapper {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.input-wrapper:focus-within {
    background: rgba(255, 255, 255, 0.1);
    border-color: #ff7eb3;
    box-shadow: 0 0 15px rgba(255, 126, 179, 0.15);
}

.input-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #b0b9c3;
    font-size: 1rem;
    transition: color 0.3s;
}

.input-wrapper:focus-within .input-icon {
    color: #ff7eb3;
}

input {
    width: 100%;
    padding: 16px 45px 16px 45px; /* Added right padding for eye icon */
    background: transparent;
    border: none;
    color: white;
    font-size: 1rem;
    outline: none;
}

.toggle-password {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #b0b9c3;
    cursor: pointer;
    padding: 4px;
    transition: color 0.3s;
}

.toggle-password:hover {
    color: #ff7eb3;
}

input::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.options-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.2rem;
}

.remember-me {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #b0b9c3;
    user-select: none;
}

.remember-me input[type="checkbox"] {
    width: 16px;
    height: 16px;
    padding: 0;
    accent-color: #ff7eb3;
    cursor: pointer;
}

.forgot-password {
    color: #b0b9c3;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
}

.forgot-password:hover {
    color: #ff7eb3;
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

.divider {
    margin: 1.5rem 0;
    text-align: center;
    position: relative;
}

.divider::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
}

.divider span {
    background: #1e1928; /* Match card bg roughly or transparent if precise */
    padding: 0 10px;
    color: #b0b9c3;
    font-size: 0.8rem;
    position: relative;
    z-index: 1;
}

.btn-github {
    width: 100%;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.btn-github:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
}

.register-link {
    margin-top: 2rem;
    text-align: center;
    color: #b0b9c3;
    font-size: 0.9rem;
}

.register-link a {
    color: #7afcff;
    text-decoration: none;
    font-weight: 600;
    margin-left: 5px;
    transition: color 0.2s;
}

.register-link a:hover {
    color: #ff7eb3;
    text-shadow: 0 0 10px rgba(255, 126, 179, 0.5);
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
</style>
