import { AnimatePresence, motion } from 'framer-motion';

interface Props {
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal = ({ message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }: Props) => (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-8"
            onClick={onCancel}
        >
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-sm bg-surface border border-th-border-strong rounded-2xl p-5 flex flex-col gap-4"
                onClick={e => e.stopPropagation()}
            >
                <p className="text-sm text-th-primary text-center leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl bg-surface2 border border-th-border text-sm font-medium text-th-secondary active:scale-95 transition-transform"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform ${
                            danger ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
);
