/* ============================================================
   ÁUDIO REATIVO — Web Audio nativo, sem biblioteca
   Lê a trilha a cada frame e devolve 3 faixas (0–1) + kick.
   Funciona igual no modo 3D e no modo reserva.
   ============================================================ */

const BPM = 135;   // trilha de acid techno (prompt em audio/PROMPT-TRILHA.md)
export const BEAT = 60 / BPM;   // ≈ 0,4615 s
export const BAR = BEAT * 4;    // ≈ 1,846 s

export function createAudio(el) {
  let ctx, analyser, data, ready = false;

  // valores suavizados: sobem rápido (ataque), descem devagar (release)
  const out = { bass: 0, mid: 0, high: 0, level: 0, kick: 0 };
  let bassAvg = 0, lastKick = 0;

  function init() {
    if (ready) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(el);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    data = new Uint8Array(analyser.frequencyBinCount);
    ready = true;
  }

  // média de energia entre duas frequências (Hz), normalizada 0–1
  function band(lo, hi) {
    const hz = ctx.sampleRate / analyser.fftSize;
    const a = Math.max(1, Math.floor(lo / hz)), b = Math.min(data.length - 1, Math.ceil(hi / hz));
    let s = 0;
    for (let i = a; i <= b; i++) s += data[i];
    return s / ((b - a + 1) * 255);
  }

  const ease = (cur, target, up, down) => cur + (target - cur) * (target > cur ? up : down);

  function update(nowSec) {
    if (!ready || el.paused) {
      // sem música: tudo desce devagar até zero
      out.bass *= 0.92; out.mid *= 0.92; out.high *= 0.92; out.level *= 0.92; out.kick *= 0.85;
      return out;
    }
    analyser.getByteFrequencyData(data);
    const b = band(30, 140), m = band(400, 2000), h = band(4000, 12000);

    // realce: as faixas altas têm menos energia, então ganham mais ganho
    out.bass = ease(out.bass, Math.min(1, b * 1.25), 0.6, 0.12);
    out.mid = ease(out.mid, Math.min(1, m * 1.8), 0.5, 0.1);
    out.high = ease(out.high, Math.min(1, h * 3.2), 0.5, 0.1);
    out.level = (out.bass + out.mid + out.high) / 3;

    // kick: o grave salta acima da própria média recente
    bassAvg = bassAvg * 0.95 + b * 0.05;
    if (b > bassAvg * 1.25 && b > 0.35 && nowSec - lastKick > BEAT * 0.6) {
      lastKick = nowSec;
      out.kick = 1;
    } else {
      out.kick *= 0.86;
    }
    return out;
  }

  return {
    out,
    update,
    async play() { init(); if (ctx.state === 'suspended') await ctx.resume(); return el.play(); },
    pause() { el.pause(); },
    toggle() { return el.paused ? this.play() : this.pause(); },
    get playing() { return !el.paused; },
    get time() { return el.currentTime; },
  };
}
