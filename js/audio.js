/* ============================================================
   ÁUDIO REATIVO — Web Audio nativo, sem biblioteca
   Lê a trilha a cada frame e devolve 3 faixas (0–1) + kick.
   Funciona igual no modo 3D e no modo reserva.

   Trilha: "Squelching Acid" (dayubneto). Andamento e primeira batida
   medidos na própria faixa (136,635 BPM, constante do começo ao fim).
   O kick vem de um relógio preso ao tempo da música: num acid techno
   a 303 também ocupa o grave e confunde qualquer detector de batida.
   Trocou de música? Ajuste BPM e PRIMEIRA_BATIDA (ou BPM = 0 para
   voltar à detecção pelo grave).
   ============================================================ */

const BPM = 136.635;
const PRIMEIRA_BATIDA = 0.256;   // s: onde cai o 1º kick no arquivo
export const BEAT = 60 / BPM;    // ≈ 0,439 s
export const BAR = BEAT * 4;     // ≈ 1,757 s

export function createAudio(el) {
  let ctx, analyser, data, ready = false;

  // valores suavizados: sobem rápido (ataque), descem devagar (release)
  const out = { bass: 0, mid: 0, high: 0, level: 0, kick: 0 };
  let bassAvg = 0, lastKick = 0, ultimaBatida = -1;

  // faixa dinâmica de cada banda (piso e teto que se adaptam devagar):
  // música muito comprimida não fica "sempre no máximo"
  const faixa = { bass: { lo: 1, hi: 0 }, mid: { lo: 1, hi: 0 }, high: { lo: 1, hi: 0 } };
  function normaliza(k, v) {
    const f = faixa[k];
    f.hi = Math.max(v, f.hi * 0.998 + v * 0.002);
    f.lo = Math.min(v, f.lo * 0.998 + v * 0.002);
    return Math.max(0, Math.min(1, (v - f.lo) / (f.hi - f.lo + 0.04)));
  }

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

    out.bass = ease(out.bass, normaliza('bass', b), 0.6, 0.12);
    out.mid = ease(out.mid, normaliza('mid', m), 0.5, 0.1);
    out.high = ease(out.high, normaliza('high', h), 0.5, 0.1);
    out.level = (out.bass + out.mid + out.high) / 3;

    if (BPM) {
      // kick pelo relógio da música: dispara quando passa de uma batida para a próxima
      const batida = Math.floor((el.currentTime - PRIMEIRA_BATIDA) / BEAT);
      // só pulsa se tem grave de verdade (introdução e pausas sem kick ficam calmas)
      if (batida !== ultimaBatida && batida >= 0 && b > 0.3) out.kick = 1;
      else out.kick *= 0.86;
      ultimaBatida = batida;
    } else {
      // kick pela detecção: o grave salta acima da própria média recente
      bassAvg = bassAvg * 0.95 + b * 0.05;
      if (b > bassAvg * 1.25 && b > 0.35 && nowSec - lastKick > BEAT * 0.6) { lastKick = nowSec; out.kick = 1; }
      else out.kick *= 0.86;
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
