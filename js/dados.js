/* ============================================================
   DADOS DO ROTEIRO (roteiro-2026-humanizado.txt)
   Uma fonte só para os comprimidos (slides 2–6) e as seringas (slide 9):
   as fases são as MESMAS, com o mesmo número, nome e cor de destaque.
   ============================================================ */

/* cada substância tem uma forma de comprimido própria, mantida no deck inteiro */
export const SUBS = {
  fluox: { nome: 'FLUOXETINA', titulo: 'Fluoxetina', forma: 'capsula' },
  vort: { nome: 'VORTIOXETINA', titulo: 'Vortioxetina', forma: 'disco' },
  bup: { nome: 'BUPROPIONA XL', titulo: 'Bupropiona XL', forma: 'capsula' },   // mesmo formato da fluoxetina
  nal: { nome: 'NALTREXONA', titulo: 'Naltrexona', forma: 'discoP' },
  topi: { nome: 'TOPIRAMATO', titulo: 'Topiramato', forma: 'hex' },
};

/* agulhas: código de cor do canhão (design.md §4) */
export const AGULHAS = {
  '40x12': { nome: '40X12', uso: 'ASPIRAR DA AMPOLA' },
  '25x7': { nome: '25X7', uso: 'INTRAMUSCULAR' },
  '13x4,5': { nome: '13X4,5', uso: 'SUBCUTÂNEO' },
};

export const FASES = [
  {
    n: 1, curto: 'JAN', titulo: 'JAN', periodo: 'EM JANEIRO', dias: 31,
    comp: [{ sub: 'fluox', diaria: '80 mg', unid: '20 mg', qtd: 4 }],
    compDia: 4, compTotal: 124,
    ser: [{ sub: 'fluox', mg: '80 MG', ml: 2, cap: 3, local: 'DELTOIDE', ag: '25x7' }],
    serTotal: 31,
  },
  {
    n: 2, curto: 'FEV–ABR', titulo: 'FEV–ABR', periodo: 'DE FEVEREIRO A ABRIL', dias: 89,
    comp: [{ sub: 'vort', diaria: '10 mg', unid: '10 mg', qtd: 1 }],
    compDia: 1, compTotal: 89,
    ser: [{ sub: 'vort', mg: '10 MG', ml: 0.5, cap: 1, local: 'SUBCUTÂNEO', ag: '13x4,5' }],
    serTotal: 89,
  },
  {
    n: 3, curto: 'MAI–JUN', titulo: 'MAI–JUN', periodo: 'EM MAIO E JUNHO', dias: 61,
    comp: [
      { sub: 'vort', diaria: '15 mg', unid: '15 mg', qtd: 1 },
      { sub: 'bup', diaria: '150 mg', unid: '150 mg', qtd: 1 },
    ],
    compDia: 2, compTotal: 122,
    ser: [
      { sub: 'vort', mg: '15 MG', ml: 0.75, cap: 1, local: 'SUBCUTÂNEO', ag: '13x4,5' },
      { sub: 'bup', mg: '150 MG', ml: 1.5, cap: 3, local: 'DELTOIDE', ag: '25x7' },
    ],
    serTotal: 122,
  },
  {
    n: 4, curto: 'JUL–OUT', titulo: 'JUL–OUT', periodo: 'DE JULHO A OUTUBRO', dias: 123,
    comp: [
      { sub: 'vort', diaria: '15 mg', unid: '15 mg', qtd: 1 },
      { sub: 'bup', diaria: '150 mg', unid: '150 mg', qtd: 1 },
      { sub: 'nal', diaria: '50 mg', unid: '50 mg', qtd: 1 },
    ],
    compDia: 3, compTotal: 369,
    ser: [
      { sub: 'vort', mg: '15 MG', ml: 0.75, cap: 1, local: 'SUBCUTÂNEO', ag: '13x4,5' },
      { sub: 'bup', mg: '150 MG', ml: 1.5, cap: 3, local: 'DELTOIDE ESQ.', ag: '25x7' },
      { sub: 'nal', mg: '50 MG', ml: 1, cap: 3, local: 'DELTOIDE DIR.', ag: '25x7' },
    ],
    serTotal: 369,
  },
  {
    n: 5, curto: 'NOV–DEZ', titulo: 'NOV–DEZ', periodo: 'DESDE NOVEMBRO', dias: 61,
    comp: [
      { sub: 'bup', diaria: '300 mg', unid: '150 mg', qtd: 2 },
      { sub: 'topi', diaria: '100 mg', unid: '100 mg', qtd: 1 },
      { sub: 'vort', diaria: '20 mg', unid: '10 mg', qtd: 2 },
    ],
    compDia: 5, compTotal: 305,
    ser: [
      { sub: 'bup', mg: '300 MG', ml: 3, cap: 5, local: 'COXA', ag: '25x7' },
      { sub: 'topi', mg: '100 MG', ml: 2, cap: 3, local: 'DELTOIDE', ag: '25x7' },
      { sub: 'vort', mg: '20 MG', ml: 1, cap: 1, local: 'SUBCUTÂNEO', ag: '13x4,5' },
    ],
    serTotal: 183,
  },
];

export const TOTAL = {
  seringas: 794, s1: 334, s3: 399, s5: 61,
  agulhas: 1588, a40: 794, a25: 460, a13: 334,
  comprimidos: 1009,
};

/* ordem cronológica das 794 seringas, por capacidade (para a grade do slide 10) */
export function ordemSeringas() {
  const out = [];
  for (const f of FASES) for (let d = 0; d < f.dias; d++) for (const s of f.ser) out.push(s.cap);
  return out; // 794 itens: 1, 3 ou 5
}

/* conferência das contas do roteiro (aparece no console se algo não bater) */
(() => {
  const c = FASES.reduce((a, f) => a + f.compTotal, 0), s = FASES.reduce((a, f) => a + f.serTotal, 0);
  FASES.forEach(f => {
    if (f.compDia * f.dias !== f.compTotal) console.warn('comprimidos não batem na fase', f.n);
    if (f.ser.length * f.dias !== f.serTotal) console.warn('seringas não batem na fase', f.n);
  });
  if (c !== TOTAL.comprimidos || s !== TOTAL.seringas) console.warn('totais não batem', c, s);
})();

/* medidas das seringas (unidades da cena 3D): comprimento útil L, raio R, aba F.
   proporção real: 1 mL fina e comprida, 3 mL média, 5 mL larga */
export const SPEC = {
  1: { L: 6.0, R: 0.32, F: 0.78 },
  3: { L: 4.6, R: 0.55, F: 1.15 },
  5: { L: 4.8, R: 0.78, F: 1.45 },
};
export const BICO = 0.62; // comprimento do bico abaixo do corpo
