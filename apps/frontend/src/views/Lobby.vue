<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLobbyStore } from '../stores/lobbyStore'
import { useUserStore } from '../stores/userStore'
import { useAlertStore } from '../stores/alertStore'

const router = useRouter()
const lobbyStore = useLobbyStore()
const userStore = useUserStore()
const alertStore = useAlertStore()

const currentLobby = computed(() => lobbyStore.currentLobby)
const isHost = computed(() => lobbyStore.isHost)
const pendingInvites = computed(() => lobbyStore.pendingInvites)

const leaveLobby = async () => {
    try {
        await lobbyStore.leaveLobby()
        alertStore.showAlert({ title: 'Lobby', message: 'Vous avez quitté le lobby', type: 'info' })
        router.push('/home')
    } catch (err: any) {
        alertStore.showAlert({ title: 'Erreur', message: err.message, type: 'error' })
    }
}

const acceptInvite = async (lobbyId: string) => {
    try {
        await lobbyStore.joinLobby(lobbyId)
        lobbyStore.removeInvite(lobbyId)
    } catch (err: any) {
        alertStore.showAlert({ title: 'Erreur', message: err.message, type: 'error' })
    }
}

const declineInvite = (lobbyId: string) => {
    lobbyStore.removeInvite(lobbyId)
}
</script>

<template>
    <div class="lobby-container">
        <!-- Active Lobby -->
        <div v-if="currentLobby" class="lobby-active glass-panel">
            <div class="lobby-header">
                <div>
                    <h1>{{ currentLobby.gameName }}</h1>
                    <span class="lobby-id">Lobby #{{ currentLobby.id }}</span>
                </div>
                <button @click="leaveLobby" class="btn-danger">Quitter</button>
            </div>

            <div class="players-list">
                <h3>Joueurs ({{ currentLobby.players.length }}/{{ currentLobby.maxPlayers }})</h3>
                <div v-for="player in currentLobby.players" :key="player.userId" class="player-card">
                    <img :src="player.profile_pic || '/default-avatar.svg'" class="avatar" />
                    <div class="player-info">
                        <span class="player-name">{{ player.username }}</span>
                        <span v-if="player.isHost" class="host-badge">Host</span>
                    </div>
                </div>
            </div>

            <div v-if="isHost" class="host-controls">
                <button class="btn-primary btn-glow">Lancer la partie</button>
            </div>
        </div>

        <!-- No Active Lobby -->
        <div v-else class="lobby-empty">
            <h1>Lobby</h1>

            <!-- Pending Invites -->
            <div v-if="pendingInvites.length > 0" class="invites-section">
                <h2>Invitations en attente</h2>
                <div v-for="invite in pendingInvites" :key="invite.lobbyId" class="invite-card glass-panel">
                    <span>{{ invite.fromUsername }} vous invite à rejoindre un lobby</span>
                    <div class="invite-actions">
                        <button @click="acceptInvite(invite.lobbyId)" class="btn-primary btn-sm">Rejoindre</button>
                        <button @click="declineInvite(invite.lobbyId)" class="btn-text btn-sm">Refuser</button>
                    </div>
                </div>
            </div>

            <div v-else class="no-lobby glass-panel">
                <p>Vous n'êtes dans aucun lobby.</p>
                <p class="hint">Rejoignez un lobby via une invitation d'ami ou depuis la page d'un jeu.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.lobby-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
    color: #fff;
}

.glass-panel {
    background: rgba(30, 30, 30, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px;
}

.lobby-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
}

.lobby-header h1 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
}

.lobby-id {
    color: #888;
    font-size: 0.9rem;
}

.players-list h3 {
    margin-bottom: 16px;
    color: #ccc;
}

.player-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    margin-bottom: 8px;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.player-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.player-name {
    font-weight: 600;
}

.host-badge {
    background: #00dc82;
    color: #000;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
}

.host-controls {
    margin-top: 24px;
    text-align: center;
}

.invites-section {
    margin-top: 30px;
}

.invites-section h2 {
    font-size: 1.3rem;
    margin-bottom: 16px;
}

.invite-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.invite-actions {
    display: flex;
    gap: 8px;
}

.no-lobby {
    text-align: center;
    padding: 60px 24px;
    margin-top: 30px;
}

.no-lobby p {
    margin: 8px 0;
}

.hint {
    color: #888;
    font-size: 0.9rem;
}

.btn-primary {
    background: linear-gradient(135deg, #00dc82, #00a86b);
    color: #000;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 20px rgba(0, 220, 130, 0.4); }

.btn-danger {
    background: rgba(255, 68, 68, 0.2);
    color: #ff4444;
    border: 1px solid rgba(255, 68, 68, 0.3);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-danger:hover { background: rgba(255, 68, 68, 0.4); }

.btn-sm { padding: 6px 14px; font-size: 0.85rem; }
.btn-text { background: none; border: none; color: #888; cursor: pointer; text-decoration: underline; }
.btn-glow:hover { box-shadow: 0 0 20px rgba(0, 220, 130, 0.4); }

h1 { font-size: 2rem; font-weight: 800; }
</style>
