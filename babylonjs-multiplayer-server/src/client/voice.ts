let voiceSource: MediaStream | null = null;

export async function startMic(): Promise<void> {
  if (voiceSource !== null) {
    return;
  }

  voiceSource = await navigator.mediaDevices.getUserMedia({ audio: true });
}
