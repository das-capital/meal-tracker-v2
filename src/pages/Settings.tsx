import { motion } from 'framer-motion';
import { ArrowLeft, Save, Key, Target, Ruler, Trash2, AlertTriangle, Download, User, Cloud, Zap, Sun, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { resetAllData, getAllMeals, deleteMeal } from '../lib/db';
import { useState, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import { AuthButton } from '../components/AuthButton';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';
import { ConfirmModal } from '../components/ConfirmModal';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs text-th-secondary">{label}</label>
        {children}
    </div>
);

const inputCls = "bg-surface2 rounded-xl border border-th-border-strong p-3 text-th-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm w-full";

const NumericInput = ({ value, onChange, className, placeholder }: {
    value: number; onChange: (v: number) => void; className: string; placeholder?: string;
}) => {
    const [text, setText] = useState(value === 0 ? '' : String(value));
    useEffect(() => { setText(value === 0 ? '' : String(value)); }, [value]);
    return (
        <input
            type="number"
            value={text}
            placeholder={placeholder ?? '0'}
            onChange={e => {
                setText(e.target.value);
                const n = parseInt(e.target.value);
                if (!isNaN(n) && n >= 0) onChange(n);
            }}
            onBlur={() => {
                const n = parseInt(text);
                if (isNaN(n) || n < 0) { setText(''); onChange(0); }
            }}
            className={className}
        />
    );
};

const PROVIDER_LABELS = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    groq: 'Groq',
} as const;

const PROVIDER_LINKS = {
    gemini: 'https://aistudio.google.com',
    openai: 'https://platform.openai.com/api-keys',
    groq: 'https://console.groq.com',
} as const;

const PROVIDER_PLACEHOLDERS = {
    gemini: 'AIza...',
    openai: 'sk-...',
    groq: 'gsk_...',
} as const;

