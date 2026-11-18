/* ============================================================
   2026 EM DOSES · v2 · controle do deck
   Mesma navegação da v1: → / PageDown / Enter / clique = avança · ← / PageUp = volta
   ESPAÇO música · F tela cheia · M modo calmo · R liga/desliga o 3D
   ?teste na URL desliga a queda automática do 3D · ?s=9&p=2 abre direto num slide
   O controle pelo celular (treino.html) funciona aqui também: mesma senha, mesma sala.
   ============================================================ */
import { createAudio } from '../../js/audio.js';
import { criaItens } from '../../js/itens.js';
import { FASES, SUBS } from '../../js/dados.js';
import { portao } from '../../js/portao.js';
import { abreCanal } from '../../js/canal.js';
import { SLIDES, layout } from './layouts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const gsap = window.gsap;
const pad = (n, w = 2) => String(n).padStart(w, '0');
const plural = (n, s, p) => (n === 1 ? s : p);

/* ---------- palco escalado ---------- */
const stage = $('#stage');
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
}
addEventListener('resize', fit); fit();

/* ---------- slides 2–6 montados a partir dos dados (mesma fonte da v1) ---------- */
FASES.forEach((f, i) => {
  const sec = $(`.slide[data-n="${i + 2}"]`);
  sec.innerHTML = `
    <div class="chip" data-in>FASE ${f.n} / 5</div>
    <h2 class="display titulo-fase" data-split data-cromo><span class="ln">${f.titulo}</span></h2>
    <ul class="subs">${f.comp.map(c => `
      <li data-in><b>${SUBS[c.sub].titulo} ${c.diaria}/dia</b>
      <span class="mono">${c.qtd} ${plural(c.qtd, 'COMPRIMIDO', 'COMPRIMIDOS')} DE ${c.unid.toUpperCase()}</span></li>`).join('')}
    </ul>
    <p class="anchor" data-in>${f.compDia} ${plural(f.compDia, 'comprimido', 'comprimidos')} por dia</p>
    <div class="contador" data-pop><span class="display">${f.compTotal}</span><span class="mono">COMPRIMIDOS ${f.periodo}</span></div>
    <svg class="g brilho" data-pop viewBox="0 0 100 100"><use href="#g-brilho"/></svg>`;
});

/* títulos das fases: o maior tamanho que cabe ao lado do selo de contagem */
await document.fonts.ready;
$$('.titulo-fase').forEach(h => {
  h.style.fontSize = '420px';
  const w = h.scrollWidth;
  const fs = w > 1220 ? Math.floor(420 * 1220 / w) : 420;
  h.style.fontSize = fs + 'px';
  // os cartões das substâncias começam logo abaixo do título
  const subs = h.parentElement.querySelector('.subs');
  subs.style.top = Math.min(560, 130 + fs * 0.9 + 70) + 'px';
});
/* slide 11: 794 e 1.009 no mesmo tamanho, o maior que cabe em cada metade */
{
  const els = [$('.s11 .riscado .display'), $('#n1009')];
  const fs = Math.min(...els.map(e => 300 * 790 / e.scrollWidth), 300);
  els.forEach(e => { e.style.fontSize = Math.floor(fs) + 'px'; });
}

/* régua das fases: largura proporcional aos dias, igual nos slides 2–6 e 9 */
$('#linha').innerHTML = FASES.map(f => `<div class="seg" style="flex:${f.dias}"><span>${f.n} · ${f.curto}</span></div>`).join('');
function marcaFase(i) {
  $$('#linha .seg').forEach((s, k) => { s.classList.toggle('atual', k === i); s.classList.toggle('feita', k < i); });
}

/* ---------- estado ---------- */
const state = { calm: matchMedia('(prefers-reduced-motion: reduce)').matches };
const audio = createAudio($('#trilha'));
const itens = criaItens();
const marcaCalmo = () => stage.classList.toggle('calmo', state.calm);
marcaCalmo();

/* ---------- 3D (sem 3D, o deck continua: fundo em CSS e títulos em HTML) ---------- */
let cena = null, cfgAtual = null;
const temWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };
function semTresD(motivo) {
  if (cena) { cena.dispose(); cena = null; }
  $('#gl').hidden = true;
  if (motivo) console.info('[2026 v2] sem 3D:', motivo);
}
async function usa3D() {
  try {
    if (!temWebGL()) throw new Error('sem WebGL');
    const { createCena } = await import('./cena.js');
    cena = createCena($('#gl'), state);
    $('#gl').hidden = false;
    if (cfgAtual) cena.setSlide(cfgAtual, true);
  } catch (e) { semTresD(e.message || e); }
}
await usa3D();

