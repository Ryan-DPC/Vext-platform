<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import axios from 'axios'

const username = ref('')
const userTag = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const profilePic = ref<File | null>(null)
const error = ref('')
const userStore = useUserStore()
const router = useRouter()

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
        profilePic.value = target.files[0]
    }
}

const handleRegister = async () => {
    error.value = ''
    
    // Validation
    if (!/^[a-zA-Z0-9]+$/.test(username.value)) {
        error.value = 'Username must be alphanumeric'
        return
    }
    if (!/^[a-zA-Z0-9]{3,4}$/.test(userTag.value)) {
        error.value = 'Tag must be 3 or 4 alphanumeric characters'
        return
    }
    if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match'
        return
    }
    
    try {
        const formData = new FormData()
        formData.append('username', username.value)
        formData.append('tag', userTag.value)
        formData.append('email', email.value)
        formData.append('password', password.value)
        if (profilePic.value) {
            formData.append('profile_pic', profilePic.value)
        }

        const response = await axios.post('/auth/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        if (response.data.success) {
            // Auto-login after registration using full username
            const fullUsername = `${username.value}#${userTag.value}`
            await userStore.login(fullUsername, password.value)
            router.push('/home')
        }
    } catch (e: any) {
        error.value = e.response?.data?.message || e.message || 'Registration failed'
    }
}
</script>

<template>
    <div class="register-container">
        <!-- Ambient Background -->
        <div class="bg-glow pink-glow"></div>
        <div class="bg-glow cyan-glow"></div>

        <div class="register-card">
            <div class="logo-header">
                <img src="@/assets/images/logo.png" alt="VEXT" class="register-logo" />
                <h1>Join VEXT</h1>
                <p class="subtitle">Create your account</p>
            </div>

            <form @submit.prevent="handleRegister">
                <div class="form-group">
                    <div class="input-wrapper file-input-wrapper">
                        <i class="fas fa-camera input-icon"></i>
                        <input 
                            type="file" 
                            @change="handleFileChange" 
                            accept="image/*"
                            class="file-input"
                        />
                        <span class="file-placeholder">{{ profilePic ? profilePic.name : 'Upload Profile Picture (Optional)' }}</span>
                    </div>
                </div>
                <div class="form-group">
                    <div class="username-row">
                        <div class="input-wrapper username-wrapper">
                            <i class="fas fa-user input-icon"></i>
                            <input 
                                type="text" 
                                v-model="username" 
                                required 
                                placeholder="Username" 
                                name="username"
                                autocomplete="username"
                                maxlength="20"
                            />
                        </div>
                        <div class="tag-wrapper">
                            <span class="tag-hash">#</span>
                            <input 
                                type="text" 
                                v-model="userTag" 
                                required 
                                placeholder="0000" 
                                maxlength="4"
                                class="tag-input"
                            />
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <div class="input-wrapper">
                        <i class="fas fa-envelope input-icon"></i>
                        <input 
                            type="email" 
                            v-model="email" 
                            required 
                            placeholder="Enter your email" 
                            name="email"
                            autocomplete="email"
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
                            placeholder="Choose a password" 
                            name="new-password"
                            autocomplete="new-password"
                        />
                        <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <div class="input-wrapper">
                        <i class="fas fa-lock input-icon"></i>
                        <input 
                            :type="showConfirmPassword ? 'text' : 'password'" 
                            v-model="confirmPassword" 
                            required 
                            placeholder="Confirm your password" 
                            name="confirm-password"
                            autocomplete="new-password"
                        />
                        <button type="button" class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
                            <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                        </button>
                    </div>
                </div>

                <div v-if="error" class="error-msg">
                    <i class="fas fa-exclamation-circle"></i> {{ error }}
                </div>

                <button type="submit" :disabled="userStore.isLoading" class="btn-primary">
                    {{ userStore.isLoading ? 'CREATING ACCOUNT...' : 'REGISTER' }}
                </button>
                
                <div class="login-link">
                    Already have an account? 
                    <router-link to="/login">Login here</router-link>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.register-container {
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

.register-card {
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
    margin-bottom: 2rem;
}

.register-logo {
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

.file-input-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    overflow: hidden;
}

.file-input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 2;
}

.file-placeholder {
    margin-left: 45px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 16px;
}

.username-row {
    display: flex;
    gap: 10px;
}

.username-wrapper {
    flex: 1;
}

.tag-wrapper {
    width: 100px;
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    transition: all 0.3s ease;
}

.tag-wrapper:focus-within {
    background: rgba(255, 255, 255, 0.1);
    border-color: #ff7eb3;
    box-shadow: 0 0 15px rgba(255, 126, 179, 0.15);
}

.tag-hash {
    padding-left: 12px;
    color: #b0b9c3;
    font-weight: bold;
    font-size: 1.1rem;
}

.tag-input {
    width: 100%;
    padding: 16px 12px;
    background: transparent;
    border: none;
    color: white;
    font-size: 1rem;
    outline: none;
    text-align: center;
    letter-spacing: 2px;
}

input {
    width: 100%;
    padding: 16px 45px 16px 45px;
    background: transparent;
    border: none;
    color: white;
    font-size: 1rem;
    outline: none;
}

input::placeholder {
    color: rgba(255, 255, 255, 0.3);
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

.login-link {
    margin-top: 2rem;
    text-align: center;
    color: #b0b9c3;
    font-size: 0.9rem;
}

.login-link a {
    color: #7afcff;
    text-decoration: none;
    font-weight: 600;
    margin-left: 5px;
    transition: color 0.2s;
}

.login-link a:hover {
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
