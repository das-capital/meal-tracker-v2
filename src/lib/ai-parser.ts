import { getSettings, getMealsByDate, getAllMeals, getAllRecipes, type RecipeIngredient } from './db';
import { format, subDays } from 'date-fns';

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
    | { type: 'favourite_save'; name: string }
    | { type: 'favourite_log'; name: string }
    | { type: 'weight'; weight: number }
    | { type: 'height'; height: number }
    | { type: 'age'; age: number }
    | { type: 'recipe_log'; name: string; weight: number }
    | { type: 'error'; message: string };

async function callGemini(apiKey: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('Gemini API error body:', err);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return raw.replace(/```json/g, '').replace(/```/g, '').trim();
}

export const parseIngredients = async (text: string): Promise<RecipeIngredient[] | null> => {
    const settings = await getSettings();
    if (!settings.apiKey) return null;

    const prompt = `You are a nutrition assistant. Extract all ingredients from the following text and return their nutritional information.

Respond ONLY with valid JSON in this exact format:
{"type":"ingredients","items":[
  {"name":"ingredient name","weight":number_grams,"calories":number,"protein":number,"fat":number,"carbs":number,"fiber":number}
]}

All nutritional values must be integers based on the specified weight.
If no weight is given for an ingredient, estimate a reasonable serving size in grams.
Use standard nutritional databases for accuracy.

Text: ${text}`;

    try {
        const raw = await callGemini(settings.apiKey, prompt);
        const parsed = JSON.parse(raw);
        if (parsed.type === 'ingredients' && Array.isArray(parsed.items)) {
            return parsed.items.map((item: any) => ({
                name: String(item.name || ''),
                weight: parseInt(item.weight) || 0,
                calories: parseInt(item.calories) || 0,
                protein: parseInt(item.protein) || 0,
                fat: parseInt(item.fat) || 0,
                carbs: parseInt(item.carbs) || 0,
                fiber: parseInt(item.fiber) || 0,
            }));
        }
        return null;
    } catch {
        return null;
    }
};

export const processInput = async (input: string): Promise<AIResponse> => {
    const settings = await getSettings();
    const apiKey = settings.apiKey;

    if (!apiKey) {
        return { type: 'error', message: 'No API key set. Please add your Gemini API key in Settings.' };
    }

    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const [todayMeals, allRecipes] = await Promise.all([
            getMealsByDate(today),
            getAllRecipes(),
        ]);

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

        const recipeContext = allRecipes.length > 0
            ? allRecipes.map(r => `${r.name} (${r.totalWeight}g total)`).join(', ')
            : 'None';

        const systemPrompt = `You are a nutrition assistant in a personal meal tracker app. The user tracks Indian and general food.

Your job — determine the user's intent and respond with the correct JSON format:

1. LOGGING A MEAL: If the user describes eating something, extract nutritional info.
   Respond: {"type":"meal","food":"descriptive name","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number}

2. SAVING A FAVOURITE: If the user says something like "save as favourite X" or "mark this as favourite X".
   Respond: {"type":"favourite_save","name":"the name they gave"}

3. LOGGING A FAVOURITE: If the user says "log favourite X" or "have favourite X" or just the favourite name.
   Respond: {"type":"favourite_log","name":"the name they mentioned"}

4. LOGGING WEIGHT: If the user mentions their weight like "my weight is 74kg" or "I weigh 74".
   Respond: {"type":"weight","weight":number_in_kg}

5. LOGGING HEIGHT: If the user mentions their height like "my height is 5'10" or "I am 175cm tall". Always convert to cm.
   Respond: {"type":"height","height":number_in_cm}

6. LOGGING AGE: If the user mentions their age like "I am 30 years old" or "my age is 30".
   Respond: {"type":"age","age":number}

7. CONVERSATIONAL: For questions about nutrition, health, or their data.
   Respond: {"type":"chat","message":"your response"}

8. LOGGING A RECIPE: If user says they ate a specific weight of a saved recipe name listed below, respond: {"type":"recipe_log","name":"exact recipe name","weight":number_in_grams}

User's portion sizes: bowl (liquid) ${settings.unitBowlLiquid}ml, bowl (solid) ${settings.unitBowlSolid}g, tbsp ${settings.unitTbsp}g, tsp ${settings.unitTsp}g

Saved recipes: ${recipeContext}

Today's meals:
${mealContext}

Today's totals: ${totals.calories} kcal, ${totals.protein}g protein, ${totals.carbs}g carbs, ${totals.fiber}g fiber
Goals: ${settings.dailyCalories} kcal, ${settings.dailyProtein}g protein, ${settings.dailyCarbs}g carbs, ${settings.dailyFiber}g fiber

Respond ONLY with valid JSON. No markdown, no explanation outside JSON. All nutritional values as integers.

User says: ${input}`;

        const raw = await callGemini(apiKey, systemPrompt);
        const parsed = JSON.parse(raw);

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

        if (parsed.type === 'favourite_save') return { type: 'favourite_save', name: parsed.name };
        if (parsed.type === 'favourite_log') return { type: 'favourite_log', name: parsed.name };
        if (parsed.type === 'weight') return { type: 'weight', weight: parseFloat(parsed.weight) || 0 };
        if (parsed.type === 'height') return { type: 'height', height: parseInt(parsed.height) || 0 };
        if (parsed.type === 'age') return { type: 'age', age: parseInt(parsed.age) || 0 };
        if (parsed.type === 'recipe_log') return { type: 'recipe_log', name: parsed.name, weight: parseInt(parsed.weight) || 0 };
        if (parsed.type === 'chat') return { type: 'chat', message: parsed.message };

        throw new Error('Unexpected response format');
    } catch (error) {
        console.error('processInput error:', error);
        return { type: 'error', message: 'Something went wrong. Please try again.' };
    }
};

