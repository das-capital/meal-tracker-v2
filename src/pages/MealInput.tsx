import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Sparkles, CheckCircle, AlertCircle, Star, ChefHat, Camera, ExternalLink, ChevronDown, ChevronUp, Edit2, Eraser, Barcode, Menu, Plus, Droplets } from 'lucide-react';
import { processInput, processLabelImage } from '../lib/ai-parser';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { fetchByBarcode, type OFFProduct } from '../lib/openfoodfacts';
import { useMeals } from '../hooks/useMeals';
import { useSettings } from '../hooks/useSettings';
import { addFavourite, addWeight, getAllFavourites, getAllRecipes, saveSetting, updateMeal, type Favourite } from '../lib/db';
import { FavouritesPanel } from '../components/FavouritesPanel';
import { RecipesPanel } from '../components/RecipesPanel';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    type?: 'meal' | 'chat' | 'error' | 'weight' | 'favourite_saved' | 'barcode_found';
    mealData?: { food: string; calories: number; protein: number; fat: number; carbs: number; fiber: number };
    mealId?: number;
    imagePreview?: string;
    barcodeProduct?: OFFProduct;
}

const CHAT_STORAGE_KEY = 'meal-tracker-chat';

function loadTodayChat(): ChatMessage[] {
    try {
        const stored = localStorage.getItem(CHAT_STORAGE_KEY);
        if (!stored) return [];
        const { date, messages } = JSON.parse(stored);
        if (date === format(new Date(), 'yyyy-MM-dd')) return messages;
        localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    return [];
}

function saveTodayChat(messages: ChatMessage[]) {
    try {
        const stripped = messages.map(({ imagePreview: _, ...rest }) => rest);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
            date: format(new Date(), 'yyyy-MM-dd'),
            messages: stripped,
        }));
    } catch {
        // Quota exceeded — chat won't persist this session, that's okay
    }
}

