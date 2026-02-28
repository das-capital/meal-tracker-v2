import { motion } from 'framer-motion';
import { ArrowLeft, Save, Key, Target, Ruler, Trash2, AlertTriangle, Download, User, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { resetAllData, getAllMeals } from '../lib/db';
import { useState } from 'react';
import { AuthButton } from '../components/AuthButton';
import { useAuth } from '../contexts/AuthContext';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs text-zinc-400">{label}</label>
        {children}
    </div>
);

const inputCls = "bg-zinc-900/50 rounded-xl border border-white/10 p-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm w-full";

export const SettingsPage = () => {
    const navigate = useNavigate();
    const { settings, loading, updateSetting } = useSettings();
    const { user } = useAuth();
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = async () => {
        if (window.confirm('DANGER: Reset ALL data? This cannot be undone.')) {
            await resetAllData();
            window.location.reload();
        }
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

    if (loading || !settings) return <div className="p-8 text-zinc-400">Loading...</div>;

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
                    className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-4 h-4 text-zinc-400" />
                </button>
                <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-8">

                {/* Account / Cloud Sync */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Cloud className="w-3.5 h-3.5" /> Account
                    </h2>
                    <AuthButton />
                    <p className="text-xs text-zinc-600">
                        {user
                            ? 'Your data syncs automatically across devices.'
                            : 'Sign in to back up and sync your data across devices.'}
                    </p>
                </section>

                {/* Gemini API Key */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Key className="w-3.5 h-3.5" /> Gemini API Key
                    </h2>
                    <Field label="API Key (from aistudio.google.com)">
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={e => updateSetting('apiKey', e.target.value)}
                            placeholder="AIza..."
                            className={inputCls}
                        />
                    </Field>
                </section>

                {/* Daily Goals */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> Daily Goals
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Calories (kcal)">
                            <input type="number" value={settings.dailyCalories}
                                onChange={e => updateSetting('dailyCalories', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                        <Field label="Protein (g)">
                            <input type="number" value={settings.dailyProtein}
                                onChange={e => updateSetting('dailyProtein', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                        <Field label="Carbs (g)">
                            <input type="number" value={settings.dailyCarbs}
                                onChange={e => updateSetting('dailyCarbs', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                        <Field label="Fiber (g)">
                            <input type="number" value={settings.dailyFiber}
                                onChange={e => updateSetting('dailyFiber', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                    </div>
                </section>

                {/* Profile */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Profile
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Age">
                            <input type="number" value={settings.profileAge || ''}
                                onChange={e => updateSetting('profileAge', parseInt(e.target.value) || 0)}
                                placeholder="0" className={inputCls} />
                        </Field>
                        <Field label="Weight (kg)">
                            <input type="number" value={settings.profileWeight || ''}
                                onChange={e => updateSetting('profileWeight', parseInt(e.target.value) || 0)}
                                placeholder="0" className={inputCls} />
                        </Field>
                        <Field label="Height (cm)">
                            <input type="number" value={settings.profileHeight || ''}
                                onChange={e => updateSetting('profileHeight', parseInt(e.target.value) || 0)}
                                placeholder="0" className={inputCls} />
                        </Field>
                    </div>
                </section>

                {/* Portion Calibration */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Ruler className="w-3.5 h-3.5" /> Portion Sizes
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Bowl — liquid (ml)">
                            <input type="number" value={settings.unitBowlLiquid}
                                onChange={e => updateSetting('unitBowlLiquid', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                        <Field label="Bowl — solid (g)">
                            <input type="number" value={settings.unitBowlSolid}
                                onChange={e => updateSetting('unitBowlSolid', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                        <Field label="Tablespoon (g)">
                            <input type="number" value={settings.unitTbsp}
                                onChange={e => updateSetting('unitTbsp', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                        <Field label="Teaspoon (g)">
                            <input type="number" value={settings.unitTsp}
                                onChange={e => updateSetting('unitTsp', parseInt(e.target.value) || 0)}
                                className={inputCls} />
                        </Field>
                    </div>
                </section>

                {/* Save */}
                <button
                    onClick={handleSave}
                    className="w-full h-12 bg-zinc-800 rounded-xl flex items-center justify-center gap-2 font-medium text-zinc-200 active:scale-95 transition-transform border border-white/5"
                >
                    <Save className="w-4 h-4" />
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>

                {/* Data Export */}
                <button
                    onClick={handleExport}
                    className="w-full h-12 bg-zinc-800 rounded-xl flex items-center justify-center gap-2 font-medium text-zinc-200 active:scale-95 transition-transform border border-white/5"
                >
                    <Download className="w-4 h-4" />
                    Export Data (JSON)
                </button>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-red-500/10 space-y-3">
                    <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                    </h2>
                    <button
                        onClick={handleReset}
                        className="w-full h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 font-medium text-red-500 active:scale-95 transition-transform"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                    </button>
                </div>

            </div>
        </motion.div>
    );
};
