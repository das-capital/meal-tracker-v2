import { openDB, type IDBPDatabase } from 'idb';

export interface Meal {
    id?: number;
    date: string;
    timestamp: number;
    content: string;
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

export interface Favourite {
    id?: number;
    name: string;
    content: string;
    parsed: Meal['parsed'];
    totalCalories: number;
    createdAt: number;
}

export interface RecipeIngredient {
    name: string;
    weight: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
}

export interface Recipe {
    id?: number;
    name: string;
    ingredients: RecipeIngredient[];
    totalWeight: number;
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    totalFiber: number;
    createdAt: number;
}

export interface WeightEntry {
    id?: number;
    date: string;
    weight: number;
    timestamp: number;
}

export interface UserSettings {
    apiKey: string;
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFiber: number;
    unitBowlLiquid: number;
    unitBowlSolid: number;
    unitTbsp: number;
    unitTsp: number;
    profileAge: number;
    profileWeight: number;
    profileHeight: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
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

const DB_NAME = 'meal-tracker-db';
const DB_VERSION = 4;

export const initDB = async (): Promise<IDBPDatabase> => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('meals')) {
                const mealStore = db.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
                mealStore.createIndex('by-date', 'date');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('favourites')) {
                const favStore = db.createObjectStore('favourites', { keyPath: 'id', autoIncrement: true });
                favStore.createIndex('by-name', 'name', { unique: true });
            }
            if (!db.objectStoreNames.contains('weights')) {
                const weightStore = db.createObjectStore('weights', { keyPath: 'id', autoIncrement: true });
                weightStore.createIndex('by-date', 'date');
            }
            if (!db.objectStoreNames.contains('recipes')) {
                db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true })
                    .createIndex('by-name', 'name', { unique: true });
            }
        },
    });
};

// --- Meals ---
export const addMeal = async (meal: Omit<Meal, 'id'>) => {
    const db = await initDB();
    return db.add('meals', meal);
};

export const getMealsByDate = async (date: string): Promise<Meal[]> => {
    const db = await initDB();
    return db.getAllFromIndex('meals', 'by-date', date);
};

export const getAllMeals = async (): Promise<Meal[]> => {
    const db = await initDB();
    return db.getAll('meals');
};

export const updateMeal = async (meal: Meal) => {
    const db = await initDB();
    return db.put('meals', meal);
};

export const deleteMeal = async (id: number) => {
    const db = await initDB();
    return db.delete('meals', id);
};

// --- Favourites ---
export const addFavourite = async (fav: Omit<Favourite, 'id'>) => {
    const db = await initDB();
    return db.add('favourites', fav);
};

export const getAllFavourites = async (): Promise<Favourite[]> => {
    const db = await initDB();
    return db.getAll('favourites');
};

export const updateFavourite = async (fav: Favourite) => {
    const db = await initDB();
    return db.put('favourites', fav);
};

export const deleteFavourite = async (id: number) => {
    const db = await initDB();
    return db.delete('favourites', id);
};

// --- Weights ---
export const addWeight = async (entry: Omit<WeightEntry, 'id'>) => {
    const db = await initDB();
    return db.add('weights', entry);
};

export const getAllWeights = async (): Promise<WeightEntry[]> => {
    const db = await initDB();
    return db.getAll('weights');
};

export const deleteWeight = async (id: number) => {
    const db = await initDB();
    return db.delete('weights', id);
};

// --- Recipes ---
export const addRecipe = async (recipe: Omit<Recipe, 'id'>): Promise<void> => {
    const db = await initDB();
    await db.add('recipes', recipe);
};

export const getAllRecipes = async (): Promise<Recipe[]> => {
    const db = await initDB();
    return db.getAll('recipes');
};

export const updateRecipe = async (recipe: Recipe): Promise<void> => {
    const db = await initDB();
    await db.put('recipes', recipe);
};

export const deleteRecipe = async (id: number): Promise<void> => {
    const db = await initDB();
    await db.delete('recipes', id);
};

// --- Settings ---
export const getSettings = async (): Promise<UserSettings> => {
    const db = await initDB();
    const stored = await db.getAll('settings');
    const settings: any = { ...DEFAULT_SETTINGS };
    stored.forEach((item: any) => { settings[item.key] = item.value; });
    return settings as UserSettings;
};

export const saveSetting = async (key: keyof UserSettings, value: any) => {
    const db = await initDB();
    return db.put('settings', { key, value });
};

export const resetAllData = async () => {
    const db = await initDB();
    await db.clear('meals');
    await db.clear('settings');
    await db.clear('favourites');
    await db.clear('weights');
    await db.clear('recipes');
};
