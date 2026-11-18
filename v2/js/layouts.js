/* ============================================================
   LAYOUTS v2 — o que aparece em cada slide/passo (px do palco 1920×1080)
   Mesma lógica da v1 (../../js/layouts.js), composições novas.
   item pílula : { id, k:'pill', forma, sub, x, y, s }
   item seringa: { id, k:'syr', cap, vol, ag, sub, x (bico), y, s }
   item grade  : { id, k:'grade' }
   item enfeite: { id, k:'deco', forma:'estrela'|'toro'|'bolha'|'pilula', x, y, s, cor }
   ============================================================ */
import { FASES, SUBS, SPEC, TOTAL } from '../../js/dados.js';

const pad = (n, w = 3) => String(n).padStart(w, '0');
const fmtMl = v => String(v).replace('.', ',');
const plural = (n, s, p) => (n === 1 ? s : p);

/* cada slide, um mundo de cor (temas em css/v2.css e js/cena.js) */
export const SLIDES = [
  { n: 1, tema: 'uva', passos: 1, fundo: { raios: 0.5 } },
  { n: 2, tema: 'lima', passos: 1, fase: 0, fundo: { pontos: 1 } },
  { n: 3, tema: 'cobalto', passos: 1, fase: 1, fundo: { xadrez: 0.5 } },
  { n: 4, tema: 'creme', passos: 1, fase: 2, fundo: { raios: 0.6 } },
  { n: 5, tema: 'uva', passos: 1, fase: 3, fundo: { pontos: 1 } },
  { n: 6, tema: 'chiclete', passos: 1, fase: 4, fundo: { xadrez: 0.5 } },
  { n: 7, tema: 'quieto', passos: 1, fundo: { quieto: 1 } },
  { n: 8, tema: 'lima', passos: 4, fundo: { xadrez: 0.35 } },
  { n: 9, tema: 'noite', passos: 5, fundo: { pontos: 0.6 } },
  { n: 10, tema: 'uva', passos: 1, fundo: { raios: 0.35 } },
  { n: 11, tema: 'split', passos: 1, fundo: { quieto: 1, split: 1 } },
  { n: 12, tema: 'laranja', passos: 1, fundo: { xadrez: 0.45 } },
  { n: 13, tema: 'uva', passos: 1, fundo: { raios: 0.6 } },
];

/* ---------- comprimidos do dia, agrupados por substância ---------- */
function pilulas(fase, { cx, y, s, gap, gapGrupo, prefixo, rotulos = true, rotY }) {
  const items = [], labels = [];
  const total = fase.comp.reduce((a, c) => a + c.qtd, 0);
  const largura = (total - 1) * gap + (fase.comp.length - 1) * gapGrupo;
  let x = cx - largura / 2;
  fase.comp.forEach(c => {
    const x0 = x;
    for (let i = 0; i < c.qtd; i++) {
      items.push({ id: `${prefixo}-${c.sub}-${i}`, k: 'pill', forma: SUBS[c.sub].forma, sub: c.sub, x, y, s });
      x += gap;
    }
    x -= gap;
    if (rotulos) labels.push({
      key: `${prefixo}-l-${c.sub}-${fase.n}`, x: (x0 + x) / 2, y: rotY, al: 'c', cls: 'rot-pil',
      html: `${SUBS[c.sub].nome}<br>${c.qtd} × ${c.unid.toUpperCase()}`,
    });
    x += gap + gapGrupo;
  });
  return { items, labels };
}

/* ---------- seringas em linhas, bicos alinhados numa vertical ---------- */
function seringas(lista, { bicoX, ys, s, prefixo, mostraLocal = true }) {
  const items = [], labels = [];
  lista.forEach((q, i) => {
    const id = q.id || `${prefixo}-${q.sub}-${q.cap}`;
    items.push({ id, k: 'syr', cap: q.cap, vol: q.ml, ag: q.ag, sub: q.sub, x: bicoX, y: ys[i], s });
    const aba = SPEC[q.cap].F * s;
    labels.push({
      key: `${id}-l-${q.mg || ''}${q.ml}-${q.local || ''}`, x: bicoX, y: ys[i] - aba - 84, al: 'r', cls: 'rot-ser',
      html: q.html || `<b>${SUBS[q.sub].nome} ${q.mg} · ${fmtMl(q.ml)} ML</b><span class="mono">SERINGA ${q.cap} ML${mostraLocal ? ' · ' + q.local : ''} · AGULHA ${q.ag.toUpperCase()}</span>`,
    });
  });
  return { items, labels };
}