/* ---------- rótulos dos objetos (diff por chave, entram e saem suavemente) ---------- */
const rotulos = new Map();
function syncRotulos(lista) {
  const vivos = new Set();
  lista.forEach((l, i) => {
    vivos.add(l.key);
    if (rotulos.has(l.key)) { gsap.to(rotulos.get(l.key), { left: l.x, top: l.y, duration: 1.2, ease: 'expo.inOut' }); return; }
    const el = document.createElement('div');
    el.className = `rot al-${l.al || 'l'} ${l.cls || ''}`;
    el.style.left = l.x + 'px'; el.style.top = l.y + 'px';
    el.innerHTML = l.html;
    $('#rotulos').appendChild(el);
    rotulos.set(l.key, el);
    gsap.from(el, { opacity: 0, y: 24, duration: 0.9, ease: 'expo.out', delay: 0.35 + i * 0.08 });
  });
  for (const [k, el] of rotulos) {
    if (vivos.has(k)) continue;
    rotulos.delete(k);
    gsap.to(el, { opacity: 0, y: -16, duration: 0.35, ease: 'power2.in', onComplete: () => el.remove() });
  }
}

/* ---------- entrada e saída de cada slide ---------- */
function entra(sec, corte) {
  sec.classList.add('ativo');
  gsap.set(sec, { opacity: 1 });
  if (corte) return;
  $$('[data-split]', sec).forEach(el => {
    gsap.fromTo($$('.ln', el), { yPercent: 100, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
      { yPercent: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
  });
  gsap.fromTo($$('[data-in]', sec), { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.3 });
  // grafismos entram "pulando" (escala com mola), cada um num tempo
  gsap.fromTo($$('[data-pop]', sec), { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(2.2)', stagger: 0.09, delay: 0.45, clearProps: 'transform' });
}
function sai(sec, corte) {
  if (corte) { sec.classList.remove('ativo'); return; }
  gsap.to(sec, { opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: () => sec.classList.remove('ativo') });
}

/* ---------- navegação ---------- */
let n = 1, passo = 0, iniciado = false;
let canal = null;

function vai(novoN, novoPasso = 0, opc = {}) {
  const mudouSlide = novoN !== n || !iniciado;
  const cfg = SLIDES[novoN - 1];
  // o slide 7 entra e sai em corte seco: o silêncio visual acompanha a pausa da fala
  const corte = novoN === 7 || (n === 7 && mudouSlide);

  if (mudouSlide) {
    const velho = $(`.slide[data-n="${n}"]`);
    if (velho && iniciado) sai(velho, corte);
    const novo = $(`.slide[data-n="${novoN}"]`);
    gsap.killTweensOf(novo);
    entra(novo, corte);
    stage.dataset.tema = cfg.tema; stage.dataset.n = novoN;
    $('#num-slide').textContent = `${pad(novoN)} / ${pad(SLIDES.length)}`;
    cfgAtual = { n: novoN, tema: cfg.tema, fundo: cfg.fundo };
    cena && cena.setSlide(cfgAtual, corte);
  }
  n = novoN; passo = novoPasso;

  const { items, labels } = layout(n, passo);
  itens.sync(items, { calmo: corte });
  syncRotulos(labels);

  const comRegua = (n >= 2 && n <= 6) || n === 9;
  gsap.to('#linha', { opacity: comRegua ? 1 : 0, duration: 0.6 });
  if (n >= 2 && n <= 6) marcaFase(n - 2);
  if (n === 9) marcaFase(passo);

  ganchos[n] && ganchos[n](passo, mudouSlide);
  if (!opc.remoto && canal && iniciado) canal.envia({ tipo: 'pos', s: n, p: passo });
}

function avanca() {
  const cfg = SLIDES[n - 1];
  if (passo < cfg.passos - 1) vai(n, passo + 1);
  else if (n < SLIDES.length) vai(n + 1, 0);
}
function volta() {
  if (passo > 0) vai(n, passo - 1);
  else if (n > 1) vai(n - 1, SLIDES[n - 2].passos - 1);
}

/* ---------- ganchos de cada slide (mesmo comportamento da v1) ---------- */
const troca = (el, texto) => gsap.timeline()
  .to(el, { yPercent: -40, opacity: 0, duration: 0.25, ease: 'power2.in' })
  .add(() => { el.textContent = texto; })
  .fromTo(el, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });

function adesivo(el, mostra) {
  gsap.killTweensOf(el);
  const r = parseFloat(el.dataset.rot || (el.dataset.rot = (Math.random() * 8 - 4).toFixed(1)));
  if (mostra) gsap.fromTo(el, { opacity: 0, scale: 1.4, rotate: r - 12 }, { opacity: 1, scale: 1, rotate: r, duration: 0.7, ease: 'back.out(1.8)', delay: 0.4 });
  else gsap.to(el, { opacity: 0, scale: 0.9, duration: 0.25 });
}

const ganchos = {
  8(p) {
    $$('.s8 .regra').forEach((r, i) => {
      r.classList.toggle('atual', i === p);
      gsap.to(r, { opacity: i <= p ? 1 : 0, x: i <= p ? 0 : -40, duration: 0.7, ease: 'expo.out' });
    });
    adesivo($('.s8 .meme-prev'), p === 0);
    adesivo($('.s8 .mesa'), p === 2);
  },
  9(p, mudou) {
    const f = FASES[p], soma = FASES.slice(0, p + 1).reduce((a, x) => a + x.serTotal, 0);
    const frase = `${f.compDia} ${plural(f.compDia, 'comprimido', 'comprimidos')} por dia  →  ${f.ser.length} ${plural(f.ser.length, 'seringa', 'seringas')} por dia`;
    const chip = `FASE ${f.n} / 5 · ${f.curto}`, total = `SERINGAS ${f.periodo}`;
    if (mudou) {
      $('#s9-chip').textContent = chip; $('#s9-frase').textContent = frase;
      $('#s9-total').textContent = f.serTotal; $('#s9-total-l').textContent = total;
    } else {
      troca($('#s9-chip'), chip); troca($('#s9-frase'), frase);
      troca($('#s9-total'), String(f.serTotal)); troca($('#s9-total-l'), total);
    }
    const sig = { v: Number($('#s9-sigma').textContent) || 0 };
    if (mudou) sig.v = p === 0 ? 0 : FASES.slice(0, p).reduce((a, x) => a + x.serTotal, 0);
    gsap.to(sig, { v: soma, duration: 1.6, ease: 'expo.out', delay: 0.6, onUpdate: () => { $('#s9-sigma').textContent = pad(Math.round(sig.v), 3); } });
    // flash do Chucódromo na fase de 3 seringas por dia: entra, fica 1 compasso, sai
    const ch = $('.s9 .chuco');
    gsap.killTweensOf(ch); gsap.set(ch, { opacity: 0 });
    if (p === 3 && !state.calm) gsap.timeline({ delay: 2.6 })
      .fromTo(ch, { opacity: 0, scale: 1.15, rotate: -10 }, { opacity: 1, scale: 1, rotate: -4, duration: 0.2, ease: 'back.out(2)' })
      .to(ch, { opacity: 0, duration: 0.1, delay: 1.85 });
  },
  10() {
    const c = { v: 0 }, el = $('#n794');
    gsap.to(c, { v: 794, duration: 6.5, ease: 'power1.inOut', delay: 0.4, onUpdate: () => { el.textContent = Math.round(c.v); } });
  },
  11() {
    gsap.fromTo($('.s11 .risco'), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.out', delay: 0.9 });
    adesivo($('.s11 .meme-berlim'), true);
    gsap.fromTo($('#n1009'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'expo.inOut', delay: 0.3 });
  },
};

/* ---------- senha antes de tudo (a mesma da v1) ---------- */
const sala = await portao();

/* ---------- controle pelo celular ---------- */
canal = abreCanal(sala, m => {
  if (m.tipo !== 'vai') return;
  if (!iniciado) { start.classList.add('gone'); iniciado = true; }
  vai(m.s, m.p || 0, { remoto: true });
});

/* ---------- início: o navegador só libera som depois de um gesto ---------- */
const start = $('#start');
async function comeca() {
  if (!iniciado) { start.classList.add('gone'); vai(1, 0); iniciado = true; }
  await audio.toggle();
}
start.addEventListener('click', e => { e.stopPropagation(); comeca(); });
stage.addEventListener('click', () => { if (iniciado) avanca(); });

addEventListener('keydown', e => {
  const k = e.key;
  if (e.code === 'Space') { e.preventDefault(); comeca(); return; }
  if (!iniciado) { if (k === 'ArrowRight' || k === 'Enter') comeca(); return; }
  if (['ArrowRight', 'PageDown', 'Enter', 'ArrowDown'].includes(k)) { e.preventDefault(); avanca(); }
  else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(k)) { e.preventDefault(); volta(); }
  else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (k === 'm' || k === 'M') { state.calm = !state.calm; marcaCalmo(); }
  else if (k === 'r' || k === 'R') { cena ? semTresD('tecla R') : usa3D(); }
  else if (k === 'Home') vai(1, 0);
});

/* ---------- loop ---------- */
const SEM_QUEDA = new URLSearchParams(location.search).has('teste');
let last = performance.now(), fpsAcc = 0, fpsN = 0, lentoDesde = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const a = audio.update(now / 1000);
  // slides 7 e 11: depois da entrada, tudo para (as falas mais pessoais do deck)
  const aQuieto = n === 11 || n === 7 ? { bass: 0, mid: 0, high: 0, level: 0, kick: 0 } : a;
  cena && cena.render(aQuieto, dt, itens.est);

  fpsAcc += 1 / Math.max(dt, 0.001); fpsN++;
  if (fpsN === 30) {
    const fps = fpsAcc / fpsN;
    if (cena && fps < 24 && !SEM_QUEDA) { lentoDesde ||= now; if (now - lentoDesde > 3000) semTresD('lento: ' + Math.round(fps) + ' fps'); }
    else lentoDesde = 0;
    fpsAcc = 0; fpsN = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* antes do clique: mostra o slide 1 parado, por trás do botão */
$('.slide[data-n="1"]').classList.add('ativo');
stage.dataset.n = 1;
cfgAtual = { n: 1, tema: SLIDES[0].tema, fundo: SLIDES[0].fundo };
cena && cena.setSlide(cfgAtual, true);

const q = new URLSearchParams(location.search);
if (q.has('s')) { start.classList.add('gone'); iniciado = true; vai(+q.get('s'), +(q.get('p') || 0)); }
