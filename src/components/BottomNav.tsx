import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, BarChart2, CalendarDays, Trophy } from 'lucide-react';
import clsx from 'clsx';

const tabs = [
    { path: '/', icon: MessageSquare, label: 'Input' },
    { path: '/today', icon: BarChart2, label: 'Today' },
    { path: '/history', icon: CalendarDays, label: 'History' },
    { path: '/profile', icon: Trophy, label: 'Profile' },
];

export const BottomNav = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/5 flex justify-around items-center h-16 px-4 z-50">
            {tabs.map(({ path, icon: Icon, label }) => {
                const active = pathname === path;
                return (
                    <button
                        key={path}
                        onClick={() => navigate(path)}
                        className={clsx(
                            'flex flex-col items-center gap-1 flex-1 py-2 transition-colors active:scale-95',
                            active ? 'text-emerald-400' : 'text-zinc-500'
                        )}
                    >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{label}</span>
                    </button>
                );
            })}
        </nav>
    );
};
