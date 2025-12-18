<script setup lang="ts">
import { useNotificationStore } from '../stores/notificationStore'
import { useRouter } from 'vue-router'

const notificationStore = useNotificationStore()
const router = useRouter()

const closePopup = () => {
  notificationStore.togglePopup()
}

const handleNotificationClick = (notification: any) => {
  if (!notification.read) {
    notificationStore.markAsRead(notification.id)
  }
  if (notification.actionUrl) {
    router.push(notification.actionUrl)
    closePopup()
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  }).format(new Date(date))
}

const getIcon = (type: string) => {
  switch (type) {
    case 'info': return 'fas fa-info-circle'
    case 'success': return 'fas fa-check-circle'
    case 'warning': return 'fas fa-exclamation-triangle'
    case 'error': return 'fas fa-times-circle'
    case 'invite': return 'fas fa-envelope'
    default: return 'fas fa-bell'
  }
}
</script>

<template>
  <div v-if="notificationStore.isPopupOpen" class="notification-overlay" @click.self="closePopup">
    <div class="notification-popup">
      <div class="popup-header">
        <h3>Notifications</h3>
        <div class="header-actions">
          <button v-if="notificationStore.unreadCount > 0" @click="notificationStore.markAllAsRead" class="mark-read-btn">
            Tout marquer comme lu
          </button>
          <button class="close-btn" @click="closePopup"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <div class="notifications-list">
        <div v-if="notificationStore.notifications.length === 0" class="empty-state">
          <i class="fas fa-bell-slash"></i>
          <p>Aucune notification</p>
        </div>
        
        <div 
          v-for="notification in notificationStore.notifications" 
          :key="notification.id"
          class="notification-item"
          :class="{ 'unread': !notification.read }"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon" :class="notification.type">
            <i :class="getIcon(notification.type)"></i>
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <span class="title">{{ notification.title }}</span>
              <span class="time">{{ formatDate(notification.timestamp) }}</span>
            </div>
            <p class="message">{{ notification.message }}</p>
          </div>
          <div v-if="!notification.read" class="unread-dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: 1000;
  /* Transparent background to allow clicking outside, but maybe no dimming? 
     User requested "systeme de notification", usually a dropdown. 
     Let's make it a dropdown positioned relative to the header or just fixed top-right.
     For now, fixed position similar to friends popup but maybe smaller/positioned.
  */
  background: transparent; 
}

.notification-popup {
  position: absolute;
  top: 70px; /* Below header */
  right: 80px; /* Aligned with bell icon roughly */
  width: 350px;
  max-height: 500px;
  background: #1a1a1a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.popup-header {
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.02);
}

.popup-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mark-read-btn {
  background: none;
  border: none;
  color: #7afcff;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}
.mark-read-btn:hover { text-decoration: underline; }

.close-btn {
  background: none;
  border: none;
  color: #b0b9c3;
  cursor: pointer;
  font-size: 1rem;
}
.close-btn:hover { color: white; }

.notifications-list {
  overflow-y: auto;
  max-height: 400px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #b0b9c3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.empty-state i { font-size: 2rem; opacity: 0.5; }

.notification-item {
  padding: 15px 20px;
  display: flex;
  gap: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: rgba(255,255,255,0.05);
}

.notification-item.unread {
  background: rgba(122, 252, 255, 0.05);
}

.notification-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-icon.info { color: #7afcff; background: rgba(122, 252, 255, 0.1); }
.notification-icon.success { color: #00ff9d; background: rgba(0, 255, 157, 0.1); }
.notification-icon.warning { color: #ffeb3b; background: rgba(255, 235, 59, 0.1); }
.notification-icon.error { color: #ff5252; background: rgba(255, 82, 82, 0.1); }
.notification-icon.invite { color: #ff7eb3; background: rgba(255, 126, 179, 0.1); }

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.title {
  font-weight: 600;
  font-size: 0.9rem;
  color: white;
}

.time {
  font-size: 0.75rem;
  color: #666;
}

.message {
  margin: 0;
  font-size: 0.85rem;
  color: #b0b9c3;
  line-height: 1.4;
}

.unread-dot {
  position: absolute;
  top: 15px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff7eb3;
}
</style>
