import { collection, getDocs, query, limit } from 'firebase/firestore';
import { firestore } from './firebase';
import * as idb from './db.idb';
import * as fs from './db.firestore';

/**
 * One-time migration: copies all IndexedDB data into Firestore when a user
 * first signs in. Skipped automatically if Firestore already has meals
 * (prevents duplicate data when signing in from a second device).
 */
export const mergeLocalDataToFirestore = async (uid: string): Promise<void> => {
    // If Firestore already has meals, this user has synced before — skip.
    const existing = await getDocs(query(collection(firestore, 'users', uid, 'meals'), limit(1)));
    if (!existing.empty) return;

    try {
        const [meals, favourites, weights, recipes, settings] = await Promise.all([
            idb.getAllMeals(),
            idb.getAllFavourites(),
            idb.getAllWeights(),
            idb.getAllRecipes(),
            idb.getSettings(),
        ]);

        const uploads: Promise<any>[] = [];

        meals.forEach(({ id: _id, ...rest }) => uploads.push(fs.addMeal(uid, rest)));
        favourites.forEach(({ id: _id, ...rest }) => uploads.push(fs.addFavourite(uid, rest)));
        weights.forEach(({ id: _id, ...rest }) => uploads.push(fs.addWeight(uid, rest)));
        recipes.forEach(({ id: _id, ...rest }) => uploads.push(fs.addRecipe(uid, rest)));

        // Upload each setting key individually so saveSetting's merge: true works correctly
        (Object.keys(settings) as (keyof typeof settings)[]).forEach(key => {
            uploads.push(fs.saveSetting(uid, key, settings[key]));
        });

        await Promise.all(uploads);
    } catch (err) {
        console.error('Local → Firestore merge failed:', err);
    }
};
