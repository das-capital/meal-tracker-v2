import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Meal {
    id?: number;
    date: string; // ISO date string YYYY-MM-DD
    timestamp: number;
    content: string; // Original text input
    parsed: {
        food: string;
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
        fiber: number;
    }[];
    totalCalories: number;
}

export interface UserSettings {
    apiKey: string;
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFiber: number;
    unitBowlLiquid: number; // ml
    unitBowlSolid: number; // g
    unitTbsp: number; // g (approx)
    unitTsp: number; // g (approx)
    profileAge: number;
    profileWeight: number; // kg
    profileHeight: number; // cm
}

const DEFAULT_SETTINGS: UserSettings = {
    apiKey: '',
    dailyCalories: 2000,
    dailyProtein: 120,
    dailyCarbs: 250,
    dailyFiber: 30,
    unitBowlLiquid: 250,
    unitBowlSolid: 150,
    unitTbsp: 15,
    unitTsp: 5,
    profileAge: 0,
    profileWeight: 0,
    profileHeight: 0,
};

interface MealTrackerDB extends DBSchema {
    meals: {
        key: number;
        value: Meal;
        indexes: { 'by-date': string };
    };
    settings: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'meal-tracker-db';
const DB_VERSION = 2; // Incrementing version for safety, though structure is flexible via key-value store

export const initDB = async (): Promise<IDBPDatabase<MealTrackerDB>> => {
    return openDB<MealTrackerDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('meals')) {
                const mealStore = db.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
                mealStore.createIndex('by-date', 'date');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        },
    });
};

export const addMeal = async (meal: Omit<Meal, 'id'>) => {
    const db = await initDB();
    return db.add('meals', meal);
};

export const getMealsByDate = async (date: string) => {
    const db = await initDB();
    return db.getAllFromIndex('meals', 'by-date', date);
};

export const getAllMeals = async () => {
    const db = await initDB();
    return db.getAll('meals');
}

export const updateMeal = async (meal: Meal) => {
    const db = await initDB();
    return db.put('meals', meal);
}

export const deleteMeal = async (id: number) => {
    const db = await initDB();
    return db.delete('meals', id);
}

export const getSettings = async (): Promise<UserSettings> => {
    const db = await initDB();
    const stored = await db.getAll('settings');
    const settings: any = { ...DEFAULT_SETTINGS };

    stored.forEach((item) => {
        settings[item.key] = item.value;
    });
    return settings as UserSettings;
}

export const saveSetting = async (key: keyof UserSettings, value: any) => {
    const db = await initDB();
    return db.put('settings', { key, value });
}

export const resetAllData = async () => {
    const db = await initDB();
    await db.clear('meals');
    await db.clear('settings');
}
