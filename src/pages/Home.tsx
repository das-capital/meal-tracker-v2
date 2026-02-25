import { motion } from 'framer-motion';
import { useMeals } from '../hooks/useMeals';
import { useSettings } from '../hooks/useSettings';
import { EmeraldGlowProgressRing } from '../components/EmeraldGlowProgressRing';
import { deleteMeal, updateMeal, type Meal } from '../lib/db';
import { Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useState } from 'react';

interface MacroBarProps {
    label: string;
    value: number;
    goal: number;
    color: string;
}

const MacroBar = ({ label, value, goal, color }: MacroBarProps) => {
    const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-zinc-400">
                <span className="font-medium">{label}</span>
                <span>{value}g <span className="text-zinc-600">/ {goal}g</span></span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={clsx('h-full rounded-full transition-all duration-500', color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export const Home = () => {
    const { meals, stats, refreshMeals } = useMeals();
    const { settings } = useSettings();
    const [showAbsolute, setShowAbsolute] = useState(false);

    const GOAL_CALS = settings?.dailyCalories || 2000;
    const progressPercent = Math.min((stats.calories / GOAL_CALS) * 100, 100);
    const isOverLimit = stats.calories > GOAL_CALS;
    const isWarning = !isOverLimit && progressPercent > 75;
    const ringColor = isOverLimit ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

    const handleDelete = async (id: number) => {
        if (window.confirm('Delete this meal?')) {
            await deleteMeal(id);
            refreshMeals();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto px-4 pb-20 overflow-y-auto"
        >
            {/* Calorie Ring */}
            <div className="flex flex-col items-center py-4">
                <EmeraldGlowProgressRing
                    progress={progressPercent}
                    size={180}
                    color={ringColor}
                    centerContent={
                        <button
                            onClick={() => setShowAbsolute(v => !v)}
                            className="flex flex-col items-center"
                        >
                            <span className="text-3xl font-bold text-zinc-100">
                                {showAbsolute ? stats.calories : `${Math.round(progressPercent)}%`}
                            </span>
                            <span className="text-xs text-zinc-500">
                                {showAbsolute ? `/ ${GOAL_CALS} kcal` : 'of goal'}
                            </span>
                        </button>
                    }
                />
            </div>

            {/* Macro Progress Bars */}
            <div className="bg-zinc-800/60 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 mb-4">
                <MacroBar label="Protein" value={stats.protein} goal={settings?.dailyProtein || 120} color="bg-blue-400" />
                <MacroBar label="Carbs" value={stats.carbs} goal={settings?.dailyCarbs || 250} color="bg-amber-400" />
                <MacroBar label="Fiber" value={stats.fiber} goal={settings?.dailyFiber || 30} color="bg-emerald-400" />
            </div>

            {/* Today's Meal List */}
            <div className="flex flex-col gap-2">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">
                    Today's meals
                </h2>

                {meals.length === 0 ? (
                    <div className="text-center text-zinc-600 text-sm py-8">Nothing logged yet today.</div>
                ) : (
                    [...meals].reverse().map((meal: Meal) => (
                        <div
                            key={meal.id}
                            className="bg-zinc-800/60 border border-white/5 rounded-xl px-4 py-3 flex justify-between items-center gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-zinc-200 text-sm font-medium truncate">
                                    {meal.parsed?.[0]?.food || meal.content}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {format(meal.timestamp, 'h:mm a')}
                                    {meal.parsed?.[0] && (
                                        <span className="ml-2 text-zinc-600">
                                            {meal.parsed[0].protein}g P · {meal.parsed[0].carbs}g C · {meal.parsed[0].fiber}g F
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold text-sm">{meal.totalCalories}</span>
                                <span className="text-zinc-600 text-xs">kcal</span>
                                <button
                                    onClick={() => meal.id && handleDelete(meal.id)}
                                    className="ml-1 p-1.5 text-zinc-600 active:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};
