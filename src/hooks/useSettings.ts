import { useState, useEffect } from 'react';
import { getSettings, saveSetting, type UserSettings } from '../lib/db';

export const useSettings = () => {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const s = await getSettings();
            setSettings(s);
            setLoading(false);
        };
        load();
    }, []);

    const updateSetting = async (key: keyof UserSettings, value: any) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await saveSetting(key, value);
    };

    return { settings, loading, updateSetting };
};
