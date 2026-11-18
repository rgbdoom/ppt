/* ============================================================
   2026 EM DOSES · controle do deck
   Navegação: → / PageDown / Enter / clique = avança · ← / PageUp = volta
   ESPAÇO música · F tela cheia · M modo calmo · R modo reserva (sem 3D)
   ?teste na URL desliga a queda automática para a reserva
   ============================================================ */
import { createAudio, BEAT } from './audio.js';
import { createReserva } from './reserva.js';
import { criaItens } from './itens.js';
import { SLIDES, layout } from './layouts.js';
import { FASES, SUBS } from './dados.js';
import { portao } from './portao.js';
import { abreCanal } from './canal.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const gsap = window.gsap;
const pad = (n, w = 2) => String(n).padStart(w, '0');
const milhar = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const plural = (n, s, p) => (n === 1 ? s : p);

/* ---------- palco escalado ---------- */
const stage = $('#stage');
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
}
addEventListener('resize', fit); fit();

/* ---------- slides 2–6 montados a partir dos dados (mesma fonte do slide 9) ---------- */
FASES.forEach((f, i) => {
  const sec = $(`.slide[data-n="${i + 2}"]`);
  sec.innerHTML = `
    <div class="chip mono" data-in>FASE ${f.n} / 5</div>
    <h2 class="display titulo-fase" data-split data-cromo><span class="ln">${f.titulo}</span></h2>
    <ul class="subs">${f.comp.map(c => `
      <li data-in><b>${SUBS[c.sub].titulo} ${c.diaria}/dia</b>
      <span class="mono">${c.qtd} ${plural(c.qtd, 'COMPRIMIDO', 'COMPRIMIDOS')} DE ${c.unid.toUpperCase()}</span></li>`).join('')}
    </ul>
    <p class="anchor" data-in>${f.compDia} ${plural(f.compDia, 'comprimido', 'comprimidos')} por dia</p>
    <div class="contador" data-in><span class="mono">COMPRIMIDOS ${f.periodo}</span><span class="display respira" data-cromo>${f.compTotal}</span></div>`;
});

/* régua das fases: largura proporcional aos dias, igual nos slides 2–6 e 9 */
$('#linha').innerHTML = FASES.map(f => `<div class="seg" style="flex:${f.dias}"><span class="mono">${f.n} · ${f.curto}</span></div>`).join('');
function marcaFase(i) {
  $$('#linha .seg').forEach((s, k) => { s.classList.toggle('atual', k === i); s.classList.toggle('feita', k < i); });
}

/* ---------- estado ---------- */
const state = { calm: matchMedia('(prefers-reduced-motion: reduce)').matches };
const audio = createAudio($('#trilha'));
const itens = criaItens();

/* ---------- 3D ou reserva ---------- */
let cena = null, reserva = null, ativo = null, cfgAtual = null;
const temWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

function usaReserva(motivo) {
  if (!reserva) reserva = createReserva($('#reserva'), state);
  if (cena) { cena.dispose(); cena = null; }
  $('#gl').hidden = true; $('#reserva').hidden = false;
  ativo = reserva;
  if (cfgAtual) reserva.setSlide(cfgAtual);
  if (motivo) console.info('[2026] modo reserva:', motivo);
}
async function usa3D() {
  try {
    if (!temWebGL()) throw new Error('sem WebGL');
    const { createCena } = await import('./cena3d.js');
    cena = createCena($('#gl'), state);
    $('#gl').hidden = false; $('#reserva').hidden = true;
    ativo = cena;
    if (cfgAtual) cena.setSlide(cfgAtual, true);
  } catch (e) { usaReserva(e.message || e); }
}
await usa3D();

/* ---------- centro dos círculos do fundo, por slide ---------- */
const CENTROS = { 1: [1500, 600], 7: [960, 540], 8: [1350, 480], 9: [1250, 600], 10: [960, 370], 11: [960, 540], 12: [960, 540], 13: [1500, 600] };
const zonasDe = n => ({ centro: CENTROS[n] || (n >= 2 && n <= 6 ? [1380, 470] : [960, 540]) });

