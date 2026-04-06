"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashOverlay({ show }) {
    const [phase, setPhase] = useState(show ? "enter" : "done");

    useEffect(() => {
        if (!show) return;

        const t1 = setTimeout(() => setPhase("visible"), 100);
        const t2 = setTimeout(() => setPhase("exit"), 2200);
        const t3 = setTimeout(() => {
            setPhase("done");
        }, 2900);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [show]);

    if (phase === "done") return null;

    /* Dot colors cycle through the rainbow palette */
    const dotColors = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#f43f5e"];

    return (
        <div className="ui-bg fixed inset-0 z-[100] flex items-center justify-center">
            {/* Animated blur orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="ui-blob absolute -left-32 top-1/4 h-80 w-80 bg-violet-300/35 blur-3xl" />
                <div className="ui-blob absolute -right-20 bottom-1/4 h-72 w-72 bg-sky-300/30 blur-3xl" style={{ animationDelay: "2s" }} />
                <div className="ui-blob absolute bottom-0 left-1/3 h-64 w-64 bg-emerald-300/25 blur-3xl" style={{ animationDelay: "1s" }} />
                <div className="ui-blob absolute right-1/4 top-10 h-56 w-56 bg-pink-300/20 blur-3xl" style={{ animationDelay: "3s" }} />
            </div>

            {/* Rainbow top bar */}
            <div className="ui-rainbow-bar absolute top-0 left-0 right-0 h-1" />

            <div
                className="flex flex-col items-center gap-6 transition-all duration-700"
                style={{
                    opacity: phase === "visible" ? 1 : 0,
                    transform:
                        phase === "enter"
                            ? "scale(0.82)"
                            : phase === "exit"
                                ? "scale(1.10)"
                                : "scale(1)",
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                {/* Glowing ring around logo */}
                <div className="relative">
                    <div className="ui-pulse-glow absolute inset-0 rounded-full" />
                    <div className="ui-float relative z-10 rounded-full bg-white/60 p-4 shadow-xl ring-2 ring-violet-200 backdrop-blur-sm">
                        <Image
                            src="/coconut-tree.svg"
                            alt="GovTrack"
                            width={80}
                            height={80}
                            priority
                        />
                    </div>
                </div>

                <h1 className="ui-gradient-text text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
                    GovTrack
                </h1>

                <p className="text-sm font-semibold tracking-wide text-slate-500">
                    Smart Civic Issue Reporting
                </p>

                {/* Rainbow loading dots */}
                <div className="mt-1 flex gap-2">
                    {dotColors.map((color, i) => (
                        <span
                            key={i}
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                                backgroundColor: color,
                                animation: "pulse 1.3s ease-in-out infinite",
                                animationDelay: `${i * 0.18}s`,
                                boxShadow: `0 0 8px ${color}99`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
