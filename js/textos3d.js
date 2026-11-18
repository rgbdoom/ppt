/* ============================================================
   TEXTOS 3D EM CROMO HOLOGRÁFICO
   Todo elemento com data-cromo vira texto extrudado na MESMA fonte
   (Big Shoulders Black), posição e tamanho do HTML: cada linha é medida
   no próprio layout. A face da frente fica no plano z = 0 (coincide com
   o HTML); a extrusão vai para trás.
   - texto que muda (contagem do 794, números do slide 9) é refeito na hora:
     cada letra é uma malha com geometria em cache, então é barato
   - fundo claro (temas C e F, lado direito do slide 11): versão escura
   - data-cromo-parado: sem balanço (slide 11, "depois da entrada, tudo para")
   Se a fonte não carregar, nada muda: o HTML continua visível.
   ============================================================ */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { materialHolo } from './holo.js';

const gsap = window.gsap;
const FONTE = './lib/three/examples/fonts/big_shoulders_black.typeface.json';
const CLAROS = new Set(['C', 'F']);

/* posição de um elemento no palco 1920×1080, ignorando transforms (animações de entrada) */
function noPalco(el, stage) {
  let x = 0, y = 0;
  for (let e = el; e && e !== stage; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y };
}

/* mede uma linha: início, fim e linha de base, com sondas de largura zero */
function mede(el, stage) {
  const sonda = () => {
    const i = document.createElement('i');
    i.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
    return i;
  };
  const a = sonda(), b = sonda();
  el.prepend(a); el.append(b);
  const pa = noPalco(a, stage), pb = noPalco(b, stage);
  a.remove(); b.remove();
  return { x0: pa.x, x1: pb.x, base: pa.y, fs: parseFloat(getComputedStyle(el).fontSize) };
}

