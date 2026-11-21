import axios from 'axios'

const getBaseURL = () => {
    // If VITE_API_URL is explicitly set and not pointing to old render domain
    if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('onrender.com')) {
        return `${import.meta.env.VITE_API_URL}/api`
    }

    // Default to VPS 24/7 Production Backend
    return 'https://hoopslive.ch/vext/api'
}

axios.defaults.baseURL = getBaseURL()
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Request interceptor - automatically add Authorization header
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Log requests in development
        if (import.meta.env.DEV) {
            console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, config.data || '')
        }

        return config
    },
    (error) => {
        console.error('❌ Request error:', error)
        return Promise.reject(error)
    }
)

// Response interceptor - handle errors globally
axios.interceptors.response.use(
    (response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
            console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
        }
        return response
    },
    (error) => {
        // Handle 401 Unauthorized - redirect to login (except on login itself)
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
            console.warn('⚠️ Unauthorized access, redirecting to login...')
            localStorage.removeItem('token')
            sessionStorage.removeItem('token')
            if (window.location.hash !== '#/login') {
                window.location.hash = '#/login'
            }
        }

        // Log detailed error information
        console.error('❌ API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        })

        return Promise.reject(error)
    }
)

export default axios
