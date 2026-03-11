import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getAllMeals, getSettings } from '../lib/db';
import { evaluateBadges, computeStreaks, type Badge, type StreakInfo } from '../lib/badges';
import clsx from 'clsx';

export const Profile = () => {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [streaks, setStreaks] = useState<StreakInfo>({ loggingStreak: 0, onTargetStreak: 0 });

    useEffect(() => {
        const load = async () => {
            const [meals, settings] = await Promise.all([getAllMeals(), getSettings()]);
            setBadges(evaluateBadges(meals, settings));
            setStreaks(computeStreaks(meals, settings));
        };
        load();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto px-4 pb-20 overflow-y-auto"
        >
            {/* Streak counters */}
            <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest pt-3 pb-2">Streaks</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-surface/60 border border-th-border rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-3xl">🔥</span>
                    <span className="text-2xl font-bold text-th-primary">
                        {streaks.loggingStreak > 0 ? streaks.loggingStreak : '—'}
                    </span>
                    <span className="text-xs text-th-muted text-center">
                        {streaks.loggingStreak > 0 ? 'day logging streak' : 'Log today to start!'}
                    </span>
                </div>
                <div className="bg-surface/60 border border-th-border rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className="text-3xl">🎯</span>
                    <span className="text-2xl font-bold text-th-primary">
                        {streaks.onTargetStreak > 0 ? streaks.onTargetStreak : '—'}
                    </span>
                    <span className="text-xs text-th-muted text-center">
                        {streaks.onTargetStreak > 0 ? 'days all macros on target' : 'Hit your goals today!'}
                    </span>
                </div>
            </div>

            <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest pb-3">
                Your Badges
            </h2>

            <div className="grid grid-cols-2 gap-3">
                {badges.map(badge => (
                    <div
                        key={badge.id}
                        className={clsx(
                            'bg-surface/60 border rounded-2xl p-4 flex flex-col items-center gap-3 transition-all',
                            badge.earned ? 'border-emerald-500/30' : 'border-th-border opacity-50'
                        )}
                    >
                        <img
                            src={badge.image}
                            alt={badge.name}
                            className={clsx(
                                'w-16 h-16 object-contain',
                                badge.earned ? '' : 'grayscale'
                            )}
                        />
                        <div className="text-center">
                            <p className={clsx(
                                'text-sm font-semibold',
                                badge.earned ? 'text-th-primary' : 'text-th-muted'
                            )}>
                                {badge.name}
                            </p>
                            <p className="text-[10px] text-th-muted mt-0.5">{badge.description}</p>
                        </div>
                        <div className={clsx(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            badge.earned
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-surface2 text-th-secondary'
                        )}>
                            {badge.earned ? 'Earned!' : badge.progress}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
