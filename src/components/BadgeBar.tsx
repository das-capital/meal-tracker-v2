import { useEffect, useState } from 'react';
import { getAllMeals, getSettings } from '../lib/db';
import { evaluateBadges, type Badge } from '../lib/badges';

export const BadgeBar = () => {
    const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);

    useEffect(() => {
        const load = async () => {
            const [meals, settings] = await Promise.all([getAllMeals(), getSettings()]);
            const badges = evaluateBadges(meals, settings);
            setEarnedBadges(badges.filter(b => b.earned));
        };
        load();
    }, []);

    if (earnedBadges.length === 0) return null;

    return (
        <div className="flex gap-1.5 items-center px-4 py-1.5 overflow-x-auto">
            {earnedBadges.map(badge => (
                <img
                    key={badge.id}
                    src={badge.image}
                    alt={badge.name}
                    title={badge.name}
                    className="w-7 h-7 rounded-md object-contain"
                />
            ))}
        </div>
    );
};
