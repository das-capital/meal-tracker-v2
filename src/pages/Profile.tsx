import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getAllMeals, getSettings } from '../lib/db';
import { evaluateBadges, type Badge } from '../lib/badges';
import clsx from 'clsx';

export const Profile = () => {
    const [badges, setBadges] = useState<Badge[]>([]);

    useEffect(() => {
        const load = async () => {
            const [meals, settings] = await Promise.all([getAllMeals(), getSettings()]);
            setBadges(evaluateBadges(meals, settings));
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
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest py-3">
                Your Badges
            </h2>

            <div className="grid grid-cols-2 gap-3">
                {badges.map(badge => (
                    <div
                        key={badge.id}
                        className={clsx(
                            'bg-zinc-800/60 border rounded-2xl p-4 flex flex-col items-center gap-3 transition-all',
                            badge.earned ? 'border-emerald-500/30' : 'border-white/5 opacity-50'
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
                                badge.earned ? 'text-zinc-100' : 'text-zinc-500'
                            )}>
                                {badge.name}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{badge.description}</p>
                        </div>
                        <div className={clsx(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            badge.earned
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-zinc-700 text-zinc-400'
                        )}>
                            {badge.earned ? 'Earned!' : badge.progress}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
