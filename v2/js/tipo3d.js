/* ============================================================
   TÍTULOS 3D · v2 (cromo iridescente)
   Os títulos marcados com data-cromo viram texto extrudado em cromo,
   na MESMA fonte (Unbounded Black), posição e tamanho do HTML:
   cada linha é medida no próprio layout (sem chute de coordenadas).
   A face da frente fica no plano z = 0 (coincide com o HTML);
   a extrusão vai para trás, e a perspectiva mostra as laterais.
   Se a fonte não carregar, nada muda: o HTML continua visível.
   ============================================================ */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const gsap = window.gsap;
const FONTE = './fontes/unbounded_black.typeface.json';

/* posição de um elemento no palco 1920×1080, ignorando transforms (animações de entrada) */
function noPalco(el, stage) {
  let x = 0, y = 0;
  for (let e = el; e && e !== stage; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y };
}

/* mede uma linha de texto: início, fim e linha de base, com sondas de largura zero */
function mede(el, stage) {
  const sonda = () => {
    const i = document.createElement('i');
    i.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0';
    return i;
  };
  const a = sonda(), b = sonda();
  el.prepend(a); el.append(b);
  const pa = noPalco(a, stage), pb = noPalco(b, stage);
  a.remove(); b.remove();
  return { x0: pa.x, x1: pb.x, base: pa.y, fs: parseFloat(getComputedStyle(el).fontSize) };
}

export function createTipo3d(scene, frente, pxX, pxY, U) {
  const stage = document.getElementById('stage');
  const grupo = new THREE.Group();
  scene.add(grupo);

  /* frente: cromo iridescente (vem da cena) · laterais: o mesmo, mais fosco, pra ler a extrusão */
  const lado = frente.clone(); lado.roughness = 0.3; lado.envMapIntensity = 1.1;

  let font = null, nAtual = 0, t = 0;
  const porSlide = new Map();   // n -> [{ g, alpha }]

  function constroi(n) {
    if (porSlide.has(n)) return porSlide.get(n);
    const sec = document.querySelector(`.slide[data-n="${n}"]`);
    const lista = [];
    if (sec) {
      sec.querySelectorAll('[data-cromo]').forEach(el => {
        const linhas = el.querySelectorAll('.ln');
        (linhas.length ? [...linhas] : [el]).forEach(ln => {
          const txt = ln.textContent.trim().toUpperCase();
          if (!txt) return;
          const m = mede(ln, stage);
          const tam = m.fs * U, prof = tam * 0.16, bisel = tam * 0.018;
          const geo = new TextGeometry(txt, {
            font, size: tam, depth: prof, curveSegments: 12,
            bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel * 0.7, bevelSegments: 5,
          });
          // largura de avanço da fonte vs. largura medida no HTML (inclui letter-spacing): corrige em x
          const res = font.data.resolution;
          const avanco = [...txt].reduce((s, c) => s + ((font.data.glyphs[c] || {}).ha || 0), 0) * tam / res;
          const largura = (m.x1 - m.x0) * U;
          const sx = avanco > 0 ? largura / avanco : 1;
          // pivô no centro da linha (pra girar sem sair do lugar); frente em z = 0
          const alturaCaixa = tam * 0.72;
          geo.translate(-avanco / 2, -alturaCaixa / 2, -(prof + bisel));
          const mesh = new THREE.Mesh(geo, [frente, lado]);
          mesh.scale.x = sx;
          const g = new THREE.Group();
          g.add(mesh);
          g.position.set(pxX(m.x0) + largura / 2, pxY(m.base) + alturaCaixa / 2, 0);
          g.visible = false;
          grupo.add(g);
          lista.push({ g, mesh, alpha: { v: 0 }, i: lista.length });
        });
      });
    }
    porSlide.set(n, lista);
    return lista;
  }

  function mostra(n, instantaneo) {
    for (const [k, lista] of porSlide) {
      if (k === n) continue;
      lista.forEach(o => {
        gsap.killTweensOf(o.alpha);
        gsap.to(o.alpha, { v: 0, duration: instantaneo ? 0 : 0.45, ease: 'power2.in' });
      });
    }
    constroi(n).forEach((o, i) => {
      gsap.killTweensOf(o.alpha);
      if (instantaneo) { o.alpha.v = 1; return; }
      gsap.fromTo(o.alpha, { v: 0 }, { v: 1, duration: 1.3, ease: 'expo.out', delay: 0.15 + i * 0.12 });
    });
  }

  new FontLoader().load(FONTE, f => {
    font = f;
    // só esconde o HTML quando o 3D está pronto (fontes do CSS também, pra medir certo)
    document.fonts.ready.then(() => {
      stage.classList.add('cromo-3d');
      mostra(nAtual, true);
      console.info('[2026] textos 3D cromados prontos');
    });
  }, undefined, () => console.warn('[2026] fonte 3D não carregou: títulos ficam em HTML'));

  function setSlide(n, instantaneo) {
    nAtual = n;
    if (font && stage.classList.contains('cromo-3d')) mostra(n, instantaneo);
  }

  function render(a, dt, calmo) {
    t += dt;
    for (const lista of porSlide.values()) {
      for (const o of lista) {
        const al = o.alpha.v;
        o.g.visible = al > 0.003;
        if (!o.g.visible) continue;
        // entrada: sobe de trás e gira até assentar; depois, um balanço lento que faz o reflexo correr
        const balanco = calmo ? 0 : Math.sin(t * 0.45 + o.i * 0.9) * 0.07 + a.bass * 0.05;
        o.mesh.rotation.y = (1 - al) * 0.9 + balanco;
        o.mesh.rotation.x = (1 - al) * -0.5 + (calmo ? 0 : Math.sin(t * 0.33 + o.i) * 0.035);
        o.g.position.z = (1 - al) * -6;
        o.g.scale.setScalar(Math.max(1e-3, (0.85 + 0.15 * al) * (1 + (calmo ? 0 : a.kick * 0.015))));
      }
    }
  }

  function dispose() {
    for (const lista of porSlide.values()) lista.forEach(o => o.mesh.geometry.dispose());
    porSlide.clear();
    grupo.clear(); scene.remove(grupo);
    lado.dispose();
    stage.classList.remove('cromo-3d');
  }

  return { setSlide, render, dispose };
}
