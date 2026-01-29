
// Utility to encode AudioBuffer to WAV format
export const encodeWAV = (samples: Float32Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // REST of the WAV header...
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write PCM samples
    floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
};

// Helper class to capture audio using AudioContext (works everywhere)
export class AudioRecorder {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private scriptProcessor: ScriptProcessorNode | null = null;
    private audioInput: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private chunks: Float32Array[] = [];
    private recordingLength = 0;
    private sampleRate = 0;
    private isRecording = false;

    async start(): Promise<void> {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.sampleRate = this.audioContext.sampleRate;
        this.chunks = [];
        this.recordingLength = 0;

        // Create analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        // Create a script processor node to intercept audio samples
        // Buffer size 4096 is a good balance between latency and performance
        this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);

        // Connect graph: Input -> Analyser -> ScriptProcessor -> Destination
        this.audioInput.connect(this.analyser);
        this.analyser.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);

        this.scriptProcessor.onaudioprocess = (e) => {
            if (!this.isRecording) return;
            const channelData = e.inputBuffer.getChannelData(0);
            // Clone the data because the buffer is reused
            const newBuffer = new Float32Array(channelData);
            this.chunks.push(newBuffer);
            this.recordingLength += newBuffer.length;
        };

        this.isRecording = true;
    }

    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }


    stop(): Promise<Blob> {
        return new Promise((resolve) => {
            this.isRecording = false;

            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            if (this.audioInput) {
                this.audioInput.disconnect();
                this.audioInput = null;
            }
            if (this.scriptProcessor) {
                this.scriptProcessor.disconnect();
                this.scriptProcessor = null;
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }

            // Merge chunks
            const mergedBuffer = new Float32Array(this.recordingLength);
            let offset = 0;
            for (const chunk of this.chunks) {
                mergedBuffer.set(chunk, offset);
                offset += chunk.length;
            }

            const wavBlob = encodeWAV(mergedBuffer, this.sampleRate);
            resolve(wavBlob);
        });
    }

    cancel() {
        this.isRecording = false;
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.chunks = [];
        this.recordingLength = 0;
    }
}
