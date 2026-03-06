import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Sparkles, CheckCircle, AlertCircle, Star, Lightbulb, ChefHat, Camera, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import canvasConfetti from 'canvas-confetti';
import { processInput, getMealSuggestion, processLabelImage } from '../lib/ai-parser';
import { useMeals } from '../hooks/useMeals';
import { useSettings } from '../hooks/useSettings';
import { addFavourite, addWeight, getAllFavourites, getAllRecipes, saveSetting, type Favourite } from '../lib/db';
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
    type?: 'meal' | 'chat' | 'error' | 'suggestion' | 'weight' | 'favourite_saved';
    mealData?: { food: string; calories: number; protein: number; carbs: number; fiber: number };
    imagePreview?: string;
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
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        date: format(new Date(), 'yyyy-MM-dd'),
        messages,
    }));
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
    const [hasSuggested, setHasSuggested] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);

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
            fireConfetti();
            addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData });
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

    const triggerSuggestion = async () => {
        if (hasSuggested) return;
        setHasSuggested(true);
        const suggestion = await getMealSuggestion();
        if (suggestion) {
            addMsg({ role: 'assistant', type: 'suggestion', text: suggestion });
        }
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

        const result = pendingImage
            ? await processLabelImage(pendingImage.base64, pendingImage.mimeType, text)
            : await processInput(text);
        setPendingImage(null);

        if (result.type === 'meal') {
            await addMeal(text, result.data);
            fireConfetti();
            addMsg({
                role: 'assistant', type: 'meal', text: 'Logged!',
                mealData: result.data,
            });
            triggerSuggestion();
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
                if (window.confirm(`Log "${fav.name}" as a meal?`)) {
                    await addMeal(fav.content, fav.parsed[0]);
                    fireConfetti();
                    addMsg({
                        role: 'assistant', type: 'meal', text: `Logged favourite "${fav.name}"!`,
                        mealData: fav.parsed[0],
                    });
                }
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
                fireConfetti();
                addMsg({ role: 'assistant', type: 'meal', text: 'Logged!', mealData });
                triggerSuggestion();
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

        setIsProcessing(false);
    };

    const handleLogFavourite = async (fav: Favourite) => {
        await addMeal(fav.content, fav.parsed[0]);
        await refreshMeals();
        fireConfetti();
        addMsg({
            role: 'assistant', type: 'meal', text: `Logged favourite "${fav.name}"!`,
            mealData: fav.parsed[0],
        });
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

    const fireConfetti = () => {
        const end = Date.now() + 1500;
        (function frame() {
            canvasConfetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#34d399', '#fff'] });
            canvasConfetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#34d399', '#fff'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
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

                {/* Onboarding banner */}
                {showOnboarding && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-800/90 border border-white/10 rounded-2xl p-4 space-y-3"
                    >
                        <div>
                            <p className="text-sm font-semibold text-zinc-200">Connect an AI to unlock smart logging</p>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                An API key lets the app understand natural food descriptions. Without one, you can still log common foods — but chatting, saving favourites, and recognising unknown foods requires AI.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {/* Option 1: OpenAI / Groq */}
                            <button
                                onClick={() => setOnboardingExpand(v => v === 'openai-groq' ? null : 'openai-groq')}
                                className="w-full flex items-center justify-between bg-zinc-700/50 hover:bg-zinc-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition-colors"
                            >
                                <span>I have an OpenAI / Groq subscription</span>
                                {onboardingExpand === 'openai-groq' ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                            </button>
                            {onboardingExpand === 'openai-groq' && (
                                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-1">
                                        {(['openai', 'groq'] as const).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setOnboardingProvider(p)}
                                                className={clsx(
                                                    'py-2 rounded-lg text-xs font-medium transition-all',
                                                    onboardingProvider === p
                                                        ? 'bg-emerald-500 text-zinc-900'
                                                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
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
                                className="w-full flex items-center justify-between bg-zinc-700/50 hover:bg-zinc-700 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition-colors"
                            >
                                <span>Get a free key from Google AI Studio</span>
                                {onboardingExpand === 'gemini' ? <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                            </button>
                            {onboardingExpand === 'gemini' && (
                                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 space-y-3">
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
                                        className="w-full bg-zinc-800 border border-white/10 rounded-xl p-2.5 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
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
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                            {showApiKeyExplain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            What is an API key?
                        </button>
                        {showApiKeyExplain && (
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                An API key is a secret code that lets this app communicate with an AI service. It's like a password — keep it private. The key is stored only on your device and used directly from your browser; it's never sent to any server other than the AI provider.
                            </p>
                        )}
                    </motion.div>
                )}

                {messages.length === 0 && !showOnboarding && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                        <Sparkles className="w-8 h-8 text-emerald-400" />
                        <p className="text-zinc-400 text-center text-sm max-w-[220px]">
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
                                <div className="bg-emerald-500/20 border border-emerald-500/30 text-zinc-200 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
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
                                <div className="bg-zinc-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="text-sm font-semibold text-zinc-200">{msg.mealData.food}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        {[
                                            { label: 'Cal', val: msg.mealData.calories, unit: '' },
                                            { label: 'Pro', val: msg.mealData.protein, unit: 'g' },
                                            { label: 'Carb', val: msg.mealData.carbs, unit: 'g' },
                                            { label: 'Fiber', val: msg.mealData.fiber, unit: 'g' },
                                        ].map(m => (
                                            <div key={m.label}>
                                                <p className="text-xs text-zinc-500">{m.label}</p>
                                                <p className="text-sm font-bold text-zinc-300">{m.val}{m.unit}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : msg.type === 'suggestion' ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] flex items-start gap-2">
                                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-200 leading-relaxed">{msg.text}</p>
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
                                                You've used your 30 free AI requests today. Add your own API key in Settings to continue.
                                            </p>
                                        </div>
                                        <button onClick={() => navigate('/settings')} className="text-xs text-red-400 underline mt-1 ml-6">
                                            Go to Settings →
                                        </button>
                                    </div>
                                ) : msg.text === 'sign_in_for_hosted_key' ? (
                                    <div className="bg-zinc-800 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                                        <div className="flex items-start gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <p className="text-sm text-zinc-300">
                                                Sign in with Google for 30 free AI requests/day — no API key needed.
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
                                <div className="bg-zinc-800 border border-white/5 text-zinc-200 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
                                    {msg.text}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isProcessing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="bg-zinc-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
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
                <div className="flex items-end gap-2 bg-zinc-800 border border-white/10 rounded-2xl px-3 py-2">
                    <button
                        onClick={() => setShowFavourites(true)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-400/60 hover:text-amber-400 transition-colors shrink-0"
                    >
                        <Star className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowRecipes(true)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400/60 hover:text-emerald-400 transition-colors shrink-0"
                    >
                        <ChefHat className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className={clsx(
                            'w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0',
                            pendingImage
                                ? 'text-emerald-400'
                                : 'text-zinc-400/60 hover:text-zinc-300'
                        )}
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pendingImage ? 'How much did you have? (e.g. 250ml, 2 glasses)' : 'e.g. had a medium bowl of dal...'}
                        disabled={isProcessing}
                        rows={1}
                        className="flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none text-sm py-1 max-h-28 disabled:opacity-50"
                        style={{ scrollbarWidth: 'none' }}
                    />
                    <div className="flex gap-1 items-center shrink-0">
                        <button
                            onClick={handleMicClick}
                            disabled={isProcessing}
                            className={clsx(
                                'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                                isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'
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
        </motion.div>
    );
};