export const MealInput = () => {
    const { addMeal, meals, refreshMeals } = useMeals();
    const { settings, updateSetting } = useSettings();
    const { user, signIn } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>(loadTodayChat);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showFavourites, setShowFavourites] = useState(false);
    const [showRecipes, setShowRecipes] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [pendingBarcode, setPendingBarcode] = useState<OFFProduct | null>(null);
    const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
    const [draftMacros, setDraftMacros] = useState<{ calories: number; protein: number; fat: number; carbs: number; fiber: number } | null>(null);
    const [showChoicesMenu, setShowChoicesMenu] = useState(false);
    const [showWaterPicker, setShowWaterPicker] = useState(false);

    // Onboarding state
    const [onboardingExpand, setOnboardingExpand] = useState<null | 'openai-groq' | 'gemini'>(null);
    const [onboardingProvider, setOnboardingProvider] = useState<'openai' | 'groq'>('openai');
    const [onboardingKey, setOnboardingKey] = useState('');
    const [showApiKeyExplain, setShowApiKeyExplain] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const msgId = useRef(loadTodayChat().length);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const handleRecipeLog = async (e: Event) => {
            try {
                const { recipe, weight } = (e as CustomEvent).detail;
                const ratio = weight / recipe.totalWeight;
                const mealData = {
                    food: `${weight}g ${recipe.name}`,
                    calories: Math.round(recipe.totalCalories * ratio),
                    protein: Math.round(recipe.totalProtein * ratio),
                    fat: Math.round(recipe.totalFat * ratio),
                    carbs: Math.round(recipe.totalCarbs * ratio),
                    fiber: Math.round(recipe.totalFiber * ratio),
                };
                await addMeal(`${weight}g of ${recipe.name}`, mealData);
                await refreshMeals();
                addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData });
            } catch {
                addMsg({ role: 'assistant', type: 'error', text: 'Failed to log recipe. Please try again.' });
            }
        };
        window.addEventListener('recipe-log', handleRecipeLog);
        return () => window.removeEventListener('recipe-log', handleRecipeLog);
    }, []);

    // Persist chat to localStorage whenever messages change
    useEffect(() => { saveTodayChat(messages); }, [messages]);

    const addMsg = (msg: Omit<ChatMessage, 'id'>): ChatMessage => {
        const m = { ...msg, id: ++msgId.current };
        setMessages(prev => [...prev, m]);
        return m;
    };

    const handleMicClick = () => {
        if (!('webkitSpeechRecognition' in window)) { alert('Voice input not supported.'); return; }
        if (isListening) { setIsListening(false); return; }
        setIsListening(true);
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-IN';
        recognition.onresult = (e: any) => { setInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript); setIsListening(false); };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const compressImage = (file: File): Promise<{ base64: string; mimeType: string; preview: string }> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const MAX = 1024;
                const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl });
            };
            img.onerror = reject;
            img.src = url;
        });

    const parseBarcodeGrams = (text: string): number | null => {
        const m = text.match(/(\d+\.?\d*)\s*(?:gm?s?\b|gram?s?\b|ml\b)/i);
        if (m) return parseFloat(m[1]);
        const bare = text.match(/^(\d+\.?\d*)$/);
        if (bare) return parseFloat(bare[1]);
        return null;
    };

    const handleBarcodeDetected = async (barcode: string) => {
        setShowBarcodeScanner(false);
        setIsProcessing(true);
        addMsg({ role: 'user', text: `Barcode: ${barcode}` });
        try {
            const result = await fetchByBarcode(barcode);
            if (result.found) {
                setPendingBarcode(result.product);
                addMsg({ role: 'assistant', type: 'barcode_found', text: '', barcodeProduct: result.product });
            } else {
                const reason = result.reason;
                const text =
                    reason === 'network_error'
                        ? 'Could not reach Open Food Facts. Check your internet connection and try again.'
                        : reason === 'no_nutrition'
                        ? 'Found the product but it has no nutrition data in the database. Try typing your meal manually.'
                        : 'Product not found in Open Food Facts. Try typing your meal manually.';
                addMsg({ role: 'assistant', type: 'error', text });
            }
        } catch {
            addMsg({ role: 'assistant', type: 'error', text: 'Something went wrong fetching product data. Please try again.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        try {
            const compressed = await compressImage(file);
            setPendingImage(compressed);
            addMsg({ role: 'user', text: '', imagePreview: compressed.preview });
        } catch {
            addMsg({ role: 'assistant', type: 'error', text: 'Could not load image. Please try again.' });
        }
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isProcessing) return;
        setInput('');
        setIsProcessing(true);
        addMsg({ role: 'user', text });

        try {
            if (pendingBarcode) {
                const grams = parseBarcodeGrams(text);
                if (!grams || grams <= 0) {
                    addMsg({ role: 'assistant', type: 'error',
                        text: `Couldn't understand "${text}". Try something like "200g".` });
                    return;
                }
                const ratio = grams / 100;
                const p = pendingBarcode;
                const displayName = [p.brand, p.name].filter(Boolean).join(' – ') || 'Scanned product';
                const mealData = {
                    food: `${grams}g ${displayName}`,
                    calories: Math.round(p.per100kcal * ratio),
                    protein:  Math.round(p.per100protein * ratio),
                    fat:      Math.round(p.per100fat * ratio),
                    carbs:    Math.round(p.per100carbs * ratio),
                    fiber:    Math.round(p.per100fiber * ratio),
                };
                const mealId = await addMeal(text, mealData);
                setPendingBarcode(null);
                addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData, mealId });
                return;
            }

            const result = pendingImage
                ? await processLabelImage(pendingImage.base64, pendingImage.mimeType, text)
                : await processInput(text);
            setPendingImage(null);

            if (result.type === 'meal') {
                const mealId = await addMeal(text, result.data);
                addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData: result.data, mealId });
            } else if (result.type === 'meal_list') {
                for (const item of result.items) {
                    const mealId = await addMeal(text, item);
                    addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData: item, mealId });
                }
            } else if (result.type === 'favourite_save') {
                if (meals.length > 0) {
                    const lastMeal = meals[meals.length - 1];
                    try {
                        await addFavourite({
                            name: result.name,
                            content: lastMeal.content,
                            parsed: lastMeal.parsed,
                            totalCalories: lastMeal.totalCalories,
                            createdAt: Date.now(),
                        });
                        addMsg({ role: 'assistant', type: 'favourite_saved', text: `Saved "${result.name}" as a favourite!` });
                    } catch (e: any) {
                        addMsg({ role: 'assistant', type: 'error', text: `A favourite named "${result.name}" already exists. Use a different name.` });
                    }
                } else {
                    addMsg({ role: 'assistant', type: 'error', text: 'Log a meal first, then save it as a favourite.' });
                }
            } else if (result.type === 'favourite_log') {
                const favs = await getAllFavourites();
                const fav = favs.find(f => f.name.toLowerCase() === result.name.toLowerCase());
                if (fav) {
                    await addMeal(fav.content, fav.parsed[0]);
                    addMsg({
                        role: 'assistant', type: 'meal', text: `Logged favourite "${fav.name}"!`,
                        mealData: fav.parsed[0],
                    });
                } else {
                    addMsg({ role: 'assistant', type: 'error', text: `No favourite named "${result.name}" found.` });
                }
            } else if (result.type === 'recipe_log') {
                const recipes = await getAllRecipes();
                const recipe = recipes.find(r => r.name.toLowerCase() === result.name.toLowerCase());
                if (recipe) {
                    const ratio = result.weight / recipe.totalWeight;
                    const mealData = {
                        food: `${result.weight}g ${recipe.name}`,
                        calories: Math.round(recipe.totalCalories * ratio),
                        protein: Math.round(recipe.totalProtein * ratio),
                        fat: Math.round(recipe.totalFat * ratio),
                        carbs: Math.round(recipe.totalCarbs * ratio),
                        fiber: Math.round(recipe.totalFiber * ratio),
                    };
                    await addMeal(`${result.weight}g of ${recipe.name}`, mealData);
                    addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData });
                } else {
                    addMsg({ role: 'assistant', type: 'error', text: `No recipe named "${result.name}" found.` });
                }
            } else if (result.type === 'weight') {
                await addWeight({ date: format(new Date(), 'yyyy-MM-dd'), weight: result.weight, timestamp: Date.now() });
                await saveSetting('profileWeight', result.weight);
                addMsg({ role: 'assistant', type: 'weight', text: `Weight logged: ${result.weight} kg (profile updated)` });
            } else if (result.type === 'height') {
                await saveSetting('profileHeight', result.height);
                addMsg({ role: 'assistant', type: 'weight', text: `Height saved: ${result.height} cm (profile updated)` });
            } else if (result.type === 'age') {
                await saveSetting('profileAge', result.age);
                addMsg({ role: 'assistant', type: 'weight', text: `Age saved: ${result.age} years (profile updated)` });
            } else if (result.type === 'chat') {
                addMsg({ role: 'assistant', type: 'chat', text: result.message });
            } else {
                addMsg({ role: 'assistant', type: 'error', text: result.message });
            }
        } catch {
            addMsg({ role: 'assistant', type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveMacros = async (msgId: number, mealId: number) => {
        if (!draftMacros) return;
        const meal = meals.find(m => m.id === mealId);
        if (meal) {
            await updateMeal({
                ...meal,
                parsed: [{ ...meal.parsed[0], ...draftMacros }],
                totalCalories: draftMacros.calories,
            });
            await refreshMeals();
        }
        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, mealData: { ...m.mealData!, ...draftMacros } } : m
        ));
        setEditingMsgId(null);
        setDraftMacros(null);
    };

    const handleLogFavourite = async (fav: Favourite) => {
        await addMeal(fav.content, fav.parsed[0]);
        await refreshMeals();
        addMsg({
            role: 'assistant', type: 'meal', text: `Logged favourite "${fav.name}"!`,
            mealData: fav.parsed[0],
        });
    };

    const handleLogWater = async (ml: number) => {
        setShowChoicesMenu(false);
        setShowWaterPicker(false);
        const waterMacros = { food: 'Water', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
        await addMeal(`${ml}ml water`, waterMacros);
        addMsg({ role: 'assistant', type: 'chat', text: `💧 ${ml}ml water logged.` });
    };

    const handleClearChat = () => {
        setMessages([]);
        localStorage.removeItem(CHAT_STORAGE_KEY);
        setEditingMsgId(null);
        setDraftMacros(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleOnboardingSave = async (finalProvider: 'gemini' | 'openai' | 'groq') => {
        if (!onboardingKey.trim()) return;
        await updateSetting('provider', finalProvider);
        await updateSetting('apiKey', onboardingKey.trim());
        setOnboardingKey('');
        setOnboardingExpand(null);
    };

    // Signed-in users get hosted AI — no onboarding needed
    const showOnboarding = !!settings && !settings.apiKey && !user;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[calc(100vh-9rem)] max-w-md mx-auto px-4 select-text"
        >
            {/* Chat area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pb-4">

                {messages.length > 0 && (
                    <div className="flex justify-end">
                        <button
                            onClick={handleClearChat}
                            className="flex items-center gap-1 text-xs text-th-faint hover:text-th-secondary transition-colors"
                        >
                            <Eraser className="w-3 h-3" />
                            Clear chat
                        </button>
                    </div>
                )}

                {/* Onboarding banner */}
                {showOnboarding && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-surface2/90 border border-th-border-strong rounded-2xl p-4 space-y-3"
                    >
                        <div>
                            <p className="text-sm font-semibold text-th-primary">Connect an AI to unlock smart logging</p>
                            <p className="text-xs text-th-secondary mt-1 leading-relaxed">
                                An API key lets the app understand natural food descriptions. Without one, you can still log common foods — but chatting, saving favourites, and recognising unknown foods requires AI.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {/* Option 1: OpenAI / Groq */}
                            <button
                                onClick={() => setOnboardingExpand(v => v === 'openai-groq' ? null : 'openai-groq')}
                                className="w-full flex items-center justify-between bg-surface2/50 hover:bg-surface2 border border-th-border-strong rounded-xl px-3 py-2.5 text-sm text-th-primary transition-colors"
                            >
                                <span>I have an OpenAI / Groq subscription</span>
                                {onboardingExpand === 'openai-groq' ? <ChevronUp className="w-4 h-4 text-th-secondary shrink-0" /> : <ChevronDown className="w-4 h-4 text-th-secondary shrink-0" />}
                            </button>
                            {onboardingExpand === 'openai-groq' && (
                                <div className="bg-surface2 border border-th-border rounded-xl p-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-1">
                                        {(['openai', 'groq'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setOnboardingProvider(p)}
                                                className={clsx(
                                                    'py-2 rounded-lg text-xs font-medium transition-all',
                                                    onboardingProvider === p
                                                        ? 'bg-emerald-500 text-zinc-900'
                                                        : 'bg-surface2 text-th-secondary hover:text-th-primary'
                                                )}
                                            >
                                                {p === 'openai' ? 'OpenAI' : 'Groq'}
                                            </button>
                                        ))}
                                    </div>
                                    <a
                                        href={onboardingProvider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.groq.com'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-emerald-400"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Get {onboardingProvider === 'openai' ? 'OpenAI' : 'Groq'} API key
                                    </a>
                                    <input
                                        type="password"
                                        value={onboardingKey}
                                        onChange={e => setOnboardingKey(e.target.value)}
                                        placeholder={onboardingProvider === 'openai' ? 'sk-...' : 'gsk_...'}
                                        className="w-full bg-surface2 border border-th-border-strong rounded-xl p-2.5 text-th-primary text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    />
                                    <button
                                        onClick={() => handleOnboardingSave(onboardingProvider)}
                                        disabled={!onboardingKey.trim()}
                                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 rounded-xl text-zinc-900 text-xs font-semibold transition-colors"
                                    >
                                        Save & Connect
                                    </button>
                                </div>
                            )}

                            {/* Option 2: Gemini */}
                            <button
                                onClick={() => setOnboardingExpand(v => v === 'gemini' ? null : 'gemini')}
                                className="w-full flex items-center justify-between bg-surface2/50 hover:bg-surface2 border border-th-border-strong rounded-xl px-3 py-2.5 text-sm text-th-primary transition-colors"
                            >
                                <span>Get a free key from Google AI Studio</span>
                                {onboardingExpand === 'gemini' ? <ChevronUp className="w-4 h-4 text-th-secondary shrink-0" /> : <ChevronDown className="w-4 h-4 text-th-secondary shrink-0" />}
                            </button>
                            {onboardingExpand === 'gemini' && (
                                <div className="bg-surface2 border border-th-border rounded-xl p-3 space-y-3">
                                    <a
                                        href="https://aistudio.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-emerald-400"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Open Google AI Studio (free)
                                    </a>
                                    <input
                                        type="password"
                                        value={onboardingKey}
                                        onChange={e => setOnboardingKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="w-full bg-surface2 border border-th-border-strong rounded-xl p-2.5 text-th-primary text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    />
                                    <button
                                        onClick={() => handleOnboardingSave('gemini')}
                                        disabled={!onboardingKey.trim()}
                                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 rounded-xl text-zinc-900 text-xs font-semibold transition-colors"
                                    >
                                        Save & Connect
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* What is an API key? */}
                        <button
                            onClick={() => setShowApiKeyExplain(v => !v)}
                            className="flex items-center gap-1 text-xs text-th-muted hover:text-th-secondary transition-colors"
                        >
                            {showApiKeyExplain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            What is an API key?
                        </button>
                        {showApiKeyExplain && (
                            <p className="text-xs text-th-muted leading-relaxed">
                                An API key is a secret code that lets this app communicate with an AI service. It's like a password — keep it private. The key is stored only on your device and used directly from your browser; it's never sent to any server other than the AI provider.
                            </p>
                        )}
                    </motion.div>
                )}

                {messages.length === 0 && !showOnboarding && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                        <Sparkles className="w-8 h-8 text-emerald-400" />
                        <p className="text-th-secondary text-center text-sm max-w-[220px]">
                            Tell me what you ate, ask about your nutrition, or log your weight.
                        </p>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map(msg => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                            {msg.role === 'user' ? (
                                <div className="bg-emerald-500/20 border border-emerald-500/30 text-th-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
                                    {msg.imagePreview && (
                                        <img
                                            src={msg.imagePreview}
                                            className="rounded-lg mb-2 max-h-48 w-full object-cover"
                                            alt="nutrition label"
                                        />
                                    )}
                                    {msg.text && msg.text}
                                </div>
                            ) : msg.type === 'meal' && msg.mealData ? (
                                <div className="bg-surface2 border border-th-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="text-sm font-semibold text-th-primary">{msg.mealData.food}</span>
                                    </div>

                                    {editingMsgId !== msg.id && (
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            {[
                                                { label: 'Cal', val: msg.mealData.calories, unit: '' },
                                                { label: 'Pro', val: msg.mealData.protein, unit: 'g' },
                                                { label: 'Carb', val: msg.mealData.carbs, unit: 'g' },
                                                { label: 'Fiber', val: msg.mealData.fiber, unit: 'g' },
                                            ].map(m => (
                                                <div key={m.label}>
                                                    <p className="text-xs text-th-muted">{m.label}</p>
                                                    <p className="text-sm font-bold text-th-secondary">{m.val}{m.unit}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {editingMsgId === msg.id && draftMacros && (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                {([
                                                    { key: 'calories', label: 'Calories' },
                                                    { key: 'protein',  label: 'Protein (g)' },
                                                    { key: 'fat',      label: 'Fat (g)' },
                                                    { key: 'carbs',    label: 'Carbs (g)' },
                                                    { key: 'fiber',    label: 'Fiber (g)' },
                                                ] as const).map(({ key, label }) => (
                                                    <div key={key}>
                                                        <p className="text-xs text-th-muted mb-0.5">{label}</p>
                                                        <input
                                                            type="number"
                                                            value={draftMacros[key]}
                                                            onChange={e => setDraftMacros(prev =>
                                                                prev ? { ...prev, [key]: parseInt(e.target.value) || 0 } : prev
                                                            )}
                                                            className="w-full bg-surface2 border border-th-border-strong rounded-lg px-2 py-1 text-th-primary text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveMacros(msg.id, msg.mealId!)}
                                                    className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-zinc-900 text-xs font-semibold transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => { setEditingMsgId(null); setDraftMacros(null); }}
                                                    className="flex-1 py-1.5 bg-surface2 hover:bg-surface rounded-lg text-th-secondary text-xs transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {editingMsgId !== msg.id && msg.mealId && (
                                        <button
                                            onClick={() => {
                                                setEditingMsgId(msg.id);
                                                setDraftMacros({
                                                    calories: msg.mealData!.calories,
                                                    protein:  msg.mealData!.protein,
                                                    fat:      msg.mealData!.fat ?? 0,
                                                    carbs:    msg.mealData!.carbs,
                                                    fiber:    msg.mealData!.fiber,
                                                });
                                            }}
                                            className="mt-2 flex items-center gap-1 text-xs text-th-faint hover:text-th-secondary transition-colors"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Edit macros
                                        </button>
                                    )}
                                </div>
                            ) : msg.type === 'favourite_saved' ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-400 shrink-0" />
                                    <p className="text-sm text-amber-200">{msg.text}</p>
                                </div>
                            ) : msg.type === 'weight' ? (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                                    <p className="text-sm text-blue-200">{msg.text}</p>
                                </div>
                            ) : msg.type === 'barcode_found' && msg.barcodeProduct ? (
                                <div className="bg-surface2 border border-th-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Barcode className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="text-sm font-semibold text-th-primary leading-tight">
                                            {[msg.barcodeProduct.brand, msg.barcodeProduct.name].filter(Boolean).join(' – ') || 'Scanned product'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-th-muted mb-2">Per 100g</p>
                                    <div className="grid grid-cols-4 gap-2 text-center mb-3">
                                        {[
                                            { label: 'Cal', val: msg.barcodeProduct.per100kcal },
                                            { label: 'Pro', val: msg.barcodeProduct.per100protein },
                                            { label: 'Carb', val: msg.barcodeProduct.per100carbs },
                                            { label: 'Fat', val: msg.barcodeProduct.per100fat },
                                        ].map(m => (
                                            <div key={m.label}>
                                                <p className="text-xs text-th-muted">{m.label}</p>
                                                <p className="text-sm font-bold text-th-secondary">{m.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-th-muted">Now type how much you had (e.g. 200g)</p>
                                </div>
                            ) : msg.type === 'error' ? (
                                msg.text.startsWith('invalid_key_') ? (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-300">
                                                {(() => {
                                                    const p = msg.text.replace('invalid_key_', '');
                                                    const name = p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : 'Groq';
                                                    return `You're using ${name} — please enter a valid ${name} API key in Settings.`;
                                                })()}
                                            </p>
                                        </div>
                                        <button onClick={() => navigate('/settings')} className="text-xs text-red-400 underline mt-1 ml-6">
                                            Go to Settings →
                                        </button>
                                    </div>
                                ) : msg.text === 'add_api_key' || msg.text === 'qty_needs_key' ? (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-300">
                                                {msg.text === 'qty_needs_key'
                                                    ? "I found that food, but couldn't work out the quantity. Try something like \"150g\" or \"2 pieces\" — or add an API key for natural language."
                                                    : "My database doesn't cover that. Add an API key in Settings to log anything via AI."}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/settings')}
                                            className="text-xs text-red-400 underline mt-1 ml-6"
                                        >
                                            Go to Settings →
                                        </button>
                                    </div>
                                ) : msg.text === 'hosted_limit_exceeded' ? (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-300">
                                                You've used your free AI requests for today. Add your own API key in Settings to continue.
                                            </p>
                                        </div>
                                        <button onClick={() => navigate('/settings')} className="text-xs text-red-400 underline mt-1 ml-6">
                                            Go to Settings →
                                        </button>
                                    </div>
                                ) : msg.text === 'sign_in_for_hosted_key' ? (
                                    <div className="bg-surface2 border border-th-border-strong rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                        <div className="flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <p className="text-sm text-th-secondary">
                                                Sign in with Google for free daily AI requests — no API key needed.
                                            </p>
                                        </div>
                                        <button onClick={signIn} className="text-xs text-emerald-400 underline mt-1 ml-6">
                                            Sign in →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-300">{msg.text}</p>
                                    </div>
                                )
                            ) : (
                                <div className="bg-surface2 border border-th-border text-th-primary rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
                                    {msg.text}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isProcessing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-surface2 border border-th-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </motion.div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="pb-20 pt-2">
                {/* Hidden file input for camera/gallery */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelect}
                />
                <div className="flex items-end gap-2 bg-surface2 border border-th-border-strong rounded-2xl px-3 py-2">
                    {/* Choices button — double gear */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowChoicesMenu(v => !v)}
                            className={clsx(
                                'relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all',
                                (pendingImage || pendingBarcode)
                                    ? 'bg-emerald-500/15 border border-emerald-500/60'
                                    : 'bg-background/60 border border-th-border'
                            )}
                            title="More options"
                        >
                            <Menu className={clsx('w-4 h-4', (pendingImage || pendingBarcode) ? 'text-emerald-400' : 'text-th-secondary')} />
                            <span className={clsx(
                                'absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                                (pendingImage || pendingBarcode)
                                    ? 'bg-emerald-500 border-emerald-400'
                                    : 'bg-surface border-th-border'
                            )}>
                                <Plus className={clsx('w-2 h-2', (pendingImage || pendingBarcode) ? 'text-zinc-900' : 'text-th-secondary')} />
                            </span>
                        </button>
                        {showChoicesMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => { setShowChoicesMenu(false); setShowWaterPicker(false); }} />
                                <div className="absolute bottom-full left-0 mb-2 z-50 bg-surface border border-th-border-strong rounded-2xl shadow-xl overflow-hidden min-w-[200px]">
                                    <button
                                        onClick={() => { setShowFavourites(true); setShowChoicesMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-th-primary hover:bg-surface2 transition-colors"
                                    >
                                        <Star className="w-4 h-4 text-amber-400 shrink-0" />
                                        Saved meals
                                    </button>
                                    <button
                                        onClick={() => { setShowRecipes(true); setShowChoicesMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-th-primary hover:bg-surface2 transition-colors border-t border-th-border"
                                    >
                                        <ChefHat className="w-4 h-4 text-emerald-400 shrink-0" />
                                        Recipes
                                    </button>
                                    <button
                                        onClick={() => { fileInputRef.current?.click(); setShowChoicesMenu(false); }}
                                        className={clsx(
                                            'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-t border-th-border',
                                            pendingImage ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15' : 'text-th-primary hover:bg-surface2'
                                        )}
                                    >
                                        <Camera className={`w-4 h-4 shrink-0 ${pendingImage ? 'text-emerald-400' : 'text-th-secondary'}`} />
                                        Scan nutrition label
                                        {pendingImage && <span className="ml-auto text-xs font-medium text-emerald-400">ready</span>}
                                    </button>
                                    <button
                                        onClick={() => { setShowBarcodeScanner(true); setShowChoicesMenu(false); }}
                                        className={clsx(
                                            'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-t border-th-border',
                                            pendingBarcode ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15' : 'text-th-primary hover:bg-surface2'
                                        )}
                                    >
                                        <Barcode className={`w-4 h-4 shrink-0 ${pendingBarcode ? 'text-emerald-400' : 'text-th-secondary'}`} />
                                        Scan barcode
                                        {pendingBarcode && <span className="ml-auto text-xs font-medium text-emerald-400">ready</span>}
                                    </button>
                                    {/* Water */}
                                    <div className="border-t border-th-border">
                                        <button
                                            onClick={() => setShowWaterPicker(v => !v)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-th-primary hover:bg-surface2 transition-colors"
                                        >
                                            <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                                            Log water
                                            <ChevronDown className={clsx('w-3.5 h-3.5 ml-auto text-th-faint transition-transform', showWaterPicker && 'rotate-180')} />
                                        </button>
                                        {showWaterPicker && (
                                            <div className="flex gap-2 px-4 pb-3">
                                                {[250, 500, 750, 1000].map(ml => (
                                                    <button
                                                        key={ml}
                                                        onClick={() => handleLogWater(ml)}
                                                        className="flex-1 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-xs font-medium text-blue-300 active:scale-95 transition-transform"
                                                    >
                                                        {ml >= 1000 ? '1L' : `${ml}`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            pendingBarcode ? 'How much did you have? (e.g. 200g)'
                            : pendingImage ? 'How much did you have? (e.g. 250ml, 2 glasses)'
                            : 'e.g. had a medium bowl of dal...'
                        }
                        disabled={isProcessing}
                        rows={1}
                        className="flex-1 bg-transparent text-th-primary placeholder:text-th-faint focus:outline-none resize-none text-sm py-1 max-h-28 disabled:opacity-50"
                        style={{ scrollbarWidth: 'none' }}
                    />
                    <div className="flex gap-1 items-center shrink-0">
                        <button
                            onClick={handleMicClick}
                            disabled={isProcessing}
                            className={clsx(
                                'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                                isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-th-muted hover:text-th-secondary'
                            )}
                        >
                            <Mic className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isProcessing}
                            className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100"
                        >
                            <Send className="w-4 h-4 text-zinc-900" />
                        </button>
                    </div>
                </div>
            </div>

            <FavouritesPanel
                open={showFavourites}
                onClose={() => setShowFavourites(false)}
                onLogFavourite={handleLogFavourite}
            />

            <RecipesPanel
                open={showRecipes}
                onClose={() => setShowRecipes(false)}
            />

            <AnimatePresence>
                {showBarcodeScanner && (
                    <BarcodeScanner
                        onDetected={handleBarcodeDetected}
                        onClose={() => setShowBarcodeScanner(false)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};
