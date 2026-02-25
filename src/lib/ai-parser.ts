import { getSettings, getMealsByDate } from './db';
import { format } from 'date-fns';

export interface ParsedMeal {
    food: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
}

export type AIResponse =
    | { type: 'meal'; data: ParsedMeal }
    | { type: 'chat'; message: string }
    | { type: 'error'; message: string };

export const processInput = async (input: string): Promise<AIResponse> => {
    const settings = await getSettings();
    const apiKey = settings.apiKey;

    if (!apiKey) {
        return { type: 'error', message: 'No API key set. Please add your Gemini API key in Settings.' };
    }

    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayMeals = await getMealsByDate(today);

        const mealContext = todayMeals.length > 0
            ? todayMeals.map(m =>
                `- ${m.parsed[0]?.food || m.content}: ${m.totalCalories} kcal, ${m.parsed[0]?.protein || 0}g protein, ${m.parsed[0]?.carbs || 0}g carbs, ${m.parsed[0]?.fiber || 0}g fiber`
            ).join('\n')
            : 'Nothing logged yet today.';

        const totals = todayMeals.reduce((acc, m) => ({
            calories: acc.calories + (m.totalCalories || 0),
            protein: acc.protein + (m.parsed[0]?.protein || 0),
            carbs: acc.carbs + (m.parsed[0]?.carbs || 0),
            fiber: acc.fiber + (m.parsed[0]?.fiber || 0),
        }), { calories: 0, protein: 0, carbs: 0, fiber: 0 });

        const systemPrompt = `You are a nutrition assistant in a personal meal tracker app. The user tracks Indian and general food.

Your job:
1. If the user describes eating something, extract nutritional info and return a meal log.
2. If the user asks a question about their nutrition or health, answer conversationally using their today's data.

User's portion size calibrations:
- 1 bowl (liquid): ${settings.unitBowlLiquid}ml
- 1 bowl (solid): ${settings.unitBowlSolid}g
- 1 tablespoon: ${settings.unitTbsp}g
- 1 teaspoon: ${settings.unitTsp}g

Today's logged meals:
${mealContext}

Today's totals so far: ${totals.calories} kcal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fiber}g fiber
Daily goals: ${settings.dailyCalories} kcal, ${settings.dailyProtein}g protein, ${settings.dailyCarbs}g carbs, ${settings.dailyFiber}g fiber

Respond ONLY with valid JSON in one of these two formats:

For logging a meal:
{"type":"meal","food":"descriptive name","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number}

For a conversational answer:
{"type":"chat","message":"your response here"}

All nutritional values must be integers. No markdown, no explanation outside the JSON.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser says: ${input}` }] }],
                generationConfig: { temperature: 0.1 },
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API error body:', err);
            throw new Error(`Gemini API error: ${response.status} — ${err}`);
        }

        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const sanitized = raw.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(sanitized);

        if (parsed.type === 'meal') {
            return {
                type: 'meal',
                data: {
                    food: parsed.food || input,
                    calories: parseInt(parsed.calories) || 0,
                    protein: parseInt(parsed.protein) || 0,
                    fat: parseInt(parsed.fat) || 0,
                    carbs: parseInt(parsed.carbs) || 0,
                    fiber: parseInt(parsed.fiber) || 0,
                },
            };
        }

        if (parsed.type === 'chat') {
            return { type: 'chat', message: parsed.message };
        }

        throw new Error('Unexpected response format');

    } catch (error) {
        console.error('processInput error:', error);
        return { type: 'error', message: 'Something went wrong. Please try again.' };
    }
};
