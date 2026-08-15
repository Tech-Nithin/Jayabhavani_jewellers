/**
 * Web Audio API Custom Notification Chime for Jaya Bhavani Jewellers (JBJ)
 * Plays a clean, pleasant 2-tone chime for incoming messages without relying on external MP3 files.
 */

let audioCtx: AudioContext | null = null;

export function playJbjNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tone 1: High crisp chime (880Hz - A5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Warm harmonic resonance (1320Hz - E6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Could not play JBJ notification chime:', e);
  }
}
