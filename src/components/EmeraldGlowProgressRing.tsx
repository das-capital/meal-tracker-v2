import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    progress: number; // 0 to 100
    size?: number;
    color?: string;
    centerContent?: React.ReactNode;
}

export const EmeraldGlowProgressRing: React.FC<Props> = ({
    progress,
    size = 200,
    color = '#10b981',
    centerContent
}) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>

            {/* Background Glow Effect */}
            <div
                className="absolute inset-0 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: color }}
            />

            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-zinc-800"
                />

                {/* Progress */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} // Dynamic glow color
                />
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {centerContent ? centerContent : (
                    <>
                        <span className="text-4xl font-bold text-zinc-100">{Math.round(progress)}%</span>
                        <span className="text-xs text-zinc-500 font-medium tracking-wide mt-1">DAILY GOAL</span>
                    </>
                )}
            </div>
        </div>
    );
};
