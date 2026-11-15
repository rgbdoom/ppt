/* ============================================================
   LAYOUTS — o que aparece em cada slide/passo
   Tudo em px do palco 1920×1080. O 3D e a reserva 2D leem a mesma lista,
   e os rótulos são posicionados nos mesmos px dos objetos.
   item pílula : { id, k:'pill', forma, x, y, s }
   item seringa: { id, k:'syr', cap, vol, ag, x (bico), y, s }   horizontal, agulha à direita
   item grade  : { id, k:'grade', revela 0–1 }
   rótulo      : { key, x, y, html, cls, al:'l'|'r'|'c' }
   ============================================================ */
import { FASES, SUBS, SPEC, BICO, TOTAL } from './dados.js';

const pad = (n, w = 3) => String(n).padStart(w, '0');
const fmtMl = v => String(v).replace('.', ',');
const plural = (n, s, p) => (n === 1 ? s : p);

/* temas: E escuro, C claro (papel), F fluo cheio */
export const SLIDES = [
  { n: 1, tema: 'E', passos: 1 },
  { n: 2, tema: 'C', passos: 1, fase: 0 },
  { n: 3, tema: 'E', passos: 1, fase: 1 },
  { n: 4, tema: 'C', passos: 1, fase: 2 },
  { n: 5, tema: 'E', passos: 1, fase: 3 },
  { n: 6, tema: 'F', passos: 1, fase: 4 },
  { n: 7, tema: 'E', passos: 1, fundo: { quieto: 1 } },
  { n: 8, tema: 'C', passos: 4, fundo: { ondas: 1 } },
  { n: 9, tema: 'E', passos: 5 },
  { n: 10, tema: 'E', passos: 1, fundo: { spec: 1 } },
  { n: 11, tema: 'S', passos: 1, fundo: { quieto: 1, split: 1 } },
  { n: 12, tema: 'E', passos: 1 },
];

/* ---------- comprimidos do dia, agrupados por substância ---------- */
function pilulas(fase, { cx, y, s, gap, gapGrupo, prefixo, rotulos = true, rotY }) {
  const items = [], labels = [];
  const total = fase.comp.reduce((a, c) => a + c.qtd, 0);
  const largura = (total - 1) * gap + (fase.comp.length - 1) * gapGrupo;
  let x = cx - largura / 2;
  fase.comp.forEach((c, gi) => {
    const x0 = x;
    for (let i = 0; i < c.qtd; i++) {
      // id por substância e posição: o mesmo comprimido "anda" entre slides vizinhos
      items.push({ id: `${prefixo}-${c.sub}-${i}`, k: 'pill', forma: SUBS[c.sub].forma, x, y, s });
      x += gap;
    }
    x -= gap;
    if (rotulos) {
      labels.push({
        key: `${prefixo}-l-${c.sub}-${fase.n}`, x: (x0 + x) / 2, y: rotY, al: 'c', cls: 'mono rot-pil',
        html: `<b>${SUBS[c.sub].nome}</b><br>${c.qtd} × ${c.unid}`,
      });
    }
    x += gap + gapGrupo;
  });
  return { items, labels };
}

/* ---------- seringas em linhas, bicos alinhados numa vertical ---------- */
function seringas(lista, { bicoX, ys, s, prefixo, rotX, mostraLocal = true }) {
  const items = [], labels = [];
  lista.forEach((q, i) => {
    const id = q.id || `${prefixo}-${q.sub}-${q.cap}`;
    items.push({ id, k: 'syr', cap: q.cap, vol: q.ml, ag: q.ag, x: bicoX, y: ys[i], s });
    const aba = SPEC[q.cap].F * s;
    // rótulo alinhado à direita no bico, logo acima da própria seringa
    labels.push({
      key: `${id}-l-${q.mg || ''}${q.ml}-${q.local || ''}`, x: bicoX, y: ys[i] - aba - 84, al: 'r', cls: 'rot-ser',
      html: q.html || `<b>${SUBS[q.sub].nome} ${q.mg} · ${fmtMl(q.ml)} ML</b><span class="mono">SERINGA ${q.cap} ML${mostraLocal ? ' · ' + q.local : ''} · AGULHA ${q.ag.toUpperCase()}</span>`,
    });
  });
  return { items, labels };
}

