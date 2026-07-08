let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio(): void {
  // Browsers require a user gesture before playing audio. Called from a button.
  const c = getCtx();
  if (c && c.state === "suspended") {
    void c.resume();
  }
}

export function playSiren(durationMs = 2400): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const stopAt = now + durationMs / 1000;

  const oscA = c.createOscillator();
  const oscB = c.createOscillator();
  const gain = c.createGain();

  oscA.type = "sawtooth";
  oscB.type = "square";
  oscA.frequency.setValueAtTime(660, now);
  oscB.frequency.setValueAtTime(880, now);

  // LFO that sweeps the two tones for a siren feel.
  const lfo = c.createOscillator();
  lfo.frequency.setValueAtTime(0.55, now);
  const lfoGain = c.createGain();
  lfoGain.gain.setValueAtTime(120, now);
  lfo.connect(lfoGain);
  lfoGain.connect(oscA.frequency);
  lfoGain.connect(oscB.frequency);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
  gain.gain.setValueAtTime(0.18, stopAt - 0.1);
  gain.gain.linearRampToValueAtTime(0, stopAt);

  oscA.connect(gain);
  oscB.connect(gain);
  gain.connect(c.destination);

  oscA.start(now);
  oscB.start(now);
  lfo.start(now);
  oscA.stop(stopAt);
  oscB.stop(stopAt);
  lfo.stop(stopAt);
}

export function stopAudio(): void {
  if (ctx) {
    void ctx.suspend();
  }
}
