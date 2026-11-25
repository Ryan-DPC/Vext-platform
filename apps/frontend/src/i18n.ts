import { createI18n } from 'vue-i18n'

const messages = {
    English: {
        settings: {
            title: '{tab} SETTINGS',
            tabs: {
                Account: 'Account',
                Profile: 'Profile',
                Security: 'Security',
                Notifications: 'Notifications',
                Appearance: 'Appearance',
                Updates: 'Updates'
            },
            account: {
                username: 'Username',
                email: 'Email',
                language: 'Language',
                bio: 'Bio',
                social_links: 'Social Links',
                twitter: 'Twitter',
                discord: 'Discord',
                website: 'Website'
            },
            security: {
                current_password: 'Current Password',
                new_password: 'New Password',
                confirm_password: 'Confirm Password',
                update_btn: 'UPDATE PASSWORD'
            },
            notifications: {
                section_title: 'Notification Preferences',
                email_updates: 'Email Updates',
                email_updates_desc: 'Receive important account and security updates by email.',
                push_notifications: 'Desktop Notifications',
                push_notifications_desc: 'Show notifications for friend requests, messages and downloads.',
                marketing_emails: 'News & Promotions',
                marketing_emails_desc: 'Receive news about new games, events and VEXT offers.'
            },
            appearance: {
                display_mode: 'Display Mode',
                dark_mode: 'Dark Mode',
                dark_mode_desc: 'Toggle between Light and Dark interface.',
                themes: 'Themes',
                community_plugins: 'Community Plugins',
                no_plugins: 'No plugins installed.',
                install_plugin: '+ Install Plugin',
                remove: 'Remove'
            },
            updates: {
                client_name: 'VEXT Gaming Client',
                channel: 'Stable Channel (GitHub)',
                checking: 'Checking for updates...',
                available: 'New version {version} available!',
                downloading: 'Downloading update ({progress}%)...',
                error_default: 'Unable to check for updates.',
                up_to_date: 'Your VEXT client is up to date.',
                release_notes: 'Release notes:',
                check_btn: 'Check for updates',
                install_btn: 'Install v{version}'
            },
            save_btn: 'SAVE CHANGES',
            saving: 'SAVING...'
        }
    },
    French: {
        settings: {
            title: 'PARAMÈTRES {tab}',
            tabs: {
                Account: 'Compte',
                Profile: 'Profil',
                Security: 'Sécurité',
                Notifications: 'Notifications',
                Appearance: 'Apparence',
                Updates: 'Mises à jour'
            },
            account: {
                username: 'Nom d\'utilisateur',
                email: 'Email',
                language: 'Langue',
                bio: 'Biographie',
                social_links: 'Réseaux Sociaux',
                twitter: 'Twitter',
                discord: 'Discord',
                website: 'Site Web'
            },
            security: {
                current_password: 'Mot de passe actuel',
                new_password: 'Nouveau mot de passe',
                confirm_password: 'Confirmer le mot de passe',
                update_btn: 'METTRE À JOUR'
            },
            notifications: {
                section_title: 'Préférences de notifications',
                email_updates: 'Mises à jour par email',
                email_updates_desc: 'Recevoir les alertes importantes de compte et sécurité par email.',
                push_notifications: 'Notifications bureau',
                push_notifications_desc: 'Afficher les notifications pour les demandes d\'amis, messages et téléchargements.',
                marketing_emails: 'Actualités & Offres',
                marketing_emails_desc: 'Recevoir les nouveautés sur les jeux, événements et offres VEXT.'
            },
            appearance: {
                display_mode: 'Mode d\'affichage',
                dark_mode: 'Mode Sombre',
                dark_mode_desc: 'Basculer entre l\'interface claire et sombre.',
                themes: 'Thèmes',
                community_plugins: 'Plugins Communautaires',
                no_plugins: 'Aucun plugin installé.',
                install_plugin: '+ Installer un plugin',
                remove: 'Supprimer'
            },
            updates: {
                client_name: 'Client Gaming VEXT',
                channel: 'Canal Stable (GitHub)',
                checking: 'Recherche de mises à jour en cours...',
                available: 'Nouvelle version {version} disponible !',
                downloading: 'Téléchargement en cours ({progress}%)...',
                error_default: 'Impossible de vérifier les mises à jour.',
                up_to_date: 'Votre client VEXT est à jour.',
                release_notes: 'Notes de version :',
                check_btn: 'Rechercher des mises à jour',
                install_btn: 'Installer v{version}'
            },
            save_btn: 'ENREGISTRER',
            saving: 'ENREGISTREMENT...'
        }
    },
    Spanish: {
        settings: {
            title: 'AJUSTES DE {tab}',
            tabs: {
                Account: 'Cuenta',
                Profile: 'Perfil',
                Security: 'Seguridad',
                Notifications: 'Notificaciones',
                Appearance: 'Apariencia',
                Updates: 'Actualizaciones'
            },
            account: {
                username: 'Nombre de usuario',
                email: 'Correo electrónico',
                language: 'Idioma',
                bio: 'Biografía',
                social_links: 'Redes Sociales',
                twitter: 'Twitter',
                discord: 'Discord',
                website: 'Sitio Web'
            },
            security: {
                current_password: 'Contraseña actual',
                new_password: 'Nueva contraseña',
                confirm_password: 'Confirmar contraseña',
                update_btn: 'ACTUALIZAR CONTRASEÑA'
            },
            notifications: {
                section_title: 'Preferencias de notificaciones',
                email_updates: 'Actualizaciones por correo',
                email_updates_desc: 'Recibir alertas importantes de cuenta y seguridad por correo.',
                push_notifications: 'Notificaciones de escritorio',
                push_notifications_desc: 'Mostrar notificaciones de solicitudes de amistad, mensajes y descargas.',
                marketing_emails: 'Noticias y Ofertas',
                marketing_emails_desc: 'Recibir novedades sobre juegos, eventos y ofertas de VEXT.'
            },
            appearance: {
                display_mode: 'Modo de visualización',
                dark_mode: 'Modo Oscuro',
                dark_mode_desc: 'Alternar entre interfaz clara y oscura.',
                themes: 'Temas',
                community_plugins: 'Plugins de la comunidad',
                no_plugins: 'No hay plugins instalados.',
                install_plugin: '+ Instalar plugin',
                remove: 'Eliminar'
            },
            updates: {
                client_name: 'Cliente Gaming VEXT',
                channel: 'Canal Estable (GitHub)',
                checking: 'Buscando actualizaciones...',
                available: '¡Nueva versión {version} disponible!',
                downloading: 'Descargando actualización ({progress}%)...',
                error_default: 'No se pudieron buscar actualizaciones.',
                up_to_date: 'Tu cliente VEXT está actualizado.',
                release_notes: 'Notas de la versión:',
                check_btn: 'Buscar actualizaciones',
                install_btn: 'Instalar v{version}'
            },
            save_btn: 'GUARDAR CAMBIOS',
            saving: 'GUARDANDO...'
        }
    }
}

const i18n = createI18n({
    legacy: false, // you must set `false`, to use Composition API
    locale: 'English', // set locale
    fallbackLocale: 'English', // set fallback locale
    messages, // set locale messages
})

export default i18n
