import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    analyser?: AnalyserNode | null;
    isRecording: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isRecording }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!isRecording || !analyser || !canvasRef.current) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = 4;
            const gap = 2;
            const barCount = Math.floor(canvas.width / (barWidth + gap));

            // We'll use the lower frequency part mostly as it has more energy for voice
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                // Get average value for this bar's frequency range
                let value = 0;
                for (let j = 0; j < step; j++) {
                    value += dataArray[i * step + j];
                }
                value = value / step;

                // Scale value to canvas height
                const barHeight = (value / 255) * canvas.height;

                // Color gradient
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#f59e0b'); // Gold
                gradient.addColorStop(1, '#9f1239'); // Crimson

                ctx.fillStyle = gradient;

                // Draw rounded bar
                // Centered vertically
                const y = (canvas.height - barHeight) / 2;

                // Draw rect
                ctx.fillRect(i * (barWidth + gap), y, barWidth, barHeight);
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isRecording]);

    return (
        <canvas
            ref={canvasRef}
            width={200}
            height={40}
            className="w-full h-full"
        />
    );
};

export default AudioVisualizer;
