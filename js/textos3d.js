/* ============================================================
   TEXTOS 3D CROMADOS
   Cada texto vira geometria extrudada com material cromado (metalness:1),
   o mesmo envMap das seringas. Rotação sutil modulada por áudio.
   ============================================================ */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const gsap = window.gsap;

/* definição dos textos: slide, texto, posição no palco (px), tamanho, profundidade */
const DEFS = [
  { s: 1,  t: '2026',        x: 56,  y: 150, sz: 340, dp: 18 },
  { s: 1,  t: 'EM DOSES',    x: 56,  y: 490, sz: 340, dp: 18 },
  { s: 2,  t: 'JAN',         x: 52,  y: 160, sz: 250, dp: 14 },
  { s: 3,  t: 'FEV\u2013ABR',x: 52,  y: 160, sz: 250, dp: 14 },
  { s: 4,  t: 'MAI\u2013JUN',x: 52,  y: 160, sz: 250, dp: 14 },
  { s: 5,  t: 'JUL\u2013OUT',x: 52,  y: 160, sz: 250, dp: 14 },
  { s: 6,  t: 'NOV\u2013DEZ',x: 52,  y: 160, sz: 250, dp: 14 },
  { s: 8,  t: 'AS REGRAS',   x: 52,  y: 100, sz: 130, dp: 8 },
  { s: 8,  t: 'DO JOGO',     x: 52,  y: 230, sz: 130, dp: 8 },
  { s: 10, t: '794',         x: 52,  y: 40,  sz: 330, dp: 18 },
  { s: 11, t: '794',         x: 96,  y: 250, sz: 300, dp: 16 },
  { s: 11, t: '1.009',       x: 1056,y: 250, sz: 300, dp: 16 },
  { s: 12, t: 'PROXIMOS',    x: 52,  y: 120, sz: 200, dp: 12 },
  { s: 12, t: 'PASSOS',      x: 52,  y: 320, sz: 200, dp: 12 },
  { s: 12, t: 'Usar mais po',x: 52,  y: 540, sz: 140, dp: 8 },
  { s: 13, t: 'OBRIGADO',    x: 52,  y: 300, sz: 380, dp: 20 },
];

export function createTextos3d(scene, envMap, pxX, pxY, state) {
  const grupo = new THREE.Group();
  grupo.renderOrder = 1;
  scene.add(grupo);

  const cromo = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.14,
    envMap, envMapIntensity: 1.25,
  });
  const frente = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.08,
    envMap, envMapIntensity: 1.4,
    transparent: true, opacity: 0.32, depthWrite: false,
  });
  // material escuro para as laterais da extrusão (simula sombra do cromado)
  const lateral = new THREE.MeshStandardMaterial({
    color: 0x333333, metalness: 0.9, roughness: 0.3,
    envMap, envMapIntensity: 0.5,
  });

  let font = null, pronto = false;
  const objs = [];  // { mesh, slide, alpha: {v:0}, grupo }

  const loader = new FontLoader();
  loader.load('./lib/three/examples/fonts/helvetiker_bold.typeface.json',
    f => {
      font = f;
      DEFS.forEach((d, i) => {
        const geo = new TextGeometry(d.t, {
          font,
          size: d.sz * 0.022,
          depth: d.dp * 0.022,
          curveSegments: 16,
          bevelEnabled: true,
          bevelThickness: 0.06,
          bevelSize: 0.04,
        });
        geo.computeBoundingBox();

        // centraliza a geometria
        const bb = geo.boundingBox;
        const cx = (bb.max.x + bb.min.x) / 2;
        const cy = (bb.max.y + bb.min.y) / 2;
        geo.translate(-cx, -cy, 0);

        // materiais: frente brilhante, laterais escuras
        const mats = [frente, lateral];

        const mesh = new THREE.Mesh(geo, mats);
        mesh.position.set(pxX(d.x), pxY(d.y), 0.05);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        const g = new THREE.Group();
        g.add(mesh);
        g.visible = false;
        grupo.add(g);

        objs.push({ mesh: g, def: d, alpha: { v: 0 }, i, slideAtual: -1 });
      });
      pronto = true;
      console.info('[2026] textos 3D prontos:', objs.length);
    },
    undefined,
    () => console.warn('[2026] fonte 3D não carregou')
  );

  let nAtual = 0, tAcum = 0;

  function setSlide(n, instantaneo) {
    if (!pronto) { nAtual = n; return; }
    const calmo = instantaneo;
    nAtual = n;

    objs.forEach(o => {
      const ativo = o.def.s === n;
      if (ativo && o.slideAtual !== n) {
        // entra
        o.slideAtual = n;
        o.mesh.visible = true;
        gsap.killTweensOf(o.alpha);
        gsap.to(o.alpha, {
          v: 1, duration: calmo ? 0.35 : 1.1, ease: 'expo.out',
          delay: calmo ? 0 : 0.2,
        });
      } else if (!ativo && o.slideAtual === n) {
        // sai
        o.slideAtual = -1;
        gsap.killTweensOf(o.alpha);
        gsap.to(o.alpha, {
          v: 0, duration: calmo ? 0.2 : 0.5, ease: 'power2.in',
          onComplete: () => { if (o.alpha.v < 0.01) o.mesh.visible = false; },
        });
      }
    });
  }

  function render(a, t, calmo) {
    if (!pronto) return;
    tAcum += 0.016;
    const rotBase = calmo ? 0 : Math.sin(tAcum * 0.3) * 0.06 + a.bass * 0.04;

    objs.forEach(o => {
      const al = o.alpha.v;
      if (al < 0.005) { o.mesh.visible = false; return; }
      o.mesh.visible = true;

      // escala com alpha + pulso de kick
      const s = al * (1 + (calmo ? 0 : a.kick * 0.04));
      o.mesh.scale.setScalar(Math.max(0.001, s));

      // rotação sutil
      o.mesh.children[0].rotation.y = rotBase * (0.7 + o.i * 0.15);
      o.mesh.children[0].rotation.x = Math.sin(tAcum * 0.25 + o.i * 0.6) * 0.03 * (calmo ? 0.3 : 1);
    });
  }

  function setTema(tema) {
    // ajusta o brilho do cromo conforme o fundo
    const claro = tema === 'C' || tema === 'F';
    const metalHex = claro ? 0x6e6e6e : 0xffffff;
    const alvo = new THREE.Color(metalHex);
    gsap.to(cromo.color, { r: alvo.r, g: alvo.g, b: alvo.b, duration: 1.1, ease: 'power2.inOut' });
    gsap.to(frente.color, { r: alvo.r, g: alvo.g, b: alvo.b, duration: 1.1, ease: 'power2.inOut' });
  }

  function dispose() {
    objs.forEach(o => {
      o.mesh.children.forEach(c => {
        if (c.geometry) c.geometry.dispose();
      });
    });
    grupo.clear();
    cromo.dispose();
    frente.dispose();
    lateral.dispose();
  }

  return { setSlide, render, setTema, dispose };
}