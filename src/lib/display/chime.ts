// beeps through web audio. the context has to be created inside a tap for
// iOS to allow sound later, so callers make it with unlockAudio() on start.
export function unlockAudio(existing: AudioContext | null): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = existing ?? (Ctx ? new Ctx() : null);
    ctx?.resume().catch(() => {});
    return ctx;
  } catch {
    return existing;
  }
}

export function chime(ctx: AudioContext | null, beeps = 2) {
  try {
    navigator.vibrate?.(beeps > 1 ? [200, 100, 200] : [150]);
  } catch {}
  if (!ctx) return;
  try {
    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  } catch {}
}

type WakeLock = { release: () => Promise<void> };

export async function keepAwake(): Promise<WakeLock | null> {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLock> };
  };
  try {
    return (await nav.wakeLock?.request("screen")) ?? null;
  } catch {
    return null;
  }
}
