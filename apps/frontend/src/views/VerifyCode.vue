<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const email = ref(String(route.query.email || ''))
const digits = ref(['', '', '', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])
const error = ref('')
const successMessage = ref('')
const isLoading = ref(false)
const resendCooldown = ref(0)
let timer: any = null

onMounted(() => {
    if (!email.value) {
        router.push('/login')
        return
    }
    // Auto-focus first input
    nextTick(() => {
        if (inputRefs.value[0]) {
            inputRefs.value[0].focus()
        }
    })
    startResendTimer(60)
})

const startResendTimer = (seconds: number) => {
    resendCooldown.value = seconds
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
        if (resendCooldown.value > 0) {
            resendCooldown.value--
        } else {
            clearInterval(timer)
        }
    }, 1000)
}

const onInput = (index: number, event: Event) => {
    const input = event.target as HTMLInputElement
    const val = input.value.replace(/\D/g, '') // only digits
    digits.value[index] = val && val.length > 0 ? (val[val.length - 1] ?? '') : ''

    error.value = ''

    if (digits.value[index] && index < 5) {
        inputRefs.value[index + 1]?.focus()
    }

    // Auto-submit if all 6 digits are entered
    if (digits.value.every(d => d !== '')) {
        handleVerify()
    }
}

const onKeyDown = (index: number, event: KeyboardEvent) => {
    if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
        digits.value[index - 1] = ''
        inputRefs.value[index - 1]?.focus()
    } else if (event.key === 'ArrowLeft' && index > 0) {
        inputRefs.value[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < 5) {
        inputRefs.value[index + 1]?.focus()
    }
}

const onPaste = (event: ClipboardEvent) => {
    event.preventDefault()
    const pasted = event.clipboardData?.getData('text') || ''
    const clean = pasted.replace(/\D/g, '').slice(0, 6)
    if (!clean) return

    for (let i = 0; i < 6; i++) {
        digits.value[i] = clean[i] || ''
    }

    const nextIndex = Math.min(clean.length, 5)
    inputRefs.value[nextIndex]?.focus()

    if (clean.length === 6) {
        handleVerify()
    }
}

const handleVerify = async () => {
    error.value = ''
    successMessage.value = ''
    const code = digits.value.join('')

    if (code.length !== 6) {
        error.value = 'Veuillez renseigner les 6 chiffres du code.'
        return
    }

    isLoading.value = true
    try {
        await userStore.verifyCode(email.value, code, true)
        successMessage.value = 'Compte vérifié ! Redirection...'
        setTimeout(() => {
            router.push('/home')
        }, 1000)
    } catch (e: any) {
        error.value = e.response?.data?.message || 'Code de vérification invalide ou expiré.'
    } finally {
        isLoading.value = false
    }
}

