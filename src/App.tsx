import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { format } from 'date-fns';
import { Home } from './pages/Home';
import { MealInput } from './pages/MealInput';
import { History } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { Profile } from './pages/Profile';
import { BottomNav } from './components/BottomNav';
import { BadgeBar } from './components/BadgeBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './hooks/useSettings';

function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const isSettings = location.pathname === '/settings';
    const { loading } = useAuth();
    const { settings } = useSettings();

    useEffect(() => {
        const theme = settings?.theme ?? 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('meal-tracker-theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#09090b' : '#fafafa');
    }, [settings?.theme]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-th-faint text-sm">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-th-primary font-sans select-none flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-1 shrink-0">
                <span className="text-sm font-medium text-th-secondary">
                    {format(new Date(), 'EEE, MMM d')}
                </span>
                <button
                    onClick={() => navigate('/settings')}
                    className="w-9 h-9 rounded-xl bg-surface border border-th-border flex items-center justify-center active:scale-95 transition-transform"
                >
                    <Settings className="w-4 h-4 text-th-secondary" />
                </button>
            </div>

            {/* Badge Bar — earned badges at the top */}
            {!isSettings && <BadgeBar />}

            {/* Page Content */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<MealInput />} />
                        <Route path="/today" element={<Home />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </AnimatePresence>
            </div>

            {/* Bottom Nav — hidden on settings page */}
            {!isSettings && <BottomNav />}
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
