import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getAllMeals, deleteMeal, getAllWeights, type Meal, type WeightEntry } from '../lib/db';
import { format, subDays, isAfter, startOfWeek, startOfMonth } from 'date-fns';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface DayGroup {
    meals: Meal[];
    totalCals: number;
    totalProtein: number;
    totalCarbs: number;
    totalFiber: number;
}

interface SummaryGroup {
    label: string;
    days: number;
    totalCals: number;
    totalProtein: number;
    totalCarbs: number;
    totalFiber: number;
    avgCals: number;
}

const WeightSparkline = ({ weights }: { weights: WeightEntry[] }) => {
    if (weights.length < 2) return null;
    const sorted = [...weights].sort((a, b) => a.timestamp - b.timestamp).slice(-14);
    const vals = sorted.map(w => w.weight);
    const min = Math.min(...vals) - 1;
    const max = Math.max(...vals) + 1;
    const range = max - min || 1;
    const w = 200;
    const h = 50;
    const points = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    const latest = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    const trend = latest < prev ? 'down' : latest > prev ? 'up' : 'same';

    return (
        <div className="bg-zinc-800/60 border border-white/5 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Weight Trend</h3>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-zinc-200">{latest} kg</span>
                    {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
                    {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
                    {trend === 'same' && <Minus className="w-3.5 h-3.5 text-zinc-500" />}
                </div>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
                <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {vals.map((v, i) => (
                    <circle key={i} cx={(i / (vals.length - 1)) * w} cy={h - ((v - min) / range) * h} r="2.5" fill="#10b981" />
                ))}
            </svg>
            <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>{format(sorted[0].timestamp, 'MMM d')}</span>
                <span>{format(sorted[sorted.length - 1].timestamp, 'MMM d')}</span>
            </div>
        </div>
    );
};

export const History = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [groupedMeals, setGroupedMeals] = useState<Record<string, DayGroup>>({});
    const [summaries, setSummaries] = useState<SummaryGroup[]>([]);
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [weights, setWeights] = useState<WeightEntry[]>([]);

    const loadData = async () => {
        const [allMeals, allWeights] = await Promise.all([getAllMeals(), getAllWeights()]);
        const thirtyDaysAgo = subDays(new Date(), 30);

        const recent = allMeals
            .filter(m => isAfter(new Date(m.date), thirtyDaysAgo))
            .sort((a, b) => b.timestamp - a.timestamp);

        // Daily groups
        const groups: Record<string, DayGroup> = {};
        recent.forEach(meal => {
            if (!groups[meal.date]) groups[meal.date] = { meals: [], totalCals: 0, totalProtein: 0, totalCarbs: 0, totalFiber: 0 };
            groups[meal.date].meals.push(meal);
            groups[meal.date].totalCals += meal.totalCalories || 0;
            groups[meal.date].totalProtein += meal.parsed?.[0]?.protein || 0;
            groups[meal.date].totalCarbs += meal.parsed?.[0]?.carbs || 0;
            groups[meal.date].totalFiber += meal.parsed?.[0]?.fiber || 0;
        });
        setGroupedMeals(groups);

        // Summaries for weekly/monthly
        const summaryMap: Record<string, { label: string; days: Set<string>; cals: number; pro: number; carbs: number; fiber: number }> = {};
        recent.forEach(meal => {
            const d = new Date(meal.date + 'T00:00:00');
            const key = viewMode === 'weekly'
                ? format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                : format(startOfMonth(d), 'yyyy-MM');
            if (!summaryMap[key]) {
                summaryMap[key] = {
                    label: viewMode === 'weekly'
                        ? `Week of ${format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d')}`
                        : format(d, 'MMMM yyyy'),
                    days: new Set(),
                    cals: 0, pro: 0, carbs: 0, fiber: 0,
                };
            }
            summaryMap[key].days.add(meal.date);
            summaryMap[key].cals += meal.totalCalories || 0;
            summaryMap[key].pro += meal.parsed?.[0]?.protein || 0;
            summaryMap[key].carbs += meal.parsed?.[0]?.carbs || 0;
            summaryMap[key].fiber += meal.parsed?.[0]?.fiber || 0;
        });
        setSummaries(Object.values(summaryMap).map(s => ({
            label: s.label,
            days: s.days.size,
            totalCals: s.cals,
            totalProtein: s.pro,
            totalCarbs: s.carbs,
            totalFiber: s.fiber,
            avgCals: s.days.size > 0 ? Math.round(s.cals / s.days.size) : 0,
        })));

        setWeights(allWeights.sort((a: WeightEntry, b: WeightEntry) => a.timestamp - b.timestamp));

        const today = format(new Date(), 'yyyy-MM-dd');
        setExpandedDays(prev => ({ ...prev, [today]: true }));
    };

    useEffect(() => { loadData(); }, [viewMode]);

    const toggleDay = (date: string) => setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));

    const handleDelete = async (id: number) => {
        if (window.confirm('Delete this meal?')) { await deleteMeal(id); loadData(); }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-[calc(100vh-9rem)] max-w-md mx-auto px-4 pb-20"
        >
            {/* View Mode Toggle */}
            <div className="flex bg-zinc-800 rounded-xl p-1 mb-3 shrink-0">
                {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                            viewMode === mode ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
                {/* Weight Sparkline */}
                <WeightSparkline weights={weights} />

                {viewMode === 'daily' ? (
                    /* Daily View */
                    Object.keys(groupedMeals).length === 0 ? (
                        <p className="text-center text-zinc-600 text-sm py-8">No meals in the last 30 days.</p>
                    ) : (
                        <AnimatePresence>
                            {Object.entries(groupedMeals).map(([date, data]) => {
                                const isExpanded = !!expandedDays[date];
                                const isToday = date === format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-zinc-800/60 border border-white/5 rounded-2xl overflow-hidden">
                                        <button onClick={() => toggleDay(date)}
                                            className="w-full px-4 py-3 flex items-center justify-between active:bg-zinc-700/30">
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
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                                        </button>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <div className="border-t border-white/5 divide-y divide-white/5">
                                                        {data.meals.map(meal => (
                                                            <div key={meal.id} className="px-4 py-3 flex items-center gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-zinc-200 text-sm font-medium truncate">{meal.parsed?.[0]?.food || meal.content}</p>
                                                                    <p className="text-xs text-zinc-500">{format(meal.timestamp, 'h:mm a')}</p>
                                                                </div>
                                                                <span className="text-emerald-400 font-bold text-sm shrink-0">{meal.totalCalories} <span className="text-zinc-600 font-normal">kcal</span></span>
                                                                <button onClick={() => meal.id && handleDelete(meal.id)} className="p-1.5 text-zinc-600 active:text-red-400 shrink-0">
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
                    )
                ) : (
                    /* Weekly / Monthly View */
                    summaries.length === 0 ? (
                        <p className="text-center text-zinc-600 text-sm py-8">No data for this period.</p>
                    ) : (
                        summaries.map((s, i) => (
                            <div key={i} className="bg-zinc-800/60 border border-white/5 rounded-2xl px-4 py-4">
                                <h3 className="text-sm font-semibold text-zinc-200 mb-2">{s.label}</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-zinc-500">Total Calories</p>
                                        <p className="font-bold text-emerald-400">{s.totalCals.toLocaleString()} kcal</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500">Daily Avg</p>
                                        <p className="font-bold text-zinc-300">{s.avgCals} kcal</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500">Protein</p>
                                        <p className="font-bold text-zinc-300">{s.totalProtein}g total · {s.days > 0 ? Math.round(s.totalProtein / s.days) : 0}g/day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500">Carbs</p>
                                        <p className="font-bold text-zinc-300">{s.totalCarbs}g total · {s.days > 0 ? Math.round(s.totalCarbs / s.days) : 0}g/day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500">Fiber</p>
                                        <p className="font-bold text-zinc-300">{s.totalFiber}g total · {s.days > 0 ? Math.round(s.totalFiber / s.days) : 0}g/day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500">Days Logged</p>
                                        <p className="font-bold text-zinc-300">{s.days} days</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </motion.div>
    );
};