export const getMealSuggestion = async (): Promise<string | null> => {
    const settings = await getSettings();
    if (!settings.apiKey) return null;

    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayMeals = await getMealsByDate(today);
        if (todayMeals.length === 0) return null;

        const totals = todayMeals.reduce((acc, m) => ({
            calories: acc.calories + (m.totalCalories || 0),
            protein: acc.protein + (m.parsed[0]?.protein || 0),
            carbs: acc.carbs + (m.parsed[0]?.carbs || 0),
            fiber: acc.fiber + (m.parsed[0]?.fiber || 0),
        }), { calories: 0, protein: 0, carbs: 0, fiber: 0 });

        const remaining = {
            calories: Math.max(0, settings.dailyCalories - totals.calories),
            protein: Math.max(0, settings.dailyProtein - totals.protein),
            carbs: Math.max(0, settings.dailyCarbs - totals.carbs),
            fiber: Math.max(0, settings.dailyFiber - totals.fiber),
        };

        const prompt = `You are a nutrition advisor. The user has eaten today and has these remaining macro goals:
- ${remaining.calories} kcal, ${remaining.protein}g protein, ${remaining.carbs}g carbs, ${remaining.fiber}g fiber remaining.

Suggest ONE simple Indian or general meal that helps fill the biggest gap. Keep it to 1-2 sentences. Be specific with the food item. Do not wrap in JSON — just plain text.`;

        return await callGemini(settings.apiKey, prompt);
    } catch (error) {
        console.error('getMealSuggestion error:', error);
        return null;
    }
};

export const getSmartObservations = async (): Promise<string | null> => {
    const settings = await getSettings();
    if (!settings.apiKey) return null;

    try {
        const allMeals = await getAllMeals();
        const today = new Date();
        const last7Dates = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'));

        const recentMeals = allMeals.filter(m => last7Dates.includes(m.date));
        if (recentMeals.length < 3) return null;

        const daySummaries = last7Dates.map(date => {
            const dayMeals = recentMeals.filter(m => m.date === date);
            if (dayMeals.length === 0) return `${date}: No meals logged`;
            const cals = dayMeals.reduce((s, m) => s + (m.totalCalories || 0), 0);
            const pro = dayMeals.reduce((s, m) => s + (m.parsed?.[0]?.protein || 0), 0);
            const carbs = dayMeals.reduce((s, m) => s + (m.parsed?.[0]?.carbs || 0), 0);
            const fiber = dayMeals.reduce((s, m) => s + (m.parsed?.[0]?.fiber || 0), 0);
            return `${date}: ${cals} kcal, ${pro}g pro, ${carbs}g carbs, ${fiber}g fiber (${dayMeals.length} meals)`;
        }).join('\n');

        const prompt = `You are a nutrition analyst. Analyze this user's last 7 days of eating:

${daySummaries}

Goals: ${settings.dailyCalories} kcal, ${settings.dailyProtein}g protein, ${settings.dailyCarbs}g carbs, ${settings.dailyFiber}g fiber daily.

Give 1-2 brief, actionable observations about patterns you notice (e.g., "Your protein dips on weekends", "Fiber has been consistently low"). Be encouraging but honest. Keep it to 2-3 sentences total. Plain text only, no JSON.`;

        return await callGemini(settings.apiKey, prompt);
    } catch (error) {
        console.error('getSmartObservations error:', error);
        return null;
    }
};
