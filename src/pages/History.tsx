import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { EditMealModal } from '../components/EditMealModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { getAllMeals, deleteMeal, getAllWeights, type Meal, type WeightEntry } from '../lib/db';
import { useSettings } from '../hooks/useSettings';
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
    const diffColor = diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-red-400' : 'text-th-muted';

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
        <div className="bg-surface/60 border border-th-border rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-th-muted uppercase tracking-widest">Weight Trend</h3>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-th-primary">{latest} kg</span>
                    <span className={`text-xs font-medium ${diffColor}`}>{diffText}</span>
                </div>
            </div>

            <svg viewBox={`-35 0 ${chartW + 40} ${chartH}`} className="w-full" style={{ height: '140px' }}>
                {/* Grid lines and Y labels */}
                {yLabels.map((v, i) => (
                    <g key={i}>
                        <line x1="0" x2={chartW} y1={getY(v)} y2={getY(v)} stroke="var(--color-chart-grid)" strokeWidth="0.5" />
                        <text x="-8" y={getY(v) + 3} textAnchor="end" fill="var(--color-chart-label)" fontSize="8">{v.toFixed(1)}</text>
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
                        <circle cx={getX(i)} cy={getY(w.weight)} r="3" fill="#10b981" stroke="var(--color-chart-dot-stroke)" strokeWidth="1.5" />
                        {(i === 0 || i === sorted.length - 1 || sorted.length <= 7) && (
                            <text x={getX(i)} y={getY(w.weight) - 8} textAnchor="middle" fill="var(--color-chart-label)" fontSize="7" fontWeight="600">
                                {w.weight}
                            </text>
                        )}
                    </g>
                ))}

                {/* X-axis date labels */}
                {sorted.length > 1 && (
                    <>
                        <text x={0} y={chartH - 5} textAnchor="start" fill="var(--color-chart-axis)" fontSize="7">
                            {format(sorted[0].timestamp, 'MMM d')}
                        </text>
                        <text x={chartW} y={chartH - 5} textAnchor="end" fill="var(--color-chart-axis)" fontSize="7">
                            {format(sorted[sorted.length - 1].timestamp, 'MMM d')}
                        </text>
                    </>
                )}
            </svg>

            {/* Weight log entries */}
            {sorted.length <= 10 && (
                <div className="mt-3 border-t border-th-border pt-3 space-y-1.5">
                    {[...sorted].reverse().map((w, i) => (
                        <div key={i} className="flex justify-between text-xs text-th-secondary">
                            <span>{format(w.timestamp, 'EEE, MMM d')}</span>
                            <span className="font-medium text-th-primary">{w.weight} kg</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CalorieChart = ({ groupedMeals, goalCals }: { groupedMeals: Record<string, DayGroup>; goalCals: number }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const chartW = 280, chartH = 100, padBottom = 22;
    const innerH = chartH - padBottom;
    const maxCals = goalCals * 1.3;
    const barSlot = chartW / 7;
    const barW = barSlot * 0.55;

    const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const date = format(d, 'yyyy-MM-dd');
        return {
            date,
            label: i === 6 ? 'Today' : format(d, 'EEE'),
            cals: groupedMeals[date]?.totalCals ?? 0,
            isToday: date === today,
        };
    });

    const getBarH = (cals: number) => cals === 0 ? 0 : Math.max(3, (Math.min(cals, maxCals) / maxCals) * innerH);
    const goalY = innerH - (goalCals / maxCals) * innerH;

    return (
        <div className="bg-surface/60 border border-th-border rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-th-muted uppercase tracking-widest">7-Day Calories</h3>
                <span className="text-xs text-th-faint">Goal: {goalCals} kcal</span>
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: '110px' }}>
                {/* Goal line */}
                <line x1={0} x2={chartW} y1={goalY} y2={goalY}
                    stroke="#10b981" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                <text x={chartW - 2} y={goalY - 3} textAnchor="end"
                    fill="var(--color-chart-label)" fontSize="7" opacity="0.7">goal</text>

                {days.map((day, i) => {
                    const bh = getBarH(day.cals);
                    const bx = i * barSlot + (barSlot - barW) / 2;
                    const by = innerH - bh;
                    const color = day.cals === 0
                        ? 'var(--color-chart-grid)'
                        : day.cals > goalCals ? '#ef4444' : '#10b981';
                    return (
                        <g key={day.date}>
                            <rect x={bx} y={bh === 0 ? innerH - 2 : by} width={barW} height={bh === 0 ? 2 : bh}
                                fill={color} opacity={day.isToday ? 1 : 0.7} rx="2" />
                            {day.isToday && day.cals > 0 && (
                                <rect x={bx} y={by} width={barW} height={bh}
                                    fill="none" stroke="#34d399" strokeWidth="1.5" rx="2" />
                            )}
                            {bh > 14 && (
                                <text x={bx + barW / 2} y={by - 3} textAnchor="middle"
                                    fill="var(--color-chart-label)" fontSize="7" fontWeight="600">
                                    {day.cals}
                                </text>
                            )}
                            <text x={bx + barW / 2} y={chartH - 4} textAnchor="middle"
                                fill={day.isToday ? '#10b981' : 'var(--color-chart-axis)'} fontSize="7"
                                fontWeight={day.isToday ? '700' : '400'}>
                                {day.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
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
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const { settings } = useSettings();

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

    const handleDelete = async () => {
        if (deletingId == null) return;
        try {
            await deleteMeal(deletingId);
        } finally {
            setDeletingId(null);
            loadData();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-[calc(100vh-9rem)] max-w-md mx-auto px-4 pb-20"
        >
            {/* View Mode Toggle */}
            <div className="flex bg-surface rounded-xl p-1 mb-3 shrink-0">
                {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                            viewMode === mode ? 'bg-surface2 text-th-primary' : 'text-th-muted'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
                {viewMode === 'daily' && (
                    <>
                        <CalorieChart groupedMeals={groupedMeals} goalCals={settings?.dailyCalories || 2000} />
                        <WeightChart weights={weights} />
                    </>
                )}
                {viewMode === 'daily' ? (
                    /* Daily View */
                    Object.keys(groupedMeals).length === 0 ? (
                        <p className="text-center text-th-faint text-sm py-8">No meals in the last 30 days.</p>
                    ) : (
                        <AnimatePresence>
                            {Object.entries(groupedMeals).map(([date, data]) => {
                                const isExpanded = !!expandedDays[date];
                                const isToday = date === format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <motion.div key={date} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="bg-surface/60 border border-th-border rounded-2xl overflow-hidden">
                                        <button onClick={() => toggleDay(date)}
                                            className="w-full px-4 py-3 flex items-center justify-between active:bg-surface2/30">
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className="text-sm font-semibold text-th-primary">
                                                    {isToday ? 'Today' : format(new Date(date + 'T00:00:00'), 'EEE, MMM d')}
                                                </span>
                                                <div className="flex gap-3 text-xs text-th-muted">
                                                    <span>{data.totalCals} kcal</span>
                                                    <span>{data.totalProtein}g P</span>
                                                    <span>{data.totalCarbs}g C</span>
                                                    <span>{data.totalFiber}g F</span>
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-th-muted" /> : <ChevronDown className="w-4 h-4 text-th-muted" />}
                                        </button>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <div className="border-t border-th-border divide-y divide-th-border">
                                                        {data.meals.map(meal => (
                                                            <div key={meal.id} className="px-4 py-3 flex items-center gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-th-primary text-sm font-medium truncate">{meal.parsed?.[0]?.food || meal.content}</p>
                                                                    <p className="text-xs text-th-muted">{format(meal.timestamp, 'h:mm a')}</p>
                                                                </div>
                                                                <span className="text-emerald-400 font-bold text-sm shrink-0">{meal.totalCalories} <span className="text-th-faint font-normal">kcal</span></span>
                                                                <button onClick={() => setEditingMeal(meal)} className="p-1.5 text-th-faint active:text-blue-400 shrink-0">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => meal.id && setDeletingId(meal.id)} className="p-1.5 text-th-faint active:text-red-400 shrink-0">
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
                        <p className="text-center text-th-faint text-sm py-8">No data for this period.</p>
                    ) : (
                        <>
                        {summaries.map((s, i) => (
                            <div key={i} className="bg-surface/60 border border-th-border rounded-2xl px-4 py-4">
                                <h3 className="text-sm font-semibold text-th-primary mb-2">{s.label}</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-th-muted">Total Calories</p>
                                        <p className="font-bold text-emerald-400">{s.totalCals.toLocaleString()} kcal</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-th-muted">Daily Avg</p>
                                        <p className="font-bold text-th-secondary">{s.avgCals} kcal</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-th-muted">Protein</p>
                                        <p className="font-bold text-th-secondary">{s.totalProtein}g total · {s.days > 0 ? Math.round(s.totalProtein / s.days) : 0}g/day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-th-muted">Carbs</p>
                                        <p className="font-bold text-th-secondary">{s.totalCarbs}g total · {s.days > 0 ? Math.round(s.totalCarbs / s.days) : 0}g/day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-th-muted">Fiber</p>
                                        <p className="font-bold text-th-secondary">{s.totalFiber}g total · {s.days > 0 ? Math.round(s.totalFiber / s.days) : 0}g/day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-th-muted">Days Logged</p>
                                        <p className="font-bold text-th-secondary">{s.days} days</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </>
                    )
                )}
            </div>

            <EditMealModal
                meal={editingMeal}
                onClose={() => setEditingMeal(null)}
                onSaved={loadData}
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
