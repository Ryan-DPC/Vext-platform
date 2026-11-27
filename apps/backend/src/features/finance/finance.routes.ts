
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { JWT_SECRET } from '../../config/jwt';
import { financeService } from './finance.service';

const CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'];
const MAX_AMOUNT = 100_000;

/** Valide montant (fini, > 0, 2 décimales max), devise (liste blanche) et moyen de paiement. */
function parseMoney(body: any): { amount: number; currency: string; method: string } | { error: string } {
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
        return { error: 'Montant invalide.' };
    }
    const currency = String(body?.currency || 'CHF').toUpperCase();
    if (!CURRENCIES.includes(currency)) {
        return { error: 'Devise non supportée.' };
    }
    const method = String(body?.method || '').slice(0, 30).replace(/[^A-Za-z0-9 _-]/g, '') || undefined as any;
    return { amount: Math.round(amount * 100) / 100, currency, method };
}

export const financeRoutes = new Elysia({ prefix: '/api/finance' })
    .use(jwt({
        name: 'jwt',
        secret: JWT_SECRET
    }))
    .derive(async ({ headers, jwt, set }) => {
        const auth = headers['authorization'];
        if (!auth || !auth.startsWith('Bearer ')) {
            return { user: null };
        }
        const token = auth.slice(7);
        const payload = await jwt.verify(token);
        return { user: payload };
    })
    .onBeforeHandle(({ user, set }) => {
        if (!user) {
            set.status = 401;
            return { message: 'Unauthorized' };
        }
    })
    .get('/history', async ({ user, query }) => {
        const { page = '1', limit = '20' } = query as any;
        return await financeService.getTransactionHistory((user as any).id, parseInt(page), parseInt(limit));
    })
    .post('/deposit', async ({ body, user, set }) => {
        // Aucune passerelle de paiement n'est branchée : un dépôt crée de l'argent sans contrepartie.
        // Réservé aux admins (tests) tant qu'un vrai paiement n'est pas intégré ; ALLOW_FREE_DEPOSITS=true pour lever la limite.
        if (!(user as any).isAdmin && process.env.ALLOW_FREE_DEPOSITS !== 'true') {
            set.status = 403;
            return { message: 'Les dépôts ne sont pas encore disponibles.' };
        }
        const parsed = parseMoney(body);
        if ('error' in parsed) {
            set.status = 400;
            return { message: parsed.error };
        }
        try {
            return await financeService.deposit((user as any).id, parsed.amount, parsed.currency, parsed.method);
        } catch (err: any) {
            set.status = 400;
            return { message: err.message };
        }
    })
    .post('/withdraw', async ({ body, user, set }) => {
        const parsed = parseMoney(body);
        if ('error' in parsed) {
            set.status = 400;
            return { message: parsed.error };
        }
        try {
            return await financeService.withdraw((user as any).id, parsed.amount, parsed.currency, parsed.method);
        } catch (err: any) {
            set.status = 400;
            return { message: err.message };
        }
    });
