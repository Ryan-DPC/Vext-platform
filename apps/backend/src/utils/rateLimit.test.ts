import { describe, expect, test } from 'bun:test';
import { allow, clientIp } from './rateLimit';

describe('rateLimit', () => {
    test('autorise jusqu\'à la limite puis bloque', () => {
        const key = `t1:${Math.random()}`;
        for (let i = 0; i < 3; i++) expect(allow(key, 3, 60_000)).toBe(true);
        expect(allow(key, 3, 60_000)).toBe(false);
    });

    test('les clés sont indépendantes', () => {
        const a = `ta:${Math.random()}`;
        const b = `tb:${Math.random()}`;
        expect(allow(a, 1, 60_000)).toBe(true);
        expect(allow(a, 1, 60_000)).toBe(false);
        expect(allow(b, 1, 60_000)).toBe(true);
    });

    test('la fenêtre expire', async () => {
        const key = `t2:${Math.random()}`;
        expect(allow(key, 1, 30)).toBe(true);
        expect(allow(key, 1, 30)).toBe(false);
        await new Promise(r => setTimeout(r, 40));
        expect(allow(key, 1, 30)).toBe(true);
    });

    test('clientIp lit x-forwarded-for en priorité', () => {
        expect(clientIp({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })).toBe('1.2.3.4');
        expect(clientIp({ 'x-real-ip': '5.6.7.8' })).toBe('5.6.7.8');
        expect(clientIp({})).toBe('unknown');
    });
});