const handleResend = async () => {
    if (resendCooldown.value > 0) return

    error.value = ''
    successMessage.value = ''
    isLoading.value = true

    try {
        const res = await axios.post('/auth/resend-code', {
            email: email.value,
            purpose: 'email_verify'
        })
        successMessage.value = res.data?.message || 'Un nouveau code vous a été envoyé.'
        startResendTimer(60)
        digits.value = ['', '', '', '', '', '']
        inputRefs.value[0]?.focus()
    } catch (e: any) {
        error.value = e.response?.data?.message || 'Impossible d\'envoyer un nouveau code.'
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="verify-container">
        <div class="bg-glow pink-glow"></div>
        <div class="bg-glow cyan-glow"></div>

        <div class="verify-card">
            <div class="logo-header">
                <img src="@/assets/images/logo.png" alt="VEXT" class="verify-logo" />
                <h1>Vérification de sécurité</h1>
                <p class="subtitle">
                    Nous avons envoyé un code à 6 chiffres à :<br>
                    <span class="user-email">{{ email }}</span>
                </p>
            </div>

            <div v-if="error" class="alert-box error-box">
                <i class="fas fa-exclamation-triangle"></i>
                <span>{{ error }}</span>
            </div>

            <div v-if="successMessage" class="alert-box success-box">
                <i class="fas fa-check-circle"></i>
                <span>{{ successMessage }}</span>
            </div>

            <form @submit.prevent="handleVerify" class="verify-form">
                <div class="code-inputs" @paste="onPaste">
                    <input
                        v-for="(_, index) in digits"
                        :key="index"
                        :ref="el => inputRefs[index] = (el as HTMLInputElement)"
                        type="text"
                        inputmode="numeric"
                        maxlength="1"
                        class="code-input"
                        :class="{ filled: digits[index] !== '' }"
                        :value="digits[index]"
                        @input="onInput(index, $event)"
                        @keydown="onKeyDown(index, $event)"
                    />
                </div>

                <button type="submit" class="btn-verify" :disabled="isLoading || digits.some(d => d === '')">
                    <span v-if="isLoading"><i class="fas fa-spinner fa-spin"></i> Vérification...</span>
                    <span v-else>Valider et Continuer</span>
                </button>
            </form>

            <div class="resend-section">
                <p>Vous n'avez pas reçu le code ?</p>
                <button
                    type="button"
                    class="btn-resend"
                    :disabled="resendCooldown > 0 || isLoading"
                    @click="handleResend"
                >
                    <span v-if="resendCooldown > 0">Renvoyer un code ({{ resendCooldown }}s)</span>
                    <span v-else><i class="fas fa-redo"></i> Renvoyer un nouveau code</span>
                </button>
            </div>

            <div class="footer-links">
                <router-link to="/login" class="back-link">
                    <i class="fas fa-arrow-left"></i> Retour à la connexion
                </router-link>
            </div>
        </div>
    </div>
</template>

<style scoped>
.verify-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #0c0812;
    position: relative;
    overflow: hidden;
    padding: 20px;
}

.bg-glow {
    position: absolute;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.15;
    pointer-events: none;
}

.pink-glow {
    top: 15%;
    left: 20%;
    background: radial-gradient(circle, #ff758f 0%, rgba(255, 117, 143, 0) 70%);
}

.cyan-glow {
    bottom: 15%;
    right: 20%;
    background: radial-gradient(circle, #70d6ff 0%, rgba(112, 214, 255, 0) 70%);
}

.verify-card {
    background: rgba(22, 15, 33, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 117, 143, 0.2);
    border-radius: 24px;
    padding: 44px 36px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    position: relative;
    z-index: 10;
    text-align: center;
}

.logo-header {
    margin-bottom: 28px;
}

.verify-logo {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    filter: drop-shadow(0 4px 16px rgba(255, 117, 143, 0.4));
}

h1 {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 8px 0;
}

.subtitle {
    color: #a39bb3;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
}

.user-email {
    color: #ff758f;
    font-weight: 600;
}

.alert-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    margin-bottom: 20px;
    text-align: left;
}

.error-box {
    background: rgba(255, 75, 100, 0.12);
    border: 1px solid rgba(255, 75, 100, 0.3);
    color: #ff6b81;
}

.success-box {
    background: rgba(46, 213, 115, 0.12);
    border: 1px solid rgba(46, 213, 115, 0.3);
    color: #2ed573;
}

.verify-form {
    margin-bottom: 24px;
}

.code-inputs {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin: 28px 0;
}

.code-input {
    width: 52px;
    height: 64px;
    border-radius: 14px;
    background: rgba(14, 9, 20, 0.8);
    border: 1.5px solid rgba(255, 255, 255, 0.12);
    color: #ffffff;
    font-size: 28px;
    font-weight: 800;
    text-align: center;
    font-family: monospace;
    transition: all 0.2s ease;
}

.code-input:focus {
    outline: none;
    border-color: #ff758f;
    box-shadow: 0 0 16px rgba(255, 117, 143, 0.35);
    background: rgba(255, 117, 143, 0.05);
}

.code-input.filled {
    border-color: rgba(255, 117, 143, 0.5);
    color: #ff758f;
}

.btn-verify {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, #ff758f, #ff4d6d);
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(255, 77, 109, 0.35);
    transition: all 0.2s ease;
}

.btn-verify:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(255, 77, 109, 0.5);
}

.btn-verify:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.resend-section {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 20px;
    margin-bottom: 20px;
}

.resend-section p {
    color: #7b738c;
    font-size: 13px;
    margin: 0 0 8px 0;
}

.btn-resend {
    background: transparent;
    border: none;
    color: #70d6ff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s ease;
}

.btn-resend:hover:not(:disabled) {
    color: #a0e4ff;
    text-decoration: underline;
}

.btn-resend:disabled {
    color: #554e63;
    cursor: not-allowed;
    text-decoration: none;
}

.footer-links {
    margin-top: 10px;
}

.back-link {
    color: #8c829e;
    font-size: 13px;
    text-decoration: none;
    transition: color 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.back-link:hover {
    color: #ffffff;
}
</style>
