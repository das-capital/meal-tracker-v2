import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { EditMealModal } from '../components/EditMealModal';
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

const WeightChart = ({ weights }: { weights: WeightEntry[] }) => {
    if (weights.length === 0) return null;
    const sorted = [...weights].sort((a, b) => a.timestamp - b.timestamp).slice(-30);
    const vals = sorted.map(w => w.weight);
    const min = Math.min(...vals) - 0.5;
    const max = Math.max(...vals) + 0.5;
    const range = max - min || 1;
    const latest = vals[vals.length - 1];
    const first = vals[0];
    const diff = latest - first;
    const diffText = diff === 0 ? 'No change' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
    const diffColor = diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-red-400' : 'text-zinc-500';

    const chartW = 280;
    const chartH = 120;
    const padTop = 20;
    const padBottom = 25;
    const innerH = chartH - padTop - padBottom;

    const getX = (i: number) => (sorted.length === 1 ? chartW / 2 : (i / (sorted.length - 1)) * chartW);
    const getY = (v: number) => padTop + innerH - ((v - min) / range) * innerH;

    const points = vals.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

    // Y-axis labels
    const ySteps = 4;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => min + (range / ySteps) * i);

    return (
        <div className="bg-zinc-800/60 border border-white/5 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Weight Trend</h3>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-zinc-100">{latest} kg</span>
                    <span className={`text-xs font-medium ${diffColor}`}>{diffText}</span>
                </div>
            </div>

            <svg viewBox={`-35 0 ${chartW + 40} ${chartH}`} className="w-full" style={{ height: '140px' }}>
                {/* Grid lines and Y labels */}
                {yLabels.map((v, i) => (
                    <g key={i}>
                        <line x1="0" x2={chartW} y1={getY(v)} y2={getY(v)} stroke="#27272a" strokeWidth="0.5" />
                        <text x="-8" y={getY(v) + 3} textAnchor="end" fill="#71717a" fontSize="8">{v.toFixed(1)}</text>
                    </g>
                ))}

                {/* Area fill */}
                <polygon
                    points={`0,${chartH - padBottom} ${points} ${chartW},${chartH - padBottom}`}
                    fill="url(#weightGradient)"
                />
                <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Line */}
                <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points with labels */}
                {sorted.map((w, i) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(w.weight)} r="3" fill="#10b981" stroke="#18181b" strokeWidth="1.5" />
                        {(i === 0 || i === sorted.length - 1 || sorted.length <= 7) && (
                            <text x={getX(i)} y={getY(w.weight) - 8} textAnchor="middle" fill="#a1a1aa" fontSize="7" fontWeight="600">
                                {w.weight}
                            </text>
                        )}
                    </g>
                ))}

                {/* X-axis date labels */}
                {sorted.length > 1 && (
                    <>
                        <text x={0} y={chartH - 5} textAnchor="start" fill="#52525b" fontSize="7">
                            {format(sorted[0].timestamp, 'MMM d')}
                        </text>
                        <text x={chartW} y={chartH - 5} textAnchor="end" fill="#52525b" fontSize="7">
                            {format(sorted[sorted.length - 1].timestamp, 'MMM d')}
                        </text>
                    </>
                )}
            </svg>

            {/* Weight log entries */}
            {sorted.length <= 10 && (
                <div className="mt-3 border-t border-white/5 pt-3 space-y-1.5">
                    {[...sorted].reverse().map((w, i) => (
                        <div key={i} className="flex justify-between text-xs text-zinc-400">
                            <span>{format(w.timestamp, 'EEE, MMM d')}</span>
                            <span className="font-medium text-zinc-300">{w.weight} kg</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const History = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [groupedMeals, setGroupedMeals] = useState<Record<string, DayGroup>>({});
    const [summaries, setSummaries] = useState<SummaryGroup[]>([]);
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [weights, setWeights] = useState<WeightEntry[]>([]);
    const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

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
                                                                <button onClick={() => setEditingMeal(meal)} className="p-1.5 text-zinc-600 active:text-blue-400 shrink-0">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
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
                        <>
                        {summaries.map((s, i) => (
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
                        ))}
                        <WeightChart weights={weights} />
                        </>
                    )
                )}
            </div>

            <EditMealModal
                meal={editingMeal}
                onClose={() => setEditingMeal(null)}
                onSaved={loadData}
            />
        </motion.div>
    );
};
