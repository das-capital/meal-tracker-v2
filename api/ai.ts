import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getAdminServices() {
    if (getApps().length === 0) {
        initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)) });
    }
    return { auth: getAuth(), db: getFirestore() };
}

const DAILY_LIMIT = 30;
const today = () => new Date().toISOString().slice(0, 10);

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // 2. Rate limit check
    const { db } = getAdminServices();
    const usageRef = db.doc(`users/${uid}/usage/${today()}`);
    const snap = await usageRef.get();
    const count: number = snap.exists ? (snap.data()?.hostedKeyCount ?? 0) : 0;
    if (count >= DAILY_LIMIT) {
        return res.status(429).json({ error: 'hosted_limit_exceeded', used: count, limit: DAILY_LIMIT });
    }

    // 3. Call Gemini
    const { prompt, image } = req.body as { prompt: string; image?: { base64: string; mimeType: string } };
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

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

    // 4. Increment usage (only after successful call)
    await usageRef.set({ hostedKeyCount: FieldValue.increment(1) }, { merge: true });

    return res.status(200).json({ text, used: count + 1, limit: DAILY_LIMIT });
}