export function createTextos3d(scene, envs, pxX, pxY, U) {
  const stage = document.getElementById('stage');
  const grupo = new THREE.Group();
  scene.add(grupo);

  /* [frente, laterais]: laterais um pouco mais foscas, pra ler a extrusão */
  const MAT = {
    claro: [materialHolo(envs.claro), materialHolo(envs.claro, { fosco: true })],
    escuro: [materialHolo(envs.escuro), materialHolo(envs.escuro, { fosco: true })],
  };

  let font = null, pronto = false, nAtual = 0, temaAtual = 'E', t = 0;
  const cacheGeo = new Map();
  function geoLetra(c, fs) {
    const k = c + '|' + fs;
    let g = cacheGeo.get(k);
    if (g) return g;
    const tam = fs * U, prof = tam * 0.16, bisel = tam * 0.018;
    g = new TextGeometry(c, {
      font, size: tam, depth: prof, curveSegments: 10,
      bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel * 0.7, bevelSegments: 4,
    });
    g.translate(0, 0, -(prof + bisel));
    cacheGeo.set(k, g);
    return g;
  }

  /* um item é uma linha de texto: um grupo com uma malha por letra */
  function monta(it) {
    const m = mede(it.ln, stage);
    it.txt = it.ln.textContent;
    const txt = it.txt.replace(/\s+/g, ' ').trim().toUpperCase();
    it.letras.clear();
    const res = font.data.resolution, esc = m.fs * U / res;
    let pen = 0;
    const pos = [];
    for (const c of txt) {
      const gl = font.data.glyphs[c];
      if (c !== ' ' && gl) pos.push([c, pen]);
      pen += (gl ? gl.ha : res * 0.25) * esc;
    }
    // largura de avanço da fonte vs. largura medida no HTML (inclui letter-spacing): corrige em x
    const largura = (m.x1 - m.x0) * U, sx = pen > 0 ? largura / pen : 1;
    const alt = m.fs * U * 0.72;
    for (const [c, x] of pos) {
      const mesh = new THREE.Mesh(geoLetra(c, m.fs), it.mats);
      mesh.position.set((x - pen / 2) * sx, -alt / 2, 0);
      mesh.scale.x = sx;
      it.letras.add(mesh);
    }
    it.g.position.set(pxX(m.x0) + largura / 2, pxY(m.base) + alt / 2, 0);
  }

  const porSlide = new Map();   // n -> [item]
  function constroi(n) {
    if (porSlide.has(n)) return porSlide.get(n);
    const sec = document.querySelector(`.slide[data-n="${n}"]`), lista = [];
    sec && sec.querySelectorAll('[data-cromo]').forEach(el => {
      // fundo claro pede o cromo escuro; no slide 11 o lado direito é claro
      const claro = el.closest('.lado.dir') ? true : el.closest('.lado.esq') ? false : CLAROS.has(temaAtual);
      const lns = el.querySelectorAll('.ln');
      (lns.length ? [...lns] : [el]).forEach(ln => {
        const g = new THREE.Group(), letras = new THREE.Group();
        g.add(letras); g.visible = false; grupo.add(g);
        const it = { ln, g, letras, mats: MAT[claro ? 'escuro' : 'claro'], parado: el.hasAttribute('data-cromo-parado'),
          lento: el.hasAttribute('data-cromo-lento'), tensao: el.hasAttribute('data-cromo-tensao'),
          alpha: { v: 0 }, i: lista.length, txt: null, desde: 0 };
        monta(it);
        lista.push(it);
      });
    });
    porSlide.set(n, lista);
    return lista;
  }

  function mostra(n, instantaneo) {
    for (const [k, lista] of porSlide) {
      if (k === n) continue;
      lista.forEach(o => { gsap.killTweensOf(o.alpha); gsap.to(o.alpha, { v: 0, duration: instantaneo ? 0 : 0.45, ease: 'power2.in' }); });
    }
    constroi(n).forEach((o, i) => {
      gsap.killTweensOf(o.alpha);
      o.desde = t;
      // a virada (slide 7): mesmo entrando em corte seco, as linhas chegam uma a uma, devagar
      if (o.lento) { gsap.fromTo(o.alpha, { v: 0 }, { v: 1, duration: 2.4, ease: 'expo.out', delay: 0.5 + i * 0.75 }); return; }
      if (instantaneo) { o.alpha.v = 1; return; }
      gsap.fromTo(o.alpha, { v: 0 }, { v: 1, duration: 1.3, ease: 'expo.out', delay: 0.15 + i * 0.12 });
    });
  }

  new FontLoader().load(FONTE, f => {
    font = f;
    // só esconde o HTML quando o 3D está pronto (fontes do CSS também, pra medir certo)
    document.fonts.ready.then(() => {
      stage.classList.add('cromo-3d');
      pronto = true;
      mostra(nAtual, true);
      console.info('[2026] textos 3D holográficos prontos');
    });
  }, undefined, () => console.warn('[2026] fonte 3D não carregou: textos ficam em HTML'));

  function setSlide(n, instantaneo, tema) {
    nAtual = n; if (tema) temaAtual = tema;
    if (pronto) mostra(n, instantaneo);
  }

  function render(a, dt, calmo) {
    t += dt;
    for (const [k, lista] of porSlide) {
      for (const o of lista) {
        const al = o.alpha.v;
        o.g.visible = al > 0.003;
        if (!o.g.visible) continue;
        if (k === nAtual && o.ln.textContent !== o.txt) monta(o);   // número mudou: refaz a linha
        const quieto = calmo || o.parado;
        // entrada: sobe de trás e gira até assentar; depois, um balanço lento que faz o reflexo correr
        const balanco = quieto ? 0 : Math.sin(t * 0.45 + o.i * 0.9) * 0.07 + a.bass * 0.05;
        o.letras.rotation.y = (1 - al) * 0.9 + balanco;
        o.letras.rotation.x = (1 - al) * -0.5 + (quieto ? 0 : Math.sin(t * 0.33 + o.i) * 0.035);
        o.g.position.z = (1 - al) * -6;
        let esc = (0.85 + 0.15 * al) * (1 + (quieto ? 0 : a.kick * 0.015));
        if (o.tensao) {
          // tensão: o texto vem chegando devagar (~5% maior em 40 s) e treme de leve
          const dt0 = Math.min(40, t - o.desde);
          o.g.position.z += dt0 * 0.032;
          if (!calmo) {
            o.letras.rotation.z = Math.sin(t * 23 + o.i * 3) * 0.0025 + Math.sin(t * 37 + o.i) * 0.0015;
            o.letras.rotation.y += Math.sin(t * 0.21 + o.i * 1.4) * 0.05;
          }
        }
        o.g.scale.setScalar(Math.max(1e-3, esc));
      }
    }
  }

  function dispose() {
    for (const g of cacheGeo.values()) g.dispose();
    cacheGeo.clear(); porSlide.clear();
    grupo.clear(); scene.remove(grupo);
    [...MAT.claro, ...MAT.escuro].forEach(m => m.dispose());
    stage.classList.remove('cromo-3d');
  }

  return { setSlide, render, dispose };
}
