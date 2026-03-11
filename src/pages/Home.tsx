import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMeals } from '../hooks/useMeals';
import { useSettings } from '../hooks/useSettings';
import { EmeraldGlowProgressRing } from '../components/EmeraldGlowProgressRing';
import { deleteMeal, type Meal } from '../lib/db';
import { Trash2, Edit2 } from 'lucide-react';
import { EditMealModal } from '../components/EditMealModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { format } from 'date-fns';
import clsx from 'clsx';

interface MacroBarProps { label: string; value: number; goal: number; color: string; unit?: string }

const MacroBar = ({ label, value, goal, color, unit = 'g' }: MacroBarProps) => {
    const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-th-secondary">
                <span className="font-medium">{label}</span>
                <span>{value}{unit} <span className="text-th-faint">/ {goal}{unit}</span></span>
            </div>
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

export const Home = () => {
    const { meals, stats, refreshMeals } = useMeals();
    const { settings } = useSettings();
    const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const GOAL_CALS = settings?.dailyCalories || 2000;
    const progressPercent = Math.min((stats.calories / GOAL_CALS) * 100, 100);
    const isOverLimit = stats.calories > GOAL_CALS;
    const isWarning = !isOverLimit && progressPercent > 75;
    const ringColor = isOverLimit ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

    const handleDelete = async () => {
        if (deletingId == null) return;
        await deleteMeal(deletingId);
        setDeletingId(null);
        refreshMeals();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-[calc(100vh-9rem)] max-w-md mx-auto px-4 pb-20 overflow-y-auto"
        >
            {/* Calorie Ring */}
            <div className="flex flex-col items-center py-3">
                <EmeraldGlowProgressRing
                    progress={progressPercent}
                    size={170}
                    color={ringColor}
                    centerContent={
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-bold text-th-primary">{`${Math.round(progressPercent)}%`}</span>
                            <span className="text-xs text-th-muted">of goal</span>
                        </div>
                    }
                />
            </div>

            {/* Macro Bars */}
            <div className="bg-surface/60 border border-th-border rounded-2xl p-4 flex flex-col gap-3 mb-4">
                <MacroBar label="Calories" value={stats.calories} goal={GOAL_CALS} color="bg-emerald-500" unit=" kcal" />
                <MacroBar label="Protein" value={stats.protein} goal={settings?.dailyProtein || 120} color="bg-blue-400" />
                <MacroBar label="Fat" value={stats.fat} goal={settings?.dailyFat || 65} color="bg-orange-400" />
                <MacroBar label="Carbs" value={stats.carbs} goal={settings?.dailyCarbs || 250} color="bg-amber-400" />
                <MacroBar label="Fiber" value={stats.fiber} goal={settings?.dailyFiber || 30} color="bg-emerald-400" />
            </div>

            {/* Today's Meals */}
            <div className="flex flex-col gap-2">
                <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest px-1">Today's meals</h2>
                {meals.length === 0 ? (
                    <div className="text-center text-th-faint text-sm py-6">Nothing logged yet today.</div>
                ) : (
                    [...meals].reverse().map((meal: Meal) => (
                        <div key={meal.id} className="bg-surface/60 border border-th-border rounded-xl px-4 py-3 flex justify-between items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-th-primary text-sm font-medium truncate">{meal.parsed?.[0]?.food || meal.content}</p>
                                <p className="text-xs text-th-muted">
                                    {format(meal.timestamp, 'h:mm a')}
                                    {meal.parsed?.[0] && (
                                        <span className="ml-2 text-th-faint">
                                            {meal.parsed[0].protein}g P · {meal.parsed[0].carbs}g C · {meal.parsed[0].fiber}g F
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-emerald-400 font-bold text-sm">{meal.totalCalories}</span>
                                <span className="text-th-faint text-xs">kcal</span>
                                <button onClick={() => setEditingMeal(meal)} className="ml-1 p-1.5 text-th-faint active:text-blue-400">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => meal.id && setDeletingId(meal.id)} className="p-1.5 text-th-faint active:text-red-400">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <EditMealModal
                meal={editingMeal}
                onClose={() => setEditingMeal(null)}
                onSaved={refreshMeals}
            />

            {deletingId != null && (
                <ConfirmModal
                    message="Delete this meal?"
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingId(null)}
                />
            )}
        </motion.div>
    );
};
