import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    duration?: number; // duration in seconds
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration: initialDuration }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [waveform, setWaveform] = useState<number[]>([]);

    useEffect(() => {
        // Generate a random waveform fingerprint to simulate the file structure
        // In a real production app we would verify the peaks from the file, but this is a visual approximation
        const bars = 44; // Number of bars
        const newWaveform = Array.from({ length: bars }, () => Math.random() * 0.7 + 0.3); // Heights 30-100%
        setWaveform(newWaveform);
    }, []);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent message click events
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            // Pause all other audios? (Optional)
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && !initialDuration) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const seek = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Clamp 0-1
        let pct = Math.max(0, Math.min(1, x / width));

        const newTime = pct * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 w-full bg-neutral-950/40 p-2 rounded-xl border border-white/5 backdrop-blur-sm min-w-[240px]">
            {/* Play Button */}
            <button
                onClick={togglePlay}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 ${isPlaying
                        ? 'bg-crimson-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    }`}
            >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>

            <div className="flex-1 flex flex-col justify-center h-full gap-1.5 select-none relative">
                {/* Visual Waveform / Seeker */}
                <div
                    className="h-8 flex items-center gap-[2px] w-full cursor-pointer relative group"
                    onClick={seek}
                    title="Clicca per saltare"
                >
                    {waveform.map((height, i) => {
                        // Calculate if this bar is "played"
                        const barPercent = (i / waveform.length) * 100;
                        const isPlayed = barPercent <= progressPercent;

                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-colors duration-200 ${isPlayed
                                        ? 'bg-gradient-to-t from-gold-600 to-gold-400 shadow-[0_0_5px_rgba(234,179,8,0.3)]'
                                        : 'bg-neutral-700 group-hover:bg-neutral-600'
                                    }`}
                                style={{
                                    height: `${height * 100}%`,
                                    minWidth: '2px',
                                    opacity: isPlayed ? 1 : 0.6
                                }}
                            />
                        );
                    })}
                </div>

                {/* Time */}
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono px-0.5">
                    <span className={isPlaying ? 'text-gold-500 font-bold' : ''}>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                preload="metadata"
                className="hidden"
                crossOrigin="anonymous"
            />
        </div>
    );
};

export default AudioPlayer;
