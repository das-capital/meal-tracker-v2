import { useState, useEffect, useCallback } from 'react';
import { getMealsByDate, addMeal as addMealToDB } from '../lib/db';
import { format } from 'date-fns';

export interface DailyStats {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
}

export const useMeals = () => {
    const [todayMeals, setTodayMeals] = useState<any[]>([]);
    const [stats, setStats] = useState<DailyStats>({ calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
    const [loading, setLoading] = useState(true);

    const refreshMeals = useCallback(async () => {
        setLoading(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        try {
            const meals = await getMealsByDate(today);
            setTodayMeals(meals);

            const newStats = meals.reduce((acc, meal) => ({
                calories: acc.calories + (meal.totalCalories || 0),
                protein: acc.protein + (meal.parsed?.[0]?.protein || 0),
                fat: acc.fat + (meal.parsed?.[0]?.fat || 0),
                carbs: acc.carbs + (meal.parsed?.[0]?.carbs || 0),
                fiber: acc.fiber + (meal.parsed?.[0]?.fiber || 0),
            }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

            setStats(newStats);
        } catch (error) {
            console.error('Failed to fetch meals', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshMeals();
    }, [refreshMeals]);

    const addMeal = async (text: string, parsedData: any) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const meal = {
            date: today,
            timestamp: Date.now(),
            content: text,
            parsed: [parsedData],
            totalCalories: parsedData.calories,
        };
        await addMealToDB(meal);
        await refreshMeals();
    };

    return { meals: todayMeals, stats, loading, addMeal, refreshMeals };
};
