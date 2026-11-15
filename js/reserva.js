/* ============================================================
   MODO RESERVA (sem WebGL) — canvas 2D
   Desenha os mesmos objetos nos mesmos px, em traço simples.
   Entra quando: não há WebGL, o 3D roda lento, ou você aperta R.
   Continua reagindo à música.
   ============================================================ */
import { SPEC, BICO, ordemSeringas } from './dados.js';
import { TEMAS_2D } from './temas.js';

export function createReserva(canvas, state) {
  const ctx = canvas.getContext('2d');
  canvas.width = 1920; canvas.height = 1080;
  let tema = 'E';
  const ordem = ordemSeringas();

  function pilula(st, ink, s) {
    ctx.save(); ctx.translate(st.x, st.y);
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(138,138,134,.35)';
    ctx.beginPath();
    if (st.forma === 'capsula' || st.forma === 'oblongo') {
      const w = (st.forma === 'capsula' ? 0.3 : 0.27) * s, h = (st.forma === 'capsula' ? 0.85 : 0.8) * s;
      ctx.roundRect(-w, -h / 2 - w, w * 2, h + w * 2, w);
    } else if (st.forma === 'hex') {
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 0.46 * s, Math.sin(a) * 0.46 * s); }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, (st.forma === 'disco' ? 0.46 : 0.36) * s, 0, Math.PI * 2);
    }
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function seringa(st, ink, s, t) {
    const { L, R, F } = SPEC[st.cap], v = Math.max(0, Math.min(st.cap, st.vol || 0));
    const bico = st.x, fundo = bico - BICO * s, topo = fundo - L * s, h = (v / st.cap) * L * s;
    ctx.save();
    ctx.lineWidth = 3; ctx.strokeStyle = ink;
    ctx.fillStyle = '#C6FF00'; ctx.fillRect(fundo - h, st.y - R * s + 3, h, R * s * 2 - 6);      // líquido
    ctx.strokeRect(topo, st.y - R * s, L * s, R * s * 2);                                      // corpo
    ctx.strokeRect(topo - 6, st.y - F * s, 6, F * s * 2);                                      // aba
    ctx.beginPath(); ctx.moveTo(fundo, st.y - R * s); ctx.lineTo(bico, st.y - 0.1 * s);
    ctx.lineTo(bico, st.y + 0.1 * s); ctx.lineTo(fundo, st.y + R * s); ctx.stroke();           // bico
    const rolha = fundo - h;                                                                     // êmbolo
    ctx.fillStyle = ink; ctx.fillRect(rolha - 0.26 * s, st.y - R * s + 3, 0.26 * s, R * s * 2 - 6);
    ctx.strokeRect(rolha - (L + 0.3) * s, st.y - 0.16 * s, (L + 0.04) * s, 0.32 * s);
    ctx.strokeRect(rolha - (L + 0.42) * s, st.y - F * 0.8 * s, 0.12 * s, F * 1.6 * s);
    let ag = st.ag;                                                                              // agulha
    if (ag === 'troca') ag = (t % 7.385) / 7.385 < 0.5 ? '40x12' : '25x7';
    const A = { '13x4,5': [0.32, 1.3, '#8A8A86'], '25x7': [0.4, 2.5, ink], '40x12': [0.46, 4, '#FF2D8A'] }[ag] || [0.32, 1.3, ink];
    ctx.fillStyle = A[2]; ctx.fillRect(bico, st.y - 0.18 * s, A[0] * s, 0.36 * s);
    ctx.beginPath(); ctx.moveTo(bico + A[0] * s, st.y); ctx.lineTo(bico + (A[0] + A[1]) * s, st.y); ctx.stroke();
    ctx.restore();
  }

  function grade(st, ink) {
    const lim = Math.round((st.revela || 0) * ordem.length);
    ctx.globalAlpha = st.alpha; ctx.fillStyle = ink;
    for (let k = 0; k < lim; k++) {
      const cap = ordem[k], col = k % 40, row = Math.floor(k / 40);
      const w = { 1: 30, 3: 26, 5: 22 }[cap], hh = { 1: 3, 3: 5, 5: 7 }[cap];
      ctx.fillRect(112 + col * 43 - w / 2, 128 + row * 26 - hh / 2, w, hh);
    }
    ctx.globalAlpha = 1;
  }

  return {
    setSlide(cfg) { tema = cfg.tema; },
    render(a, dt, estados) {
      const T = TEMAS_2D[tema] || TEMAS_2D.E, t = performance.now() / 1000;
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, 1920, 1080);
      if (tema === 'S') { ctx.fillStyle = '#F1EEE6'; ctx.fillRect(960, 0, 960, 1080); }
      const pulso = 1 + (state.calm ? 0 : a.kick * 0.03);
      for (const [, st] of estados) {
        if (st.alpha <= 0.01) continue;
        const s = (st.s || 1) * st.alpha * pulso;
        if (st.k === 'pill') pilula(st, T.ink, s);
        else if (st.k === 'syr') seringa(st, T.ink, s, t);
        else if (st.k === 'grade') grade(st, T.ink);
      }
    },
    dispose() {},
  };
}
