import React, { useState, useEffect, useRef } from 'react';
import { Timer, EyeOff, Lock } from 'lucide-react';

interface EphemeralMomentProps {
    imageUrl: string;
    onReveal?: () => void;
    onExpire?: () => void;
    isExpired?: boolean;
}

const EphemeralMoment: React.FC<EphemeralMomentProps> = ({ imageUrl, onReveal, onExpire, isExpired: initialIsExpired }) => {
    const [revealed, setRevealed] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);
    const [isExpired, setIsExpired] = useState(initialIsExpired || false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (!isExpired && canvasRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size to match container
            const resize = () => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    canvas.width = rect.width;
                    canvas.height = rect.height;

                    // Fill with "frosted glass" style
                    ctx.fillStyle = '#171717'; // Dark neutral
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Add some "frost" texture or text
                    ctx.font = '14px serif';
                    ctx.fillStyle = '#404040';
                    ctx.textAlign = 'center';
                    ctx.fillText('GRATTA PER RIVELARE', canvas.width / 2, canvas.height / 2);
                }
            };

            resize();
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }
    }, [isExpired]);

    useEffect(() => {
        if (revealed && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsExpired(true);
                        if (onExpire) onExpire();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [revealed, timeLeft, onExpire]);

    const handleScratch = (e: React.MouseEvent | React.TouchEvent) => {
        if (isExpired) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = (e as React.MouseEvent).clientX - rect.left;
            y = (e as React.MouseEvent).clientY - rect.top;
        }

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();

        if (!revealed) {
            setRevealed(true);
            if (onReveal) onReveal();
        }
    };

    if (isExpired) {
        return (
            <div className="relative w-full aspect-square md:aspect-video bg-neutral-900 rounded-lg flex flex-col items-center justify-center border border-neutral-800 border-dashed groupoverflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-crimson-900/10 via-transparent to-transparent opacity-50" />
                <EyeOff className="w-12 h-12 text-neutral-700 mb-3" />
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Istante Dissolto</p>
                <span className="text-[10px] text-neutral-800 mt-2">I 10 secondi sono scaduti</span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative w-full aspect-square md:aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-2xl group cursor-crosshair">
            {/* The actual image */}
            <img
                src={imageUrl}
                className="w-full h-full object-cover select-none pointer-events-none"
                alt="Ephemeral Moment"
            />

            {/* The Scratch Canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 touch-none transition-opacity duration-500"
                onMouseDown={() => setIsDrawing(true)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onMouseMove={(e) => isDrawing && handleScratch(e)}
                onTouchStart={() => setIsDrawing(true)}
                onTouchEnd={() => setIsDrawing(false)}
                onTouchMove={(e) => isDrawing && handleScratch(e)}
                style={{ filter: 'blur(2px)' }}
            />

            {/* UI Overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                    <Timer className={`w-3 h-3 ${revealed ? 'text-crimson-500 animate-pulse' : 'text-neutral-400'}`} />
                    <span className="text-[10px] font-mono font-bold text-white">{timeLeft}s</span>
                </div>
            </div>

            {!revealed && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-crimson-900/80 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                        <Lock className="w-3 h-3" /> Gratta l'Oscurità
                    </div>
                </div>
            )}
        </div>
    );
};

export default EphemeralMoment;