/* ============================================================ */
export function layout(n, passo) {
  const cfg = SLIDES[n - 1];
  let items = [], labels = [];
  const add = r => { items = items.concat(r.items); labels = labels.concat(r.labels); };

  /* ---- 2 a 6: uma fase de comprimidos por slide ---- */
  if (cfg.fase !== undefined) {
    const f = FASES[cfg.fase];
    add(pilulas(f, { cx: 1380, y: 470, s: 130, gap: 150, gapGrupo: 90, prefixo: 'pil', rotY: 600 }));
  }

  /* ---- 8: as regras do jogo, uma por passo, com demonstração ---- */
  if (n === 8) {
    const S = 48, B = 1700, X = 0;
    if (passo === 0) add(seringas([
      { id: 'd-a', sub: 'vort', mg: '15 MG', ml: 0.75, cap: 1, local: 'SUBCUTÂNEO', ag: '13x4,5' },
      { id: 'd-b', sub: 'bup', mg: '150 MG', ml: 1.5, cap: 3, local: 'DELTOIDE', ag: '25x7' },
    ], { bicoX: B, ys: [400, 610], s: S, rotX: X }));
    if (passo === 1) add(seringas([
      { id: 'd-b', sub: 'bup', mg: '300 MG', ml: 3, cap: 3, local: 'DELTOIDE', ag: '25x7',
        html: '<b>DOBROU A DOSE? DOBRA O VOLUME</b><span class="mono">1,5 ML → 3 ML NA MESMA SERINGA</span>' },
    ], { bicoX: B, ys: [480], s: S + 8, rotX: X }));
    if (passo === 2) add(seringas([
      { id: 'd-b', sub: 'bup', mg: '150 MG', ml: 1.5, cap: 3, local: 'DELTOIDE', ag: 'troca',
        html: '<b>2 AGULHAS POR APLICAÇÃO</b><span class="mono"><i class="sw rosa"></i>40X12 PUXA DA AMPOLA → <i class="sw ink"></i>25X7 APLICA</span>' },
    ], { bicoX: B - 130, ys: [480], s: S + 10, rotX: X }));
    if (passo === 3) add(seringas([
      { id: 'd-a', cap: 1, ml: 1, ag: '13x4,5', html: '<b>SUBCUTÂNEO · ATÉ ~1 ML</b><span class="mono">SERINGA 1 ML · AGULHA 13X4,5</span>' },
      { id: 'd-c', cap: 3, ml: 2, ag: '25x7', html: '<b>DELTOIDE · ATÉ 2 ML</b><span class="mono">SERINGA 3 ML · AGULHA 25X7</span>' },
      { id: 'd-b', cap: 5, ml: 4, ag: '25x7', html: '<b>COXA · ATÉ ~4 ML</b><span class="mono">SERINGA 5 ML · AGULHA 25X7</span>' },
    ], { bicoX: B, ys: [318, 490, 662], s: 34, rotX: X }));
  }

  /* ---- 9: o ano em seringas, fase por fase, ao lado dos comprimidos da mesma fase ---- */
  if (n === 9) {
    const f = FASES[passo];
    // comprimidos do dia, pequenos, à esquerda
    add(pilulas(f, { cx: 330, y: 560, s: 72, gap: 92, gapGrupo: 46, prefixo: 'p9', rotulos: false }));
    labels.push({ key: `p9-dia-${f.n}`, x: 330, y: 650, al: 'c', cls: 'mono rot-pil',
      html: `<b>${f.compDia} ${plural(f.compDia, 'COMPRIMIDO', 'COMPRIMIDOS')}/DIA</b><br>NA VIDA REAL` });
    // seringas do dia, à direita: 1 por substância
    const ys = { 1: [580], 2: [470, 700], 3: [400, 610, 820] }[f.ser.length];
    add(seringas(f.ser.map(q => ({ ...q, id: `s9-${q.sub}-${q.cap}` })), { bicoX: 1600, ys, s: 50, rotX: 820 }));
  }

  /* ---- 10: o total ---- */
  if (n === 10) items.push({ id: 'grade', k: 'grade', revela: 1 });

  return { items, labels, cfg };
}

/* textos auxiliares usados pelo main.js */
export const util = { pad, fmtMl, plural, TOTAL };
