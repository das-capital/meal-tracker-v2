import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Plus } from 'lucide-react';
import { updateMeal, type Meal } from '../lib/db';
import { processInput } from '../lib/ai-parser';

interface Props {
    meal: Meal | null;
    onClose: () => void;
    onSaved: () => void;
}

export const EditMealModal = ({ meal, onClose, onSaved }: Props) => {
    const [description, setDescription] = useState(meal?.content || '');
    const [extra, setExtra] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!meal || !meal.id) return;

        const fullText = extra.trim()
            ? `${description.trim()}, ${extra.trim()}`
            : description.trim();

        if (!fullText) return;

        setIsProcessing(true);
        setError('');

        const result = await processInput(fullText);

        if (result.type === 'meal') {
            const updated: Meal = {
                ...meal,
                content: fullText,
                totalCalories: result.data.calories,
                parsed: [result.data],
            };
            await updateMeal(updated);
            onSaved();
            onClose();
        } else {
            setError('Could not recalculate. Try rephrasing.');
        }

        setIsProcessing(false);
    };

    return (
        <AnimatePresence>
            {meal && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-3xl z-[70] max-h-[80vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <h2 className="text-lg font-semibold text-zinc-100">Edit Meal</h2>
                            <button onClick={onClose} className="p-1 text-zinc-500 active:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {/* Current meal description */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-zinc-400">What you had (edit to change)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    disabled={isProcessing}
                                    className="bg-zinc-900/50 rounded-xl border border-white/10 p-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm resize-none disabled:opacity-50"
                                />
                            </div>

                            {/* Add more items */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-zinc-400 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add more to this meal
                                </label>
                                <textarea
                                    value={extra}
                                    onChange={e => setExtra(e.target.value)}
                                    placeholder="e.g. one bowl of dal, a glass of lassi..."
                                    rows={2}
                                    disabled={isProcessing}
                                    className="bg-zinc-900/50 rounded-xl border border-white/10 p-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm resize-none disabled:opacity-50"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-white/5">
                            <button
                                onClick={handleSave}
                                disabled={isProcessing || !description.trim()}
                                className="w-full h-12 bg-emerald-500 rounded-xl flex items-center justify-center gap-2 font-bold text-zinc-900 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Recalculating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Recalculate & Save
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
