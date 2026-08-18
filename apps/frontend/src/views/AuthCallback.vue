<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { getApiUrl } from '../utils/url'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
    const token = route.query.token as string
    const isGithub = route.query.github === 'true'

    if (token && isGithub) {
        // Token was returned from backend GitHub OAuth callback
        localStorage.setItem('token', token)
        await userStore.fetchProfile()
        router.push('/home')
        return
    }

    const code = route.query.code as string
    if (code) {
        window.location.href = `${getApiUrl()}/api/auth/github/callback?code=${code}`
    } else {
        router.push('/login?error=No+code+received')
    }
})
</script>

<template>
    <div class="callback-container">
        <div class="loading">
            <div class="spinner"></div>
            <p>Completing GitHub Login...</p>
        </div>
    </div>
</template>

<style scoped>
.callback-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #1a1a1a;
    color: white;
}

.loading {
    text-align: center;
}

.spinner {
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-left-color: #00dc82;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
