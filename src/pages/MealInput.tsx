import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import canvasConfetti from 'canvas-confetti';
import { processInput } from '../lib/ai-parser';
import { useMeals } from '../hooks/useMeals';
import clsx from 'clsx';

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    type?: 'meal' | 'chat' | 'error';
    mealData?: {
        food: string;
        calories: number;
        protein: number;
        carbs: number;
        fiber: number;
    };
}

export const MealInput = () => {
    const { addMeal } = useMeals();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    let msgId = useRef(0);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleMicClick = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Voice input is not supported in this browser.');
            return;
        }
        if (isListening) { setIsListening(false); return; }

        setIsListening(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isProcessing) return;

        setInput('');
        setIsProcessing(true);

        const userMsg: ChatMessage = { id: ++msgId.current, role: 'user', text };
        setMessages(prev => [...prev, userMsg]);

        const result = await processInput(text);

        if (result.type === 'meal') {
            await addMeal(text, result.data);
            fireConfetti();
            const assistantMsg: ChatMessage = {
                id: ++msgId.current,
                role: 'assistant',
                type: 'meal',
                text: `Logged!`,
                mealData: result.data,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } else if (result.type === 'chat') {
            setMessages(prev => [...prev, {
                id: ++msgId.current,
                role: 'assistant',
                type: 'chat',
                text: result.message,
            }]);
        } else {
            setMessages(prev => [...prev, {
                id: ++msgId.current,
                role: 'assistant',
                type: 'error',
                text: result.message,
            }]);
        }

        setIsProcessing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const fireConfetti = () => {
        const end = Date.now() + 1500;
        (function frame() {
            canvasConfetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#34d399', '#fff'] });
            canvasConfetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#34d399', '#fff'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto px-4"
        >
            {/* Chat area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pb-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                        <Sparkles className="w-8 h-8 text-emerald-400" />
                        <p className="text-zinc-400 text-center text-sm max-w-[220px]">
                            Tell me what you ate, or ask anything about your nutrition.
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
                                    {msg.text}
                                </div>
                            ) : msg.type === 'meal' && msg.mealData ? (
                                <div className="bg-zinc-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="text-sm font-semibold text-zinc-200">{msg.mealData.food}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-zinc-500">Cal</p>
                                            <p className="text-sm font-bold text-emerald-400">{msg.mealData.calories}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Pro</p>
                                            <p className="text-sm font-bold text-zinc-300">{msg.mealData.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Carb</p>
                                            <p className="text-sm font-bold text-zinc-300">{msg.mealData.carbs}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Fiber</p>
                                            <p className="text-sm font-bold text-zinc-300">{msg.mealData.fiber}g</p>
                                        </div>
                                    </div>
                                </div>
                            ) : msg.type === 'error' ? (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%] flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300">{msg.text}</p>
                                </div>
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
                                <div
                                    key={i}
                                    className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="pb-20 pt-2">
                <div className="flex items-end gap-2 bg-zinc-800 border border-white/10 rounded-2xl px-3 py-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. had a medium bowl of dal and 2 rotis..."
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
        </motion.div>
    );
};
