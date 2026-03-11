import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const MAX_PROMPT = 20_000;
const MAX_IMAGE  = 4_000_000;

function getAdminServices() {
    if (getApps().length === 0) {
        initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)) });
    }
    return { auth: getAuth(), db: getFirestore() };
}

const DEFAULT_DAILY_LIMIT = 30;
const today = () => new Date().toISOString().slice(0, 10);

let cachedLimit: { value: number; fetchedAt: number } | null = null;
const LIMIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getDailyLimit(db: Firestore): Promise<number> {
    const now = Date.now();
    if (cachedLimit && now - cachedLimit.fetchedAt < LIMIT_CACHE_TTL) {
        return cachedLimit.value;
    }
    const adminUid = process.env.ADMIN_UID;
    if (adminUid) {
        try {
            const snap = await db.doc(`users/${adminUid}/settings/data`).get();
            const val = snap.data()?.hostedDailyLimit;
            if (typeof val === 'number' && val > 0) {
                cachedLimit = { value: val, fetchedAt: now };
                return val;
            }
        } catch { /* fall through */ }
    }
    cachedLimit = { value: DEFAULT_DAILY_LIMIT, fetchedAt: now };
    return DEFAULT_DAILY_LIMIT;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', 'https://meal-tracker-v2-lzvh.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') return res.status(405).end();

    // 1. Verify Firebase ID token
    const token = (req.headers.authorization ?? '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing token' });

    let uid: string;
    try {
        const { auth } = getAdminServices();
        uid = (await auth.verifyIdToken(token)).uid;
    } catch (err) {
        console.error('verifyIdToken failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }

    // 2. Validate request sizes
    const { prompt, image } = req.body as { prompt: string; image?: { base64: string; mimeType: string } };
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (typeof prompt === 'string' && prompt.length > MAX_PROMPT)
        return res.status(400).json({ error: 'prompt_too_long' });
    if (image && typeof image.base64 === 'string' && image.base64.length > MAX_IMAGE)
        return res.status(400).json({ error: 'image_too_large' });
    if (image && !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType))
        return res.status(400).json({ error: 'invalid_mime_type' });

    // 3. Atomic rate limit check-and-increment
    const { db } = getAdminServices();
    const dailyLimit = await getDailyLimit(db);
    const usageRef = db.doc(`users/${uid}/usage/${today()}`);
    let count: number;
    try {
        count = await db.runTransaction(async (t) => {
            const snap = await t.get(usageRef);
            const current = (snap.data()?.hostedKeyCount ?? 0) as number;
            if (current >= dailyLimit) throw new Error('limit_exceeded');
            t.set(usageRef, { hostedKeyCount: current + 1 }, { merge: true });
            return current;
        });
    } catch (err: any) {
        if (err.message === 'limit_exceeded') {
            return res.status(429).json({ error: 'hosted_limit_exceeded', limit: dailyLimit });
        }
        console.error('Rate limit transaction failed:', err);
        return res.status(500).json({ error: 'Rate limit check failed' });
    }

    // 4. Call Gemini

    const parts: unknown[] = [];
    if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    parts.push({ text: prompt });

    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
        }
    );
    if (!geminiRes.ok) return res.status(502).json({ error: 'Upstream AI error' });

    const geminiData = await geminiRes.json();
    const raw: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const text = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    return res.status(200).json({ text, used: count + 1, limit: dailyLimit });
}