export const SettingsPage = () => {
    const navigate = useNavigate();
    const { settings, loading, updateSetting } = useSettings();
    const { user } = useAuth();
    const isAdmin = user?.uid === import.meta.env.VITE_ADMIN_UID;
    const [saved, setSaved] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<number | 'all' | null>(null);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleDeleteRange = async (days: number | 'all') => {
        if (days === 'all') {
            await resetAllData();
            window.location.reload();
            return;
        }
        const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');
        const meals = await getAllMeals();
        const toDelete = meals.filter(m => m.date >= cutoff && m.date <= today);
        try {
            await Promise.all(toDelete.map(m => deleteMeal(m.id!)));
        } catch {
            alert('Some meals could not be deleted. Please check your connection and try again.');
            return;
        }
        window.location.reload();
    };

    const handleExport = async () => {
        const meals = await getAllMeals();
        const blob = new Blob([JSON.stringify(meals, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meal-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading || !settings) return <div className="p-8 text-th-secondary">Loading...</div>;

    const provider = settings.provider || 'gemini';
    const theme = settings.theme || 'dark';

    return (
        <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className="max-w-md mx-auto flex flex-col h-[calc(100vh-4rem)]"
        >
            <div className="flex items-center gap-3 px-4 py-3 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-surface border border-th-border flex items-center justify-center active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-4 h-4 text-th-secondary" />
                </button>
                <h1 className="text-lg font-semibold text-th-primary">Settings</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-8">

                {/* Account / Cloud Sync */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <Cloud className="w-3.5 h-3.5" /> Account
                    </h2>
                    <AuthButton />
                    <p className="text-xs text-th-faint">
                        {user
                            ? 'Your data syncs automatically across devices.'
                            : 'Sign in to back up and sync your data across devices.'}
                    </p>
                </section>

                {/* Appearance */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5" /> Appearance
                    </h2>
                    <div className="grid grid-cols-2 gap-1 bg-surface2 rounded-xl border border-th-border-strong p-1">
                        {(['light', 'dark'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => {
                                    updateSetting('theme', t);
                                    document.documentElement.setAttribute('data-theme', t);
                                    localStorage.setItem('meal-tracker-theme', t);
                                    const meta = document.querySelector('meta[name="theme-color"]');
                                    if (meta) meta.setAttribute('content', t === 'dark' ? '#09090b' : '#fafafa');
                                }}
                                className={clsx(
                                    'py-2 rounded-lg text-xs font-medium transition-all capitalize',
                                    theme === t
                                        ? 'bg-emerald-500 text-zinc-900'
                                        : 'text-th-secondary hover:text-th-primary'
                                )}
                            >
                                {t === 'light' ? 'Light' : 'Dark'}
                            </button>
                        ))}
                    </div>
                </section>

                {/* AI Provider */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> AI Provider
                    </h2>
                    <div className="grid grid-cols-3 gap-1 bg-surface2 rounded-xl border border-th-border-strong p-1">
                        {(['gemini', 'openai', 'groq'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => updateSetting('provider', p)}
                                className={clsx(
                                    'py-2 rounded-lg text-xs font-medium transition-all',
                                    provider === p
                                        ? 'bg-emerald-500 text-zinc-900'
                                        : 'text-th-secondary hover:text-th-primary'
                                )}
                            >
                                {PROVIDER_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </section>

                {/* API Key — provider-specific */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <Key className="w-3.5 h-3.5" /> {PROVIDER_LABELS[provider]} API Key
                    </h2>
                    <Field label={`API Key`}>
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={e => updateSetting('apiKey', e.target.value)}
                            placeholder={PROVIDER_PLACEHOLDERS[provider]}
                            className={inputCls}
                        />
                    </Field>
                    <a
                        href={PROVIDER_LINKS[provider]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 underline"
                    >
                        Get {PROVIDER_LABELS[provider]} API key →
                    </a>
                </section>

                {/* Daily Goals */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> Daily Goals
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Calories (kcal)">
                            <NumericInput value={settings.dailyCalories} onChange={v => updateSetting('dailyCalories', v)} className={inputCls} />
                        </Field>
                        <Field label="Protein (g)">
                            <NumericInput value={settings.dailyProtein} onChange={v => updateSetting('dailyProtein', v)} className={inputCls} />
                        </Field>
                        <Field label="Fat (g)">
                            <NumericInput value={settings.dailyFat ?? 65} onChange={v => updateSetting('dailyFat', v)} className={inputCls} />
                        </Field>
                        <Field label="Carbs (g)">
                            <NumericInput value={settings.dailyCarbs} onChange={v => updateSetting('dailyCarbs', v)} className={inputCls} />
                        </Field>
                        <Field label="Fiber (g)">
                            <NumericInput value={settings.dailyFiber} onChange={v => updateSetting('dailyFiber', v)} className={inputCls} />
                        </Field>
                    </div>
                </section>

                {/* Profile */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Profile
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Age">
                            <NumericInput value={settings.profileAge || 0} onChange={v => updateSetting('profileAge', v)} className={inputCls} />
                        </Field>
                        <Field label="Weight (kg)">
                            <NumericInput value={settings.profileWeight || 0} onChange={v => updateSetting('profileWeight', v)} className={inputCls} />
                        </Field>
                        <Field label="Height (cm)">
                            <NumericInput value={settings.profileHeight || 0} onChange={v => updateSetting('profileHeight', v)} className={inputCls} />
                        </Field>
                    </div>
                </section>

                {/* Portion Calibration */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                        <Ruler className="w-3.5 h-3.5" /> Portion Sizes
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Bowl — liquid (ml)">
                            <NumericInput value={settings.unitBowlLiquid} onChange={v => updateSetting('unitBowlLiquid', v)} className={inputCls} />
                        </Field>
                        <Field label="Bowl — solid (g)">
                            <NumericInput value={settings.unitBowlSolid} onChange={v => updateSetting('unitBowlSolid', v)} className={inputCls} />
                        </Field>
                        <Field label="Tablespoon (g)">
                            <NumericInput value={settings.unitTbsp} onChange={v => updateSetting('unitTbsp', v)} className={inputCls} />
                        </Field>
                        <Field label="Teaspoon (g)">
                            <NumericInput value={settings.unitTsp} onChange={v => updateSetting('unitTsp', v)} className={inputCls} />
                        </Field>
                    </div>
                </section>

                {/* Admin */}
                {isAdmin && (
                    <section className="space-y-3">
                        <h2 className="text-xs font-bold text-th-muted uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Admin
                        </h2>
                        <Field label="Hosted AI requests / day">
                            <NumericInput
                                value={settings.hostedDailyLimit || 30}
                                onChange={v => updateSetting('hostedDailyLimit', v)}
                                className={inputCls}
                            />
                        </Field>
                    </section>
                )}

                {/* Save */}
                <button
                    onClick={handleSave}
                    className="w-full h-12 bg-surface2 rounded-xl flex items-center justify-center gap-2 font-medium text-th-primary active:scale-95 transition-transform border border-th-border"
                >
                    <Save className="w-4 h-4" />
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>

                {/* Data Export */}
                <button
                    onClick={handleExport}
                    className="w-full h-12 bg-surface2 rounded-xl flex items-center justify-center gap-2 font-medium text-th-primary active:scale-95 transition-transform border border-th-border"
                >
                    <Download className="w-4 h-4" />
                    Export Data (JSON)
                </button>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-red-500/10 space-y-3">
                    <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                    </h2>
                    <p className="text-xs text-th-muted">Delete meal history from a time range:</p>
                    <div className="grid grid-cols-3 gap-2">
                        {([
                            { label: 'Last 24h', days: 1 },
                            { label: 'Last 7 days', days: 7 },
                            { label: 'Last 30 days', days: 30 },
                        ] as const).map(({ label, days }) => (
                            <button
                                key={days}
                                onClick={() => setPendingDelete(days)}
                                className="py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-medium text-red-400 active:scale-95 transition-transform"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setPendingDelete('all')}
                        className="w-full h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 font-medium text-red-500 active:scale-95 transition-transform"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                    </button>
                </div>

            </div>

            {pendingDelete != null && (
                <ConfirmModal
                    message={pendingDelete === 'all'
                        ? 'Delete ALL data? This cannot be undone.'
                        : `Delete the last ${pendingDelete === 1 ? '24 hours' : pendingDelete === 7 ? '7 days' : '30 days'} of meals? This cannot be undone.`}
                    confirmLabel="Delete"
                    onConfirm={() => { handleDeleteRange(pendingDelete); setPendingDelete(null); }}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
        </motion.div>
    );
};
