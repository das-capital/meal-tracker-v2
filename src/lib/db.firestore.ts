import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Meal, Favourite, WeightEntry, Recipe, UserSettings } from './db.idb';
import { DEFAULT_SETTINGS } from './db.idb';

// Generate a unique numeric ID usable as both a JS number and Firestore doc path
const genId = (): number => Date.now() + Math.floor(Math.random() * 1000);

// --- Meals ---
export const addMeal = async (uid: string, meal: Omit<Meal, 'id'>): Promise<number> => {
    const id = genId();
    await setDoc(doc(firestore, 'users', uid, 'meals', String(id)), { ...meal, id });
    return id;
};

export const getMealsByDate = async (uid: string, date: string): Promise<Meal[]> => {
    const q = query(collection(firestore, 'users', uid, 'meals'), where('date', '==', date));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Meal);
};

export const getAllMeals = async (uid: string): Promise<Meal[]> => {
    const snap = await getDocs(collection(firestore, 'users', uid, 'meals'));
    return snap.docs.map(d => d.data() as Meal);
};

export const updateMeal = async (uid: string, meal: Meal): Promise<void> => {
    await setDoc(doc(firestore, 'users', uid, 'meals', String(meal.id)), meal);
};

export const deleteMeal = async (uid: string, id: number): Promise<void> => {
    await deleteDoc(doc(firestore, 'users', uid, 'meals', String(id)));
};

// --- Favourites ---
export const addFavourite = async (uid: string, fav: Omit<Favourite, 'id'>): Promise<number> => {
    const id = genId();
    await setDoc(doc(firestore, 'users', uid, 'favourites', String(id)), { ...fav, id });
    return id;
};

export const getAllFavourites = async (uid: string): Promise<Favourite[]> => {
    const snap = await getDocs(collection(firestore, 'users', uid, 'favourites'));
    return snap.docs.map(d => d.data() as Favourite);
};

export const updateFavourite = async (uid: string, fav: Favourite): Promise<void> => {
    await setDoc(doc(firestore, 'users', uid, 'favourites', String(fav.id)), fav);
};

export const deleteFavourite = async (uid: string, id: number): Promise<void> => {
    await deleteDoc(doc(firestore, 'users', uid, 'favourites', String(id)));
};

// --- Weights ---
export const addWeight = async (uid: string, entry: Omit<WeightEntry, 'id'>): Promise<number> => {
    const id = genId();
    await setDoc(doc(firestore, 'users', uid, 'weights', String(id)), { ...entry, id });
    return id;
};

export const getAllWeights = async (uid: string): Promise<WeightEntry[]> => {
    const snap = await getDocs(collection(firestore, 'users', uid, 'weights'));
    return snap.docs.map(d => d.data() as WeightEntry);
};

export const deleteWeight = async (uid: string, id: number): Promise<void> => {
    await deleteDoc(doc(firestore, 'users', uid, 'weights', String(id)));
};

// --- Recipes ---
export const addRecipe = async (uid: string, recipe: Omit<Recipe, 'id'>): Promise<void> => {
    const id = genId();
    await setDoc(doc(firestore, 'users', uid, 'recipes', String(id)), { ...recipe, id });
};

export const getAllRecipes = async (uid: string): Promise<Recipe[]> => {
    const snap = await getDocs(collection(firestore, 'users', uid, 'recipes'));
    return snap.docs.map(d => d.data() as Recipe);
};

export const updateRecipe = async (uid: string, recipe: Recipe): Promise<void> => {
    await setDoc(doc(firestore, 'users', uid, 'recipes', String(recipe.id)), recipe);
};

export const deleteRecipe = async (uid: string, id: number): Promise<void> => {
    await deleteDoc(doc(firestore, 'users', uid, 'recipes', String(id)));
};

// --- Settings ---
// Stored as a single merged document at /users/{uid}/settings/data
export const getSettings = async (uid: string): Promise<UserSettings> => {
    const snap = await getDoc(doc(firestore, 'users', uid, 'settings', 'data'));
    if (!snap.exists()) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...snap.data() } as UserSettings;
};

export const saveSetting = async (uid: string, key: keyof UserSettings, value: any): Promise<void> => {
    await setDoc(
        doc(firestore, 'users', uid, 'settings', 'data'),
        { [key]: value },
        { merge: true },
    );
};

// --- Reset ---
export const resetAllData = async (uid: string): Promise<void> => {
    const cols = ['meals', 'favourites', 'weights', 'recipes'];
    for (const col of cols) {
        const snap = await getDocs(collection(firestore, 'users', uid, col));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    }
    await deleteDoc(doc(firestore, 'users', uid, 'settings', 'data'));
};
