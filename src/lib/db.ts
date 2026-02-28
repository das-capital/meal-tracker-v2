/**
 * db.ts — routing layer
 *
 * All existing consumers keep their `import from '../lib/db'` unchanged.
 * This module routes each call to IndexedDB (guest) or Firestore (signed in)
 * based on the current auth state, which is set by AuthContext via setCurrentUser().
 */

export type { Meal, Favourite, WeightEntry, Recipe, RecipeIngredient, UserSettings } from './db.idb';
export { DEFAULT_SETTINGS } from './db.idb';

import * as idb from './db.idb';
import * as fs from './db.firestore';
import type { Meal, Favourite, WeightEntry, Recipe, UserSettings } from './db.idb';

let _uid: string | null = null;

/** Called by AuthContext whenever auth state changes. */
export const setCurrentUser = (uid: string | null) => {
    _uid = uid;
};

// --- Meals ---
export const addMeal = (meal: Omit<Meal, 'id'>) =>
    _uid ? fs.addMeal(_uid, meal) : idb.addMeal(meal);

export const getMealsByDate = (date: string) =>
    _uid ? fs.getMealsByDate(_uid, date) : idb.getMealsByDate(date);

export const getAllMeals = () =>
    _uid ? fs.getAllMeals(_uid) : idb.getAllMeals();

export const updateMeal = (meal: Meal) =>
    _uid ? fs.updateMeal(_uid, meal) : idb.updateMeal(meal);

export const deleteMeal = (id: number) =>
    _uid ? fs.deleteMeal(_uid, id) : idb.deleteMeal(id);

// --- Favourites ---
export const addFavourite = (fav: Omit<Favourite, 'id'>) =>
    _uid ? fs.addFavourite(_uid, fav) : idb.addFavourite(fav);

export const getAllFavourites = () =>
    _uid ? fs.getAllFavourites(_uid) : idb.getAllFavourites();

export const updateFavourite = (fav: Favourite) =>
    _uid ? fs.updateFavourite(_uid, fav) : idb.updateFavourite(fav);

export const deleteFavourite = (id: number) =>
    _uid ? fs.deleteFavourite(_uid, id) : idb.deleteFavourite(id);

// --- Weights ---
export const addWeight = (entry: Omit<WeightEntry, 'id'>) =>
    _uid ? fs.addWeight(_uid, entry) : idb.addWeight(entry);

export const getAllWeights = () =>
    _uid ? fs.getAllWeights(_uid) : idb.getAllWeights();

export const deleteWeight = (id: number) =>
    _uid ? fs.deleteWeight(_uid, id) : idb.deleteWeight(id);

// --- Recipes ---
export const addRecipe = (recipe: Omit<Recipe, 'id'>) =>
    _uid ? fs.addRecipe(_uid, recipe) : idb.addRecipe(recipe);

export const getAllRecipes = () =>
    _uid ? fs.getAllRecipes(_uid) : idb.getAllRecipes();

export const updateRecipe = (recipe: Recipe) =>
    _uid ? fs.updateRecipe(_uid, recipe) : idb.updateRecipe(recipe);

export const deleteRecipe = (id: number) =>
    _uid ? fs.deleteRecipe(_uid, id) : idb.deleteRecipe(id);

// --- Settings ---
export const getSettings = () =>
    _uid ? fs.getSettings(_uid) : idb.getSettings();

export const saveSetting = (key: keyof UserSettings, value: any) =>
    _uid ? fs.saveSetting(_uid, key, value) : idb.saveSetting(key, value);

// Reset clears both backends when signed in to leave a clean state
export const resetAllData = async () => {
    if (_uid) {
        await Promise.all([fs.resetAllData(_uid), idb.resetAllData()]);
    } else {
        await idb.resetAllData();
    }
};
