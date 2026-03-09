import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface Props {
    onDetected: (barcode: string) => void;
    onClose: () => void;
}

export const BarcodeScanner = ({ onDetected, onClose }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const detectedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const reader = new BrowserMultiFormatReader();
        reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err, controls) => {
            controlsRef.current = controls;
            if (result && !detectedRef.current) {
                detectedRef.current = true;
                controls.stop();
                onDetected(result.getText());
            }
            if (err) {
                // NotFoundException fires on every frame with no barcode — ignore it
                if (err.name !== 'NotFoundException') {
                    const msg = err.message ?? '';
                    if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                        setError('Camera permission denied. Please allow camera access and try again.');
                    } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                        setError('No camera found on this device.');
                    } else if (!controlsRef.current) {
                        setError('Could not start camera. Please try again.');
                    }
                }
            }
        }).catch(e => {
            const msg = (e as Error).message ?? '';
            if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                setError('Camera permission denied. Please allow camera access and try again.');
            } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                setError('No camera found on this device.');
            } else {
                setError('Could not start camera. Please try again.');
            }
        });

        return () => {
            controlsRef.current?.stop();
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80"
        >
            <div className="fixed inset-0 z-[70] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 bg-black/60">
                    <h2 className="text-zinc-200 font-semibold text-base">Scan barcode</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Camera area */}
                <div className="flex-1 relative overflow-hidden">
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center px-8">
                            <p className="text-zinc-400 text-sm text-center leading-relaxed">{error}</p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                                autoPlay
                                muted
                                playsInline
                            />
                            {/* Viewfinder */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-72 h-44">
                                    {/* Corner brackets */}
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                                    {/* Scan line */}
                                    <div
                                        className="absolute left-0 right-0 h-0.5 bg-emerald-400 opacity-80"
                                        style={{ animation: 'scan 2s ease-in-out infinite' }}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 pb-16 pt-3 bg-black/60 text-center">
                    <p className="text-zinc-500 text-xs">Point camera at a food barcode</p>
                </div>
            </div>
        </motion.div>
    );
};
