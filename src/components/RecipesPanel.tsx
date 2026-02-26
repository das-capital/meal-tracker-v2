import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChefHat, ArrowLeft, Send, Edit2 } from 'lucide-react';
import {
    getAllRecipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    type Recipe,
    type RecipeIngredient,
} from '../lib/db';
import { parseIngredients } from '../lib/ai-parser';

interface Props {
    open: boolean;
    onClose: () => void;
}

export const RecipesPanel = ({ open, onClose }: Props) => {
    const [mode, setMode] = useState<'list' | 'create'>('list');
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

    // Create/edit view state
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    const [recipeName, setRecipeName] = useState('');
    const [ingredientInput, setIngredientInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // List view: inline log state
    const [loggingId, setLoggingId] = useState<number | null>(null);
    const [logGrams, setLogGrams] = useState('');

    const inputRef = useRef<HTMLTextAreaElement>(null);

    const loadRecipes = async () => {
        const all = await getAllRecipes();
        setRecipes(all);
    };

    useEffect(() => {
        if (open) {
            loadRecipes();
            setMode('list');
            setEditingRecipe(null);
        }
    }, [open]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Delete this recipe?')) {
            await deleteRecipe(id);
            loadRecipes();
        }
    };

    const handleParseIngredients = async () => {
        const text = ingredientInput.trim();
        if (!text || isParsing) return;
        setIngredientInput('');
        setIsParsing(true);
        const items = await parseIngredients(text);
        if (items && items.length > 0) {
            setIngredients(prev => [...prev, ...items]);
        }
        setIsParsing(false);
        inputRef.current?.focus();
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const totals = ingredients.reduce(
        (acc, ing) => ({
            weight: acc.weight + ing.weight,
            calories: acc.calories + ing.calories,
            protein: acc.protein + ing.protein,
            fat: acc.fat + ing.fat,
            carbs: acc.carbs + ing.carbs,
            fiber: acc.fiber + ing.fiber,
        }),
        { weight: 0, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    );

    const handleSaveRecipe = async () => {
        if (!recipeName.trim() || ingredients.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            if (editingRecipe) {
                await updateRecipe({
                    ...editingRecipe,
                    name: recipeName.trim(),
                    ingredients,
                    totalWeight: totals.weight,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein,
                    totalFat: totals.fat,
                    totalCarbs: totals.carbs,
                    totalFiber: totals.fiber,
                });
            } else {
                await addRecipe({
                    name: recipeName.trim(),
                    ingredients,
                    totalWeight: totals.weight,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein,
                    totalFat: totals.fat,
                    totalCarbs: totals.carbs,
                    totalFiber: totals.fiber,
                    createdAt: Date.now(),
                });
            }
            setIngredients([]);
            setRecipeName('');
            setEditingRecipe(null);
            await loadRecipes();
            setMode('list');
        } catch {
            alert('A recipe with that name already exists.');
        }
        setIsSaving(false);
    };

    const handleEditRecipe = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setRecipeName(recipe.name);
        setIngredients(recipe.ingredients);
        setIngredientInput('');
        setMode('create');
    };

    const handleBackToList = () => {
        setMode('list');
        setIngredients([]);
        setRecipeName('');
        setIngredientInput('');
        setEditingRecipe(null);
    };

    const cal100g = (recipe: Recipe) =>
        recipe.totalWeight > 0 ? Math.round((recipe.totalCalories / recipe.totalWeight) * 100) : 0;

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60]"
                        onClick={mode === 'list' ? onClose : undefined}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-3xl z-[70] max-h-[85vh] flex flex-col pb-20"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                            {mode === 'list' ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <ChefHat className="w-4 h-4 text-emerald-400" />
                                        <h2 className="text-lg font-semibold text-zinc-100">Recipes</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setMode('create')}
                                            className="text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded-lg px-3 py-1.5 hover:bg-emerald-500/10 transition-colors"
                                        >
                                            + New
                                        </button>
                                        <button onClick={onClose} className="p-1 text-zinc-500 active:text-zinc-300">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleBackToList} className="p-1 text-zinc-400 active:text-zinc-200">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <h2 className="text-lg font-semibold text-zinc-100">{editingRecipe ? 'Edit Recipe' : 'New Recipe'}</h2>
                                    </div>
                                    <button onClick={onClose} className="p-1 text-zinc-500 active:text-zinc-300">
                                        <X className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Body */}
                        {mode === 'list' ? (
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                                {recipes.length === 0 ? (
                                    <p className="text-center text-zinc-600 text-sm py-8">
                                        No recipes yet. Tap New to create one.
                                    </p>
                                ) : (
                                    recipes.map(recipe => (
                                        <div key={recipe.id} className="bg-zinc-800 border border-white/5 rounded-xl px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <button
                                                    onClick={() => setLoggingId(loggingId === recipe.id ? null : recipe.id!)}
                                                    className="flex-1 min-w-0 text-left"
                                                >
                                                    <p className="text-zinc-200 text-sm font-medium truncate">{recipe.name}</p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">
                                                        {recipe.totalWeight}g total · {cal100g(recipe)} kcal/100g · {recipe.totalProtein}g P · {recipe.totalCarbs}g C · {recipe.totalFiber}g F
                                                    </p>
                                                </button>
                                                <button
                                                    onClick={() => handleEditRecipe(recipe)}
                                                    className="p-1.5 text-zinc-600 active:text-zinc-300 shrink-0"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => recipe.id && handleDelete(recipe.id)}
                                                    className="p-1.5 text-zinc-600 active:text-red-400 shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <AnimatePresence>
                                                {loggingId === recipe.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                                            <input
                                                                type="number"
                                                                value={logGrams}
                                                                onChange={e => setLogGrams(e.target.value)}
                                                                placeholder="grams"
                                                                className="flex-1 bg-zinc-700 text-zinc-200 placeholder:text-zinc-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const g = parseFloat(logGrams);
                                                                    if (g > 0) {
                                                                        // Dispatch a custom event with the recipe log data
                                                                        window.dispatchEvent(new CustomEvent('recipe-log', {
                                                                            detail: { recipe, weight: g },
                                                                        }));
                                                                        setLoggingId(null);
                                                                        setLogGrams('');
                                                                        onClose();
                                                                    }
                                                                }}
                                                                disabled={!logGrams || parseFloat(logGrams) <= 0}
                                                                className="bg-emerald-500 text-zinc-900 rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-30 active:scale-95 transition-transform"
                                                            >
                                                                Log
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Ingredient table */}
                                <div className="flex-1 overflow-y-auto px-4 py-3">
                                    {ingredients.length === 0 && !isParsing ? (
                                        <p className="text-center text-zinc-600 text-sm py-6">
                                            Type ingredients below to get started.
                                        </p>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-zinc-500 border-b border-white/5">
                                                    <th className="text-left pb-2 font-medium">Ingredient</th>
                                                    <th className="text-right pb-2 font-medium">g</th>
                                                    <th className="text-right pb-2 font-medium">Cal</th>
                                                    <th className="text-right pb-2 font-medium">P</th>
                                                    <th className="text-right pb-2 font-medium">C</th>
                                                    <th className="text-right pb-2 font-medium">F</th>
                                                    <th className="pb-2 w-6" />
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {ingredients.map((ing, i) => (
                                                    <tr key={i} className="text-zinc-300">
                                                        <td className="py-2 pr-2 truncate max-w-[100px]">{ing.name}</td>
                                                        <td className="py-2 text-right text-zinc-400">{ing.weight}</td>
                                                        <td className="py-2 text-right">{ing.calories}</td>
                                                        <td className="py-2 text-right text-blue-400">{ing.protein}</td>
                                                        <td className="py-2 text-right text-amber-400">{ing.carbs}</td>
                                                        <td className="py-2 text-right text-green-400">{ing.fiber}</td>
                                                        <td className="py-2 pl-1">
                                                            <button
                                                                onClick={() => handleRemoveIngredient(i)}
                                                                className="text-zinc-600 active:text-red-400"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {isParsing && (
                                                    <tr>
                                                        <td colSpan={7} className="py-3 text-center">
                                                            <div className="flex gap-1.5 items-center justify-center">
                                                                {[0, 1, 2].map(i => (
                                                                    <div key={i} className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {ingredients.length > 0 && (
                                                    <tr className="text-zinc-200 font-semibold border-t border-white/10">
                                                        <td className="pt-2 text-zinc-400">Total</td>
                                                        <td className="pt-2 text-right text-zinc-400">{totals.weight}</td>
                                                        <td className="pt-2 text-right">{totals.calories}</td>
                                                        <td className="pt-2 text-right text-blue-400">{totals.protein}</td>
                                                        <td className="pt-2 text-right text-amber-400">{totals.carbs}</td>
                                                        <td className="pt-2 text-right text-green-400">{totals.fiber}</td>
                                                        <td />
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Recipe name + save */}
                                <div className="px-4 pb-2 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={recipeName}
                                            onChange={e => setRecipeName(e.target.value)}
                                            placeholder="Recipe name…"
                                            className="flex-1 bg-zinc-800 border border-white/10 text-zinc-200 placeholder:text-zinc-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                        />
                                        <button
                                            onClick={handleSaveRecipe}
                                            disabled={!recipeName.trim() || ingredients.length === 0 || isSaving}
                                            className="bg-emerald-500 text-zinc-900 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-30 active:scale-95 transition-transform"
                                        >
                                            {editingRecipe ? 'Update' : 'Save'}
                                        </button>
                                    </div>
                                </div>

                                {/* Ingredient input bar */}
                                <div className="px-4 pb-2 shrink-0">
                                    <div className="flex items-end gap-2 bg-zinc-800 border border-white/10 rounded-2xl px-3 py-2">
                                        <textarea
                                            ref={inputRef}
                                            value={ingredientInput}
                                            onChange={e => setIngredientInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleParseIngredients();
                                                }
                                            }}
                                            placeholder="e.g. 200g chicken breast, 150g chickpeas…"
                                            disabled={isParsing}
                                            rows={1}
                                            className="flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none text-sm py-1 max-h-24 disabled:opacity-50"
                                            style={{ scrollbarWidth: 'none' }}
                                        />
                                        <button
                                            onClick={handleParseIngredients}
                                            disabled={!ingredientInput.trim() || isParsing}
                                            className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 shrink-0"
                                        >
                                            <Send className="w-4 h-4 text-zinc-900" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
