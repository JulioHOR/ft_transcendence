let voiceSource: MediaStream | null = null;

export async function startMic(): Promise<void> {
    voiceSource = await navigator.mediaDevices.getUserMedia({ audio: true });
}