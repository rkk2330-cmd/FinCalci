// @ts-nocheck — TODO: add strict types
// FinCalci — Sound effects (Web Audio API)
type Ctx = AudioContext | null;

export const SFX = {
  _ctx: null as Ctx,
  _muted: false,
  _getCtx(): AudioContext | null {
    if (!this._ctx) try { this._ctx = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)(); } catch { return null; }
    if (this._ctx.state === "suspended") this._ctx.resume().catch(() => {});
    return this._ctx;
  },
  mute(v: boolean) { this._muted = v; },
  isMuted() { return this._muted; },
  tap() {
    if (this._muted) return;
    const ctx = this._getCtx(); if (!ctx) return;
    try {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
    } catch { /* silent */ }
  },
  ding() {
    if (this._muted) return;
    const ctx = this._getCtx(); if (!ctx) return;
    try {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } catch { /* silent */ }
  },
  chime() {
    if (this._muted) return;
    const ctx = this._getCtx(); if (!ctx) return;
    try {
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
        osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    } catch { /* silent */ }
  }
};
