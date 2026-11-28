# Déploiement VPS (hoopslive.ch/vext)

Les secrets ne sont **pas** dans le dépôt : `docker-compose.yml` lit `${MONGODB_URI}`, `${REDIS_URL}`,
`${JWT_SECRET}` (32 caractères minimum, le backend refuse de démarrer sinon), `${CLOUDINARY_URL}`,
`${SMTP_PASS}`, `${UPDATE_PUBLISH_TOKEN}`, `${STEAM_API_KEY}` depuis un fichier `.env` à côté du compose.

## Services

| Conteneur    | Rôle                                                                 |
|--------------|----------------------------------------------------------------------|
| `vext-backend` | API REST (port 3001), mises à jour de l'app (`/api/updates`), catalogue Steam |
| `vext-ws`      | WebSocket temps réel (port 3002) : chat, présence, groupes, lobbies  |

## Caddy (reverse proxy partagé)

Le client se connecte à `wss://hoopslive.ch/vext?token=<JWT>`. Il faut router les requêtes WebSocket
vers `vext-ws` **avant** la règle générale `/vext/*` :

```
@vext_ws {
    path /vext /vext/
    header Connection *Upgrade*
    header Upgrade websocket
}
handle @vext_ws {
    uri strip_prefix /vext
    reverse_proxy vext-ws:3002
}
```

Puis : `docker exec hoopslive-caddy caddy validate --config /etc/caddy/Caddyfile` et `caddy reload`.

## Mises à jour de l'application (Tauri)

La CI (`release.yml`) publie l'installateur signé sur `POST /api/updates/publish`
(en-tête `x-update-token` = secret GitHub `VEXT_UPDATE_TOKEN`). L'app lit `/api/updates/latest.json`.

## Pare-feu : ports des bases de données

Docker publie MongoDB (27017), Redis (6379), Postgres (5432) et S3 (9000) sur toutes les interfaces et
**contourne UFW**. Soit on lie ces ports à `127.0.0.1` dans les compose concernés, soit on filtre :

```
iptables -I DOCKER-USER 1 -i eth0 -p tcp -m multiport --dports 27017,6379,5432,9000 -j DROP
iptables -I DOCKER-USER 1 -i eth0 -s <IP_AUTORISÉE> -p tcp -m multiport --dports 27017,6379,5432,9000 -j ACCEPT
```

(les règles `iptables` ne survivent pas à un redémarrage sans persistance).
