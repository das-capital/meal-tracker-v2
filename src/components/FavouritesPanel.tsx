import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Star, Edit2, Check } from 'lucide-react';
import { getAllFavourites, deleteFavourite, updateFavourite, type Favourite } from '../lib/db';

interface Props {
    open: boolean;
    onClose: () => void;
    onLogFavourite: (fav: Favourite) => void;
}

export const FavouritesPanel = ({ open, onClose, onLogFavourite }: Props) => {
    const [favourites, setFavourites] = useState<Favourite[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const load = async () => {
        const favs = await getAllFavourites();
        setFavourites(favs);
    };

    useEffect(() => { if (open) load(); }, [open]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Delete this favourite?')) {
            await deleteFavourite(id);
            load();
        }
    };

    const handleLog = (fav: Favourite) => {
        if (window.confirm(`Log "${fav.name}" as a meal?`)) {
            onLogFavourite(fav);
            onClose();
        }
    };

    const startEdit = (fav: Favourite) => {
        setEditingId(fav.id!);
        setEditName(fav.name);
    };

    const saveEdit = async (fav: Favourite) => {
        if (editName.trim() && editName !== fav.name) {
            await updateFavourite({ ...fav, name: editName.trim() });
            load();
        }
        setEditingId(null);
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-3xl z-50 max-h-[70vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-400" />
                                <h2 className="text-lg font-semibold text-zinc-100">Favourites</h2>
                            </div>
                            <button onClick={onClose} className="p-1 text-zinc-500 active:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {favourites.length === 0 ? (
                                <p className="text-center text-zinc-600 text-sm py-8">
                                    No favourites yet. Type "save as favourite breakfast one" after logging a meal.
                                </p>
                            ) : (
                                favourites.map(fav => (
                                    <div key={fav.id} className="bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <button
                                            onClick={() => handleLog(fav)}
                                            className="flex-1 min-w-0 text-left"
                                        >
                                            {editingId === fav.id ? (
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => e.key === 'Enter' && saveEdit(fav)}
                                                    className="bg-zinc-700 text-zinc-200 rounded px-2 py-1 text-sm w-full focus:outline-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    <p className="text-zinc-200 text-sm font-medium truncate">{fav.name}</p>
                                                    <p className="text-xs text-zinc-500 truncate">
                                                        {fav.parsed[0]?.food} · {fav.totalCalories} kcal · {fav.parsed[0]?.protein}g P
                                                    </p>
                                                </>
                                            )}
                                        </button>
                                        <div className="flex gap-1 shrink-0">
                                            {editingId === fav.id ? (
                                                <button onClick={() => saveEdit(fav)} className="p-1.5 text-emerald-400">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button onClick={() => startEdit(fav)} className="p-1.5 text-zinc-600 active:text-zinc-300">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button onClick={() => fav.id && handleDelete(fav.id)} className="p-1.5 text-zinc-600 active:text-red-400">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