/* ---------- enfeites 3D (estrelas infladas, toros, bolhas, pílulas soltas) ---------- */
const deco = (id, forma, x, y, s, cor) => ({ id: `d-${id}`, k: 'deco', forma, x, y, s, cor });
const ENFEITES = {
  1: [deco('e1', 'estrela', 1640, 560, 190), deco('t1', 'toro', 1800, 850, 105, 'lima'), deco('b1', 'bolha', 1480, 880, 62, 'chiclete')],
  2: [deco('e2', 'estrela', 1790, 600, 95, 'uva')],
  3: [deco('t3', 'toro', 1790, 600, 90, 'lima')],
  4: [deco('e4', 'estrela', 1790, 600, 95, 'uva')],
  5: [deco('b5', 'bolha', 1790, 600, 70, 'lima')],
  6: [deco('t6', 'toro', 1790, 600, 90, 'lima')],
  8: [deco('e8', 'estrela', 1160, 160, 80, 'chiclete')],
  12: [deco('e12', 'estrela', 1640, 420, 190), deco('t12', 'toro', 1820, 820, 110, 'uva')],
  13: [
    deco('e13', 'estrela', 1730, 180, 140), deco('t13', 'toro', 260, 830, 120, 'lima'),
    deco('p13a', 'pilula', 980, 190, 110, 'chiclete'), deco('p13b', 'pilula', 1420, 880, 120, 'lima'),
    deco('p13c', 'pilula', 560, 900, 90, 'laranja'), deco('b13', 'bolha', 1820, 640, 60, 'lima'),
  ],
};

/* ============================================================ */
export function layout(n, passo) {
  const cfg = SLIDES[n - 1];
  let items = [], labels = [];
  const add = r => { items = items.concat(r.items); labels = labels.concat(r.labels); };

  /* ---- 2 a 6: uma fase de comprimidos por slide ---- */
  if (cfg.fase !== undefined) {
    const f = FASES[cfg.fase];
    add(pilulas(f, { cx: 1230, y: 680, s: 150, gap: 172, gapGrupo: 90, prefixo: 'pil', rotY: 830 }));
  }

  /* ---- 8: as regras do jogo, uma por passo, com demonstração ---- */
  if (n === 8) {
    const S = 48, B = 1780;
    if (passo === 0) add(seringas([
      { id: 'd-a', sub: 'vort', mg: '15 MG', ml: 0.75, cap: 1, local: 'SUBCUTÂNEO', ag: '13x4,5' },
      { id: 'd-b', sub: 'bup', mg: '150 MG', ml: 1.5, cap: 3, local: 'DELTOIDE', ag: '25x7' },
    ], { bicoX: B, ys: [420, 630], s: S }));
    if (passo === 1) add(seringas([
      { id: 'd-b', sub: 'bup', mg: '300 MG', ml: 3, cap: 3, local: 'DELTOIDE', ag: '25x7',
        html: '<b>DOBROU A DOSE? DOBRA O VOLUME</b><span class="mono">1,5 ML → 3 ML NA MESMA SERINGA</span>' },
    ], { bicoX: B, ys: [500], s: S + 8 }));
    if (passo === 2) add(seringas([
      { id: 'd-b', sub: 'bup', mg: '150 MG', ml: 1.5, cap: 3, local: 'DELTOIDE', ag: 'troca',
        html: '<b>2 AGULHAS POR APLICAÇÃO</b><span class="mono"><i class="sw rosa"></i>40X12 PUXA DA AMPOLA → <i class="sw ink"></i>25X7 APLICA</span>' },
    ], { bicoX: B - 130, ys: [430], s: S + 10 }));
    if (passo === 3) add(seringas([
      { id: 'd-a', sub: 'vort', cap: 1, ml: 1, ag: '13x4,5', html: '<b>SUBCUTÂNEO · ATÉ ~1 ML</b><span class="mono">SERINGA 1 ML · AGULHA 13X4,5</span>' },
      { id: 'd-c', sub: 'nal', cap: 3, ml: 2, ag: '25x7', html: '<b>DELTOIDE · ATÉ 2 ML</b><span class="mono">SERINGA 3 ML · AGULHA 25X7</span>' },
      { id: 'd-b', sub: 'bup', cap: 5, ml: 4, ag: '25x7', html: '<b>COXA · ATÉ ~4 ML</b><span class="mono">SERINGA 5 ML · AGULHA 25X7</span>' },
    ], { bicoX: B, ys: [380, 560, 740], s: 34 }));
  }

  /* ---- 9: o ano em seringas, fase por fase, ao lado dos comprimidos da mesma fase ---- */
  if (n === 9) {
    const f = FASES[passo];
    add(pilulas(f, { cx: 860, y: 720, s: 72, gap: 92, gapGrupo: 46, prefixo: 'p9', rotulos: false }));
    labels.push({ key: `p9-dia-${f.n}`, x: 860, y: 810, al: 'c', cls: 'rot-pil',
      html: `${f.compDia} ${plural(f.compDia, 'COMPRIMIDO', 'COMPRIMIDOS')}/DIA<br>NA VIDA REAL` });
    const ys = { 1: [620], 2: [520, 760], 3: [450, 650, 850] }[f.ser.length];
    add(seringas(f.ser.map(q => ({ ...q, id: `s9-${q.sub}-${q.cap}` })), { bicoX: 1800, ys, s: 50 }));
  }

  /* ---- 10: o total ---- */
  if (n === 10) items.push({ id: 'grade', k: 'grade' });

  (ENFEITES[n] || []).forEach(d => items.push(d));
  return { items, labels, cfg };
}

export const util = { pad, fmtMl, plural, TOTAL };
