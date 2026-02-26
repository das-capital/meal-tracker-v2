import { type Meal, type UserSettings } from './db';
import { format, subDays } from 'date-fns';

export interface Badge {
    id: string;
    name: string;
    image: string;
    description: string;
    earned: boolean;
    progress: string;
}

const BADGE_DEFS = [
    { id: 'cal_count_crusader', name: 'Cal-count Crusader', image: '/badges/cal-count_crusader.png', description: 'Hit your calorie goal 5 out of the last 7 days' },
    { id: 'protein_putra', name: 'Protein Putra', image: '/badges/protein_putra.png', description: 'Hit your protein goal 5 out of the last 7 days' },
    { id: 'fiber_finicky', name: 'Fiber Finicky', image: '/badges/fiber_finicky.png', description: 'Hit your fiber goal 5 out of the last 7 days' },
    { id: 'macro_manager', name: 'Macro Manager', image: '/badges/macro_manager.png', description: 'All macros on target 5 out of the last 7 days' },
    { id: 'streak_3', name: '3-Day Streaker', image: '/badges/streak_3.png', description: 'All macros on target for 3 consecutive days' },
    { id: 'streak_6', name: '6-Day Streaker', image: '/badges/streak_6.png', description: 'All macros on target for 6 consecutive days' },
];

interface DayTotals {
    calories: number;
    protein: number;
    carbs: number;
    fiber: number;
    hasMeals: boolean;
}

function getDayTotals(meals: Meal[], date: string): DayTotals {
    const dayMeals = meals.filter(m => m.date === date);
    if (dayMeals.length === 0) return { calories: 0, protein: 0, carbs: 0, fiber: 0, hasMeals: false };

    return dayMeals.reduce((acc, m) => ({
        calories: acc.calories + (m.totalCalories || 0),
        protein: acc.protein + (m.parsed?.[0]?.protein || 0),
        carbs: acc.carbs + (m.parsed?.[0]?.carbs || 0),
        fiber: acc.fiber + (m.parsed?.[0]?.fiber || 0),
        hasMeals: true,
    }), { calories: 0, protein: 0, carbs: 0, fiber: 0, hasMeals: true });
}

function caloriesOnTarget(totals: DayTotals, settings: UserSettings): boolean {
    const low = settings.dailyCalories * 0.85;
    const high = settings.dailyCalories * 1.1;
    return totals.hasMeals && totals.calories >= low && totals.calories <= high;
}

function proteinOnTarget(totals: DayTotals, settings: UserSettings): boolean {
    return totals.hasMeals && totals.protein >= settings.dailyProtein * 0.9;
}

function carbsOnTarget(totals: DayTotals, settings: UserSettings): boolean {
    const low = settings.dailyCarbs * 0.85;
    const high = settings.dailyCarbs * 1.15;
    return totals.hasMeals && totals.carbs >= low && totals.carbs <= high;
}

function fiberOnTarget(totals: DayTotals, settings: UserSettings): boolean {
    return totals.hasMeals && totals.fiber >= settings.dailyFiber * 0.9;
}

function allOnTarget(totals: DayTotals, settings: UserSettings): boolean {
    return caloriesOnTarget(totals, settings) && proteinOnTarget(totals, settings) &&
        carbsOnTarget(totals, settings) && fiberOnTarget(totals, settings);
}

export function evaluateBadges(allMeals: Meal[], settings: UserSettings): Badge[] {
    const today = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, i), 'yyyy-MM-dd'));
    const dayData = last7.map(date => ({ date, totals: getDayTotals(allMeals, date) }));
    const daysWithMeals = dayData.filter(d => d.totals.hasMeals);

    // Count days each goal was hit
    const calDays = daysWithMeals.filter(d => caloriesOnTarget(d.totals, settings)).length;
    const proDays = daysWithMeals.filter(d => proteinOnTarget(d.totals, settings)).length;
    const fibDays = daysWithMeals.filter(d => fiberOnTarget(d.totals, settings)).length;
    const allDays = daysWithMeals.filter(d => allOnTarget(d.totals, settings)).length;

    // Consecutive streak (most recent first)
    let streak = 0;
    for (const d of dayData) {
        if (d.totals.hasMeals && allOnTarget(d.totals, settings)) {
            streak++;
        } else if (d.totals.hasMeals) {
            break;
        }
    }

    return BADGE_DEFS.map(def => {
        let earned = false;
        let progress = '';

        switch (def.id) {
            case 'cal_count_crusader':
                earned = calDays >= 5;
                progress = `${calDays}/5 days`;
                break;
            case 'protein_putra':
                earned = proDays >= 5;
                progress = `${proDays}/5 days`;
                break;
            case 'fiber_finicky':
                earned = fibDays >= 5;
                progress = `${fibDays}/5 days`;
                break;
            case 'macro_manager':
                earned = allDays >= 5;
                progress = `${allDays}/5 days`;
                break;
            case 'streak_3':
                earned = streak >= 3;
                progress = `${Math.min(streak, 3)}/3 days`;
                break;
            case 'streak_6':
                earned = streak >= 6;
                progress = `${Math.min(streak, 6)}/6 days`;
                break;
        }

        return { ...def, earned, progress };
    });
}
