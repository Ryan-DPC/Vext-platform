<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import SakuraBackground from '@/components/SakuraBackground.vue'
import axios from 'axios'

const userStore = useUserStore()
const balance = computed(() => userStore.user?.balances?.chf?.toFixed(2) || '0.00')
const currency = computed(() => userStore.user?.currency || 'CHF')

interface Transaction {
  id: string
  userId: string
  amount: number
  currency: string
  type: string
  status: string
  createdAt: string
}

const transactions = ref<Transaction[]>([])
const activeTab = ref('deposit') // deposit | withdraw | history
const amount = ref('')
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

const fetchHistory = async () => {
  try {
    const res = await axios.get('/api/finance/history')
    transactions.value = res.data.data
  } catch (error) {
    console.error('Failed to fetch history', error)
  }
}

const handleTransaction = async () => {
  if (!amount.value || parseFloat(amount.value) <= 0) {
    message.value = 'Please enter a valid amount'
    isError.value = true
    return
  }

  isLoading.value = true
  message.value = ''
  isError.value = false

  try {
    const endpoint = activeTab.value === 'deposit' ? '/api/finance/deposit' : '/api/finance/withdraw'
    await axios.post(endpoint, {
      amount: parseFloat(amount.value),
      currency: currency.value
    })
    
    // Refresh user data to update balance
    await userStore.fetchProfile()
    await fetchHistory() // Refresh history
    
    message.value = `${activeTab.value === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`
    amount.value = ''
    isError.value = false
  } catch (error: any) {
    message.value = error.response?.data?.message || 'Transaction failed'
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="wallet-page">
    <SakuraBackground />
    
    <div class="wallet-container">
      <h1 class="page-title">Portefeuille</h1>
      
      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-label">Solde Actuel</div>
        <div class="balance-amount">{{ balance }} {{ currency }}</div>
      </div>

      <!-- Action Tabs -->
      <div class="wallet-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'deposit' }]" 
          @click="activeTab = 'deposit'"
        >
          Dépôt
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'withdraw' }]" 
          @click="activeTab = 'withdraw'"
        >
          Retrait
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'history' }]" 
          @click="activeTab = 'history'"
        >
          Historique
        </button>
      </div>

      <!-- Forms -->
      <div v-if="activeTab === 'deposit' || activeTab === 'withdraw'" class="transaction-form">
        <div class="form-group">
          <label>Montant ({{ currency }})</label>
          <input 
            v-model="amount" 
            type="number" 
            placeholder="0.00" 
            min="1"
            class="amount-input"
          />
        </div>
        
        <div v-if="message" :class="['status-message', isError ? 'error' : 'success']">
          {{ message }}
        </div>

        <button 
          class="action-btn" 
          :disabled="isLoading" 
          @click="handleTransaction"
        >
          <span v-if="isLoading">Traitement...</span>
          <span v-else>{{ activeTab === 'deposit' ? 'Déposer les fonds' : 'Retirer les fonds' }}</span>
        </button>

        <p class="note" v-if="activeTab === 'deposit'">
          * Ceci est une simulation. Aucune vraie carte n'est requise.
        </p>
      </div>

      <!-- History -->
      <div v-if="activeTab === 'history'" class="history-list">
        <div v-if="transactions.length === 0" class="empty-state">
          Aucune transaction récente.
        </div>
        <div v-else class="transaction-item" v-for="t in transactions" :key="t.id">
          <div class="t-info">
            <span class="t-type" :class="t.type.toLowerCase()">{{ t.type }}</span>
            <span class="t-date">{{ new Date(t.createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="t-amount" :class="{ 'positive': t.type === 'DEPOSIT', 'negative': t.type === 'WITHDRAWAL' }">
            {{ t.type === 'DEPOSIT' ? '+' : '-' }}{{ t.amount }} {{ t.currency }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-page {
  min-height: 100vh;
  padding: 100px 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  color: #fff;
}

.wallet-container {
  width: 100%;
  max-width: 600px;
  background: rgba(30, 25, 40, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  position: relative;
  z-index: 2;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.page-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 30px;
  font-family: 'Orbitron', sans-serif;
  background: linear-gradient(to right, #fff, #ff7eb3);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.balance-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  margin-bottom: 30px;
}

.balance-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

.balance-amount {
  font-size: 3rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 20px rgba(255, 126, 179, 0.5);
}

.wallet-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  background: rgba(0,0,0,0.2);
  padding: 5px;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: rgba(255,255,255,0.1);
  color: #fff;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.amount-input {
  width: 100%;
  padding: 15px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 1.2rem;
  outline: none;
}

.amount-input:focus {
  border-color: var(--accent-primary);
}

.action-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(45deg, #ff7eb3, #ff758c);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 117, 140, 0.3);
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.status-message {
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 6px;
  text-align: center;
}

.status-message.success {
  background: rgba(46, 213, 115, 0.2);
  color: #2ed573;
}

.status-message.error {
  background: rgba(255, 71, 87, 0.2);
  color: #ff4757;
}

.note {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: 15px;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.t-type {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 4px;
}

.t-type.deposit {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.t-type.withdrawal {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.t-date {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-left: 10px;
}

.t-amount {
  font-weight: 700;
}

.t-amount.positive { color: #2ed573; }
.t-amount.negative { color: #ff4757; }

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 30px;
}
</style>
