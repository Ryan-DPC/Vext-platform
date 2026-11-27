/**
 * Limiteur de débit en mémoire (fenêtre glissante), suffisant pour un seul processus backend.
 * Sert à freiner la force brute sur login / vérification de code / inscription.
 */
const hits = new Map<string, number[]>();

/** IP du client : Caddy / reverse proxy la place dans x-forwarded-for. */
export function clientIp(headers: Record<string, string | undefined>): string {
    const fwd = headers['x-forwarded-for'];
    if (fwd) return fwd.split(',')[0]!.trim();
    return headers['x-real-ip'] || 'unknown';
}

/** Retourne true si la requête est autorisée, false si la limite est dépassée. */
export function allow(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) {
        hits.set(key, recent);
        return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
}

// Nettoyage périodique pour ne pas faire grossir la Map indéfiniment
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) {
        const recent = v.filter(t => now - t < 60 * 60 * 1000);
        if (recent.length === 0) hits.delete(k);
        else hits.set(k, recent);
    }
}, 10 * 60 * 1000).unref?.();
