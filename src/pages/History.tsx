import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllMeals, deleteMeal, type Meal } from '../lib/db';
import { format, subDays, isAfter } from 'date-fns';

interface DayGroup {
    meals: Meal[];
    totalCals: number;
    totalProtein: number;
    totalCarbs: number;
    totalFiber: number;
}

export const History = () => {
    const [groupedMeals, setGroupedMeals] = useState<Record<string, DayGroup>>({});
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    const loadMeals = async () => {
        const allMeals = await getAllMeals();
        const thirtyDaysAgo = subDays(new Date(), 30);

        // Filter to last 30 days and sort descending
        const recent = allMeals
            .filter(m => isAfter(new Date(m.date), thirtyDaysAgo))
            .sort((a, b) => b.timestamp - a.timestamp);

        const groups: Record<string, DayGroup> = {};
        recent.forEach(meal => {
            if (!groups[meal.date]) {
                groups[meal.date] = { meals: [], totalCals: 0, totalProtein: 0, totalCarbs: 0, totalFiber: 0 };
            }
            groups[meal.date].meals.push(meal);
            groups[meal.date].totalCals += meal.totalCalories || 0;
            groups[meal.date].totalProtein += meal.parsed?.[0]?.protein || 0;
            groups[meal.date].totalCarbs += meal.parsed?.[0]?.carbs || 0;
            groups[meal.date].totalFiber += meal.parsed?.[0]?.fiber || 0;
        });

        setGroupedMeals(groups);
        // Expand today by default
        const today = format(new Date(), 'yyyy-MM-dd');
        setExpandedDays(prev => ({ ...prev, [today]: true }));
    };

    useEffect(() => { loadMeals(); }, []);

    const toggleDay = (date: string) => {
        setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Delete this meal?')) {
            await deleteMeal(id);
            loadMeals();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto px-4 pb-20"
        >
            <div className="overflow-y-auto flex-1 pt-2 space-y-3">
                {Object.keys(groupedMeals).length === 0 && (
                    <div className="flex items-center justify-center h-40">
                        <p className="text-zinc-600 text-sm">No meals in the last 30 days.</p>
                    </div>
                )}

                <AnimatePresence>
                    {Object.entries(groupedMeals).map(([date, data]) => {
                        const isExpanded = !!expandedDays[date];
                        const isToday = date === format(new Date(), 'yyyy-MM-dd');
                        return (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-zinc-800/60 border border-white/5 rounded-2xl overflow-hidden"
                            >
                                {/* Day header — tap to expand/collapse */}
                                <button
                                    onClick={() => toggleDay(date)}
                                    className="w-full px-4 py-3 flex items-center justify-between active:bg-zinc-700/30 transition-colors"
                                >
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-sm font-semibold text-zinc-200">
                                            {isToday ? 'Today' : format(new Date(date + 'T00:00:00'), 'EEE, MMM d')}
                                        </span>
                                        <div className="flex gap-3 text-xs text-zinc-500">
                                            <span>{data.totalCals} kcal</span>
                                            <span>{data.totalProtein}g P</span>
                                            <span>{data.totalCarbs}g C</span>
                                            <span>{data.totalFiber}g F</span>
                                        </div>
                                    </div>
                                    {isExpanded
                                        ? <ChevronUp className="w-4 h-4 text-zinc-500" />
                                        : <ChevronDown className="w-4 h-4 text-zinc-500" />
                                    }
                                </button>

                                {/* Meal list */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-white/5 divide-y divide-white/5">
                                                {data.meals.map(meal => (
                                                    <div key={meal.id} className="px-4 py-3 flex items-center gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-zinc-200 text-sm font-medium truncate">
                                                                {meal.parsed?.[0]?.food || meal.content}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                {format(meal.timestamp, 'h:mm a')}
                                                            </p>
                                                        </div>
                                                        <span className="text-emerald-400 font-bold text-sm shrink-0">
                                                            {meal.totalCalories} <span className="text-zinc-600 font-normal">kcal</span>
                                                        </span>
                                                        <button
                                                            onClick={() => meal.id && handleDelete(meal.id)}
                                                            className="p-1.5 text-zinc-600 active:text-red-400 transition-colors shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