/* ---------- rótulos dos objetos (diff por chave, entram e saem suavemente) ---------- */
const rotulos = new Map();
function syncRotulos(lista) {
  const vivos = new Set();
  lista.forEach((l, i) => {
    vivos.add(l.key);
    if (rotulos.has(l.key)) {   // mesmo rótulo em outro lugar: anda junto com o objeto
      gsap.to(rotulos.get(l.key), { left: l.x, top: l.y, duration: 1.2, ease: 'expo.inOut' });
      return;
    }
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

/* ---------- entrada e saída do texto de cada slide ---------- */
function entra(sec, corte) {
  sec.classList.add('ativo');
  gsap.set(sec, { opacity: 1 });
  if (corte) return;
  $$('[data-split]', sec).forEach(el => {
    const lns = $$('.ln', el);
    gsap.fromTo(lns, { yPercent: 100, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
      { yPercent: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
  });
  gsap.fromTo($$('[data-in]', sec), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.3 });
}
function sai(sec, corte) {
  if (corte) { sec.classList.remove('ativo'); return; }
  gsap.to(sec, { opacity: 0, duration: 0.45, ease: 'power2.in', onComplete: () => sec.classList.remove('ativo') });
}

/* ---------- navegação ---------- */
let n = 1, passo = 0, iniciado = false;
let canal = null;   // ligado depois da senha

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
    stage.dataset.tema = cfg.tema;
    $('#num-slide').textContent = `SLIDE ${pad(novoN)} / ${pad(SLIDES.length)}`;
    cfgAtual = { n: novoN, tema: cfg.tema, fundo: cfg.fundo, ...zonasDe(novoN) };
    ativo && ativo.setSlide(cfgAtual, corte);
  }
  n = novoN; passo = novoPasso;

  const { items, labels } = layout(n, passo);
  itens.sync(items, { calmo: corte });
  syncRotulos(labels);

  // régua das fases
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

/* ---------- ganchos de cada slide ---------- */
const troca = (el, texto) => gsap.timeline()
  .to(el, { yPercent: -40, opacity: 0, duration: 0.25, ease: 'power2.in' })
  .add(() => { el.textContent = texto; })
  .fromTo(el, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });

function adesivo(el, mostra) {
  gsap.killTweensOf(el);
  if (mostra) gsap.fromTo(el, { opacity: 0, scale: 1.1, rotate: -6 }, { opacity: 1, scale: 1, rotate: -5, duration: 0.5, ease: 'expo.out', delay: 0.4 });
  else gsap.to(el, { opacity: 0, duration: 0.25 });
}

const ganchos = {
  8(p) {
    $$('.s8 .regra').forEach((r, i) => {
      r.classList.toggle('atual', i === p);
      gsap.to(r, { opacity: i <= p ? 1 : 0, y: i <= p ? 0 : 30, duration: 0.7, ease: 'expo.out' });
    });
    adesivo($('.s8 .meme-prev'), p === 0);   // no máximo 1 imagem por vez
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
      .fromTo(ch, { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.15, ease: 'steps(2)' })
      .to(ch, { opacity: 0, duration: 0.1, delay: 1.85 });
  },
  10() {
    const c = { v: 0 }, el = $('#n794');
    gsap.to(c, { v: 794, duration: 6.5, ease: 'power1.inOut', delay: 0.4, onUpdate: () => { el.textContent = Math.round(c.v); } });
  },
  11() {
    const r = $('.s11 .risco');
    gsap.fromTo(r, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.out', delay: 0.9 });
    adesivo($('.s11 .meme-berlim'), true);
    // 1.009 se monta a partir de fatias (fragmento → inteiro) e depois tudo para
    const el = $('#n1009');
    gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'expo.inOut', delay: 0.3 });
  },
};

/* ---------- loop ---------- */
const SEM_QUEDA = new URLSearchParams(location.search).has('teste');
let last = performance.now(), fpsAcc = 0, fpsN = 0, lentoDesde = 0;
/* ?simula na URL: batida falsa a 135 BPM, pra ver as reações visuais sem som */
const SIMULA = new URLSearchParams(location.search).has('simula');
function simula(t) {
  const fb = (t / BEAT) % 1, k = Math.exp(-fb * 9);
  return { bass: 0.35 + 0.55 * k, mid: 0.4 + 0.3 * Math.sin(t * 3) ** 2, high: 0.3 + 0.3 * Math.sin(t * 7) ** 2, level: 0.5, kick: k };
}

function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const a = SIMULA ? simula(now / 1000) : audio.update(now / 1000);

  // números grandes "respiram" no peso da fonte variável com o grave (nunca no slide 7 e 11)
  const w = state.calm || n === 7 || n === 11 ? 900 : Math.round(620 + a.bass * 280);
  // (os que viraram cromo 3D ficam de fora: o peso mudando mexeria na medida do texto)
  $$('.slide.ativo :is(.respira, .titulo-abertura, .obrigado):not([data-cromo])').forEach(el => {
    el.style.fontVariationSettings = `"opsz" 72, "wght" ${w}`;
  });

  // slide 11: depois da entrada, tudo para (a fala é a mais pessoal do deck)
  const aQuieto = n === 11 || n === 7 ? { bass: 0, mid: 0, high: 0, level: 0, kick: 0 } : a;
  ativo && ativo.render(aQuieto, dt, itens.est);

  fpsAcc += 1 / Math.max(dt, 0.001); fpsN++;
  if (fpsN === 30) {
    const fps = fpsAcc / fpsN;
    if (cena && fps < 24 && !SEM_QUEDA) { lentoDesde ||= now; if (now - lentoDesde > 3000) usaReserva('lento: ' + Math.round(fps) + ' fps'); }
    else lentoDesde = 0;
    fpsAcc = 0; fpsN = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* antes da senha e do clique: o slide 1 já aparece (e se mexe) por trás da tela de senha */
$('.slide[data-n="1"]').classList.add('ativo');
cfgAtual = { n: 1, tema: 'E', fundo: SLIDES[0].fundo, ...zonasDe(1) };
ativo && ativo.setSlide(cfgAtual, true);

/* ---------- senha antes de tudo (bloqueio simples) ---------- */
const sala = await portao();

/* ---------- controle pelo celular (treino.html): o celular manda 'vai', a apresentação responde 'pos' ---------- */
canal = abreCanal(sala, m => {
  if (m.tipo !== 'vai') return;
  if (!iniciado) { start.classList.add('gone'); iniciado = true; }   // a música ainda precisa de um toque aqui
  vai(m.s, m.p || 0, { remoto: true });
});

/* ---------- início: o navegador só libera som depois de um gesto ---------- */
const start = $('#start');
async function comeca() {
  if (!iniciado) {
    start.classList.add('gone');
    vai(1, 0);
    iniciado = true;
  }
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
  else if (k === 'm' || k === 'M') state.calm = !state.calm;
  else if (k === 'r' || k === 'R') { cena ? usaReserva('tecla R') : usa3D(); }
  else if (k === 'Home') vai(1, 0);
});


/* atalho de teste: ?s=9&p=2 abre direto num slide/passo */
const q = new URLSearchParams(location.search);
if (q.has('s')) { start.classList.add('gone'); iniciado = true; vai(+q.get('s'), +(q.get('p') || 0)); }
