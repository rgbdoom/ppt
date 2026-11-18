/* ============================================================
   CENA 3D · v2 (maximalista)
   - fundo: gradiente de manchas que se movem + padrões gráficos por slide
     (xadrez ondulado, raios, retícula), tudo reagindo à música
   - comprimidos de bala (plástico com verniz), cada substância com sua cor
   - seringas "de brinquedo": corpo translúcido, líquido colorido, êmbolo colorido
   - grade das 794 seringas, colorida pela capacidade
   - enfeites inflados em cromo iridescente
   - títulos em cromo iridescente extrudado (js/tipo3d.js)
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { SPEC, BICO, ordemSeringas } from '../../js/dados.js';
import { createTipo3d } from './tipo3d.js';

const gsap = window.gsap;
export const COR = {
  uva: 0x5b2bff, lilas: 0xc9b8ff, lima: 0xd4ff3a, laranja: 0xff5b1f, chiclete: 0xff6fd8,
  cobalto: 0x1f3bff, creme: 0xfff4e2, tinta: 0x140a33, sol: 0xffc81f, ciano: 0x22d3ff, menta: 0x9dff6b,
};
/* fundo de cada tema: base + 3 manchas + cor dos padrões (iguais ao css/v2.css) */
const TEMAS = {
  uva: { bg: COR.uva, b: [COR.chiclete, COR.cobalto, COR.laranja], ink: COR.creme },
  lima: { bg: COR.lima, b: [COR.menta, COR.creme, COR.lilas], ink: COR.tinta },
  cobalto: { bg: COR.cobalto, b: [COR.uva, COR.ciano, COR.chiclete], ink: COR.creme },
  laranja: { bg: COR.laranja, b: [COR.chiclete, COR.sol, COR.uva], ink: COR.tinta },
  chiclete: { bg: COR.chiclete, b: [COR.laranja, COR.lilas, COR.uva], ink: COR.tinta },
  creme: { bg: COR.creme, b: [COR.lilas, 0xffc2ec, COR.lima], ink: COR.tinta },
  noite: { bg: COR.tinta, b: [COR.uva, 0x2a1466, 0x3a0f55], ink: COR.creme },
  quieto: { bg: COR.tinta, b: [COR.tinta, COR.tinta, COR.tinta], ink: COR.creme },
  split: { bg: COR.uva, b: [COR.uva, COR.uva, COR.uva], ink: COR.creme },
};
/* cor de cada substância: a mesma no comprimido, no líquido da seringa e nos rótulos */
export const SUB_COR = {
  fluox: [COR.chiclete, COR.creme], vort: [COR.lima], bup: [COR.laranja], nal: [COR.lilas], topi: [COR.sol],
};

/* câmera fixa: 1 px do palco = U unidades no plano z = 0 */
const CAM_Z = 27, FOV = 28;
const U = (2 * CAM_Z * Math.tan((FOV / 2) * Math.PI / 180)) / 1080;
const pxX = x => (x - 960) * U, pxY = y => (540 - y) * U;

/* ambiente colorido para o cromo iridescente: faixas da paleta por elevação */
function ambienteColorido(renderer) {
  const geo = new THREE.SphereGeometry(50, 64, 256), pos = geo.attributes.position, cor = [];
  const c = h => new THREE.Color(h);
  const faixas = [   // [elevação em graus, cor]
    [-90, c(COR.tinta)], [-30, c(COR.cobalto)], [-12, c(COR.uva)], [-9, c(COR.lima)], [-6, c(COR.tinta)],
    [0, c(COR.uva)], [3, c(COR.chiclete)], [5, c(0xffffff)], [7, c(COR.laranja)], [14, c(COR.lilas)], [40, c(0xffffff)], [90, c(COR.creme)],
  ];
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const e = Math.asin(Math.max(-1, Math.min(1, pos.getY(i) / 50))) * 180 / Math.PI;
    let k = 0; while (k < faixas.length - 2 && e > faixas[k + 1][0]) k++;
    const [e0, c0] = faixas[k], [e1, c1] = faixas[k + 1];
    tmp.copy(c0).lerp(c1, THREE.MathUtils.clamp((e - e0) / (e1 - e0), 0, 1));
    cor.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  const cena = new THREE.Scene();
  cena.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pmrem = new THREE.PMREMGenerator(renderer), tex = pmrem.fromScene(cena, 0).texture;
  pmrem.dispose(); geo.dispose();
  return tex;
}

export function createCena(container, state) {
  /* ---------- base ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(1920, 1080, false);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1920 / 1080, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const estudio = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const colorido = ambienteColorido(renderer);

  /* ---------- materiais ---------- */
  const balas = {};
  const bala = hex => balas[hex] || (balas[hex] = new THREE.MeshPhysicalMaterial({
    color: hex, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
    sheen: 0.5, sheenRoughness: 0.4, sheenColor: 0xffffff, envMap: estudio, envMapIntensity: 1.15,
  }));
  const irid = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6,
    iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 820, envMap: colorido, envMapIntensity: 1.5,
  });
  const corpoSer = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.06, metalness: 0, clearcoat: 1, envMap: estudio, envMapIntensity: 1.3,
    transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
  });
  const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.18, envMap: estudio, envMapIntensity: 1.2 });
  const escalaMat = new THREE.LineBasicMaterial({ color: COR.tinta, transparent: true, opacity: 0.55 });

  const lathe = (perfil, seg = 64) => new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  /* ---------- títulos em cromo iridescente ---------- */
  const tipo = createTipo3d(scene, irid, pxX, pxY, U);

  /* ---------- comprimidos de bala ---------- */
  function meiaCapsula(r, h) {   // metade de cima de uma cápsula (para a cápsula de duas cores)
    const pts = [];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; pts.push([Math.sin(a) * r, h / 2 + Math.cos(a) * r]); }
    pts.push([r, 0]);
    return lathe(pts, 48);
  }
  function discoRedondo(R, t, e) {   // pastilha com borda arredondada
    const pts = [[0, t / 2], [R - e, t / 2]];
    for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([R - e + Math.sin(a) * e, Math.cos(a) * t / 2]); }
    pts.push([0, -t / 2]);
    return lathe(pts, 64).rotateX(Math.PI / 2);
  }
  function hexInflado(R, t) {
    const s = new THREE.Shape();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; i ? s.lineTo(Math.cos(a) * R, Math.sin(a) * R) : s.moveTo(Math.cos(a) * R, Math.sin(a) * R); }
    const g = new THREE.ExtrudeGeometry(s, { depth: t * 0.4, bevelEnabled: true, bevelThickness: t * 0.3, bevelSize: R * 0.12, bevelSegments: 6, curveSegments: 1 });
    g.center(); return g;
  }
  const geoCache = {};
  const geo = (k, f) => geoCache[k] || (geoCache[k] = f());
  function criaPilula(forma, sub) {
    const cores = SUB_COR[sub] || [COR.lima];
    const outer = new THREE.Group(), m = new THREE.Group();
    outer.add(m);
    if (forma === 'capsula') {
      const cima = new THREE.Mesh(geo('meia', () => meiaCapsula(0.32, 0.85)), bala(cores[0]));
      const baixo = new THREE.Mesh(geo('meia', () => meiaCapsula(0.32, 0.85)), bala(cores[1] || cores[0]));
      baixo.rotation.x = Math.PI;
      m.add(cima, baixo);
    } else {
      const g = {
        disco: () => discoRedondo(0.48, 0.22, 0.1),
        oblongo: () => new THREE.CapsuleGeometry(0.28, 0.8, 12, 40).scale(1, 1, 0.62),
        discoP: () => discoRedondo(0.38, 0.26, 0.12),
        hex: () => hexInflado(0.46, 0.24),
      }[forma];
      m.add(new THREE.Mesh(geo(forma, g), bala(cores[0])));
    }
    return {
      outer,
      update(st, t, a, calmo, i) {
        m.rotation.y = t * 0.7 + i * 0.9 + (calmo ? 0 : a.bass * 0.6);
        m.rotation.x = Math.sin(t * 0.5 + i) * 0.35;
        m.rotation.z = Math.sin(t * 0.3 + i * 2) * 0.25;
        m.position.y = calmo ? 0 : Math.sin(t * 1.3 + i * 0.8) * 0.12;
      },
    };
  }

  /* ---------- seringa de brinquedo ---------- */
  const AG = {
    '13x4,5': { hr: 0.15, hh: 0.32, nr: 0.02, nl: 1.3, cor: 0x8a5a3a },
    '25x7': { hr: 0.19, hh: 0.4, nr: 0.03, nl: 2.5, cor: COR.tinta },
    '40x12': { hr: 0.24, hh: 0.46, nr: 0.045, nl: 4.0, cor: 0xff4fa3 },
  };
  function agulha(tipo) {
    const a = AG[tipo], g = new THREE.Group();
    const canhao = new THREE.Mesh(new THREE.CylinderGeometry(a.hr, a.hr * 0.6, a.hh, 32), bala(a.cor));
    canhao.position.y = -a.hh / 2;
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(a.nr, a.nr, a.nl, 12), metal);
    haste.position.y = -a.hh - a.nl / 2;
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(a.nr, a.nr * 6, 12), metal);
    ponta.rotation.x = Math.PI; ponta.position.y = -a.hh - a.nl - a.nr * 3;
    g.add(canhao, haste, ponta);
    return g;
  }
  function escalaGeo(cap) {
    const { L, R } = SPEC[cap], menor = { 1: 0.1, 3: 0.1, 5: 0.2 }[cap], maior = { 1: 0.5, 3: 0.5, 5: 1 }[cap];
    const pts = [];
    for (let v = 0; v <= cap + 1e-6; v += menor) {
      const y = -L / 2 + (v / cap) * L, ehMaior = Math.abs(v / maior - Math.round(v / maior)) < 1e-4;
      const n = 40, arco = ehMaior ? 0.5 : 0.22;
      for (let i = 0; i < n * arco; i++) {
        const a0 = (i / n) * Math.PI * 2 + Math.PI * 0.25, a1 = ((i + 1) / n) * Math.PI * 2 + Math.PI * 0.25;
        pts.push(Math.cos(a0) * (R + 0.006), y, Math.sin(a0) * (R + 0.006), Math.cos(a1) * (R + 0.006), y, Math.sin(a1) * (R + 0.006));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }
  function criaSeringa(cap, sub) {
    const { L, R, F } = SPEC[cap], base = -L / 2;
    const corLiq = (SUB_COR[sub] || [COR.lima])[0];
    const outer = new THREE.Group(), eixo = new THREE.Group(), peca = new THREE.Group();
    outer.add(eixo); eixo.add(peca);
    peca.position.y = L / 2 + BICO;           // a origem do objeto é a ponta do bico
    outer.rotation.z = Math.PI / 2;           // horizontal: êmbolo à esquerda, agulha à direita
    const plastico = bala(COR.uva);
    peca.add(
      new THREE.Mesh(lathe([[0.09, base - BICO], [0.09, base - 0.38], [0.13, base - 0.3], [R, base - 0.04]]), corpoSer),
      new THREE.Mesh(lathe([[R, base - 0.04], [R, L / 2]]), corpoSer),
      new THREE.Mesh(lathe([[R, L / 2], [F, L / 2], [F + 0.04, L / 2 + 0.06], [F, L / 2 + 0.12], [R + 0.02, L / 2 + 0.12]]), plastico),
      new THREE.LineSegments(escalaGeo(cap), escalaMat),
    );
    const liquido = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.93, R * 0.93, 1, 48), bala(corLiq));
    peca.add(liquido);
    const embolo = new THREE.Group();
    const rolha = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.28, 48), bala(COR.tinta));
    rolha.position.y = 0.14;
    const rr = 0.17 * Math.sqrt(R / 0.32);
    const haste = new THREE.Mesh(lathe([[rr, 0.28], [rr, L + 0.3], [F * 0.85, L + 0.3], [F * 0.9, L + 0.38], [F * 0.85, L + 0.46], [0, L + 0.46]]), plastico);
    embolo.add(rolha, haste);
    peca.add(embolo);
    const agulhas = {};
    for (const t of Object.keys(AG)) { const g = agulha(t); g.position.y = base - BICO; g.visible = false; peca.add(g); agulhas[t] = g; }
    return {
      outer,
      update(st, t, a, calmo, i) {
        const v = Math.max(0, Math.min(cap, st.vol || 0)), h = Math.max(1e-4, (v / cap) * L);
        liquido.scale.y = h; liquido.position.y = base + h / 2;
        embolo.position.y = base + h;
        if (st.ag === 'troca') {   // 40x12 puxa da ampola, 25x7 aplica (ciclo de 4 compassos)
          const P = 7.385, c = (t % P) / P;
          const sai = THREE.MathUtils.smoothstep(c, 0.42, 0.52), entra = THREE.MathUtils.smoothstep(c, 0.5, 0.6);
          const volta = THREE.MathUtils.smoothstep(c, 0.92, 1.0);
          const k40 = 1 - sai + volta, k25 = entra * (1 - volta);
          agulhas['40x12'].visible = k40 > 0.01; agulhas['25x7'].visible = k25 > 0.01; agulhas['13x4,5'].visible = false;
          agulhas['40x12'].position.y = base - BICO - (1 - Math.min(1, k40)) * 3;
          agulhas['40x12'].scale.setScalar(Math.max(0.001, Math.min(1, k40)));
          agulhas['25x7'].position.y = base - BICO - (1 - k25) * 3;
          agulhas['25x7'].scale.setScalar(Math.max(0.001, k25));
        } else {
          for (const k in agulhas) { agulhas[k].visible = k === st.ag; agulhas[k].position.y = base - BICO; agulhas[k].scale.setScalar(1); }
        }
        eixo.rotation.y = t * 0.45 + i * 1.3 + (calmo ? 0 : a.bass * 0.4);
        outer.rotation.y = Math.sin(t * 0.35 + i) * 0.22;
      },
    };
  }

  /* ---------- grade de 794 seringas (slide 10), em ordem cronológica, cor por capacidade ---------- */
  function criaGrade() {
    const ordem = ordemSeringas(), COLS = 40, X0 = 112, DX = 43, Y0 = 160, DY = 23, S = 3.5;
    const CORES = { 1: COR.lima, 3: COR.chiclete, 5: COR.laranja };
    const outer = new THREE.Group(), malhas = {}, indices = { 1: [], 3: [], 5: [] };
    ordem.forEach((cap, k) => indices[cap].push(k));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const cap of [1, 3, 5]) {
      const { L, R, F } = SPEC[cap], a = -L / 2 - BICO, top = L / 2 + 0.1 + L * 0.5;
      const g = lathe([[0, a - 2], [0.07, a - 1.9], [0.07, a - 0.35], [0.2, a - 0.3], [0.2, a], [R, -L / 2], [R, L / 2],
        [F, L / 2], [F, L / 2 + 0.1], [0.2, L / 2 + 0.1], [0.2, top], [F * 0.8, top], [F * 0.8, top + 0.15], [0, top + 0.15]], 20);
      g.translate(0, -((a - 2) + (top + 0.15)) / 2, 0);
      const mesh = new THREE.InstancedMesh(g, bala(CORES[cap]), indices[cap].length);
      indices[cap].forEach((k, j) => {
        const col = k % COLS, row = Math.floor(k / COLS);
        v.set(pxX(X0 + col * DX), pxY(Y0 + row * DY), 0); sc.setScalar(S * U);
        mesh.setMatrixAt(j, m4.compose(v, q, sc));
      });
      mesh.count = 0;
      outer.add(mesh); malhas[cap] = { mesh, idx: indices[cap] };
    }
    return {
      outer,
      update(st, t, a, calmo) {
        const lim = Math.round((st.revela || 0) * ordem.length);
        for (const cap of [1, 3, 5]) {
          const { mesh, idx } = malhas[cap];
          let n = 0; while (n < idx.length && idx[n] < lim) n++;
          mesh.count = n;
        }
        outer.rotation.x = calmo ? 0 : Math.sin(t * 0.5) * 0.04;
        outer.rotation.y = calmo ? 0 : Math.sin(t * 0.37) * 0.03;
      },
    };
  }

  /* ---------- enfeites inflados ---------- */
  function estrelaInflada() {
    const s = new THREE.Shape(), N = 8;
    for (let i = 0; i <= N * 2; i++) {
      const a = (i / (N * 2)) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.42 : 1;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.16, bevelSegments: 10, curveSegments: 4 });
    g.center(); g.computeVertexNormals(); return g;
  }
  function criaDeco(forma, cor) {
    const mat = cor ? bala(COR[cor]) : irid;
    const outer = new THREE.Group(), m = new THREE.Group();
    outer.add(m);
    if (forma === 'pilula') {
      const c1 = new THREE.Mesh(geo('meiaG', () => meiaCapsula(0.38, 1.0)), mat);
      const c2 = new THREE.Mesh(geo('meiaG', () => meiaCapsula(0.38, 1.0)), bala(COR.creme));
      c2.rotation.x = Math.PI; m.add(c1, c2);
    } else {
      const g = {
        estrela: () => estrelaInflada(),
        toro: () => new THREE.TorusGeometry(0.7, 0.32, 48, 96),
        bolha: () => new THREE.SphereGeometry(0.85, 64, 48),
      }[forma];
      m.add(new THREE.Mesh(geo('d-' + forma, g), mat));
    }
    return {
      outer,
      update(st, t, a, calmo, i) {
        const lento = calmo ? 0.2 : 1;
        m.rotation.z = t * 0.25 * lento + i;
        m.rotation.y = Math.sin(t * 0.4 + i) * 0.6 * lento + (forma === 'estrela' ? 0 : t * 0.3);
        m.rotation.x = Math.sin(t * 0.3 + i * 1.7) * 0.5 * lento;
        m.position.y = Math.sin(t * 0.9 + i * 1.3) * 0.2 * lento;
        m.scale.setScalar(1 + (calmo ? 0 : a.kick * 0.08));
      },
    };
  }

  /* ---------- fundo: manchas de gradiente + padrões ---------- */
  const cor = h => new THREE.Color(h);
  const U_ = {
    uT: { value: 0 }, uBass: { value: 0 }, uHigh: { value: 0 }, uKick: { value: 0 }, uCalm: { value: 0 },
    uQuieto: { value: 0 }, uSplit: { value: 0 }, uXadrez: { value: 0 }, uRaios: { value: 0 }, uPontos: { value: 0 },
    uBg: { value: cor(COR.uva) }, uB1: { value: cor(COR.chiclete) }, uB2: { value: cor(COR.cobalto) }, uB3: { value: cor(COR.laranja) },
    uInk: { value: cor(COR.creme) }, uLima: { value: cor(COR.lima) },
  };
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U_, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uT, uBass, uHigh, uKick, uCalm, uQuieto, uSplit, uXadrez, uRaios, uPontos;
      uniform vec3 uBg, uB1, uB2, uB3, uInk, uLima;
      varying vec2 vUv;
      float mancha(vec2 p, vec2 c, float r){ vec2 d = (p - c) * vec2(16.0/9.0, 1.0); return exp(-dot(d, d) / (r * r)); }
      void main(){
        vec2 uv = vUv;
        float vivo = (1.0 - uCalm) * (1.0 - uQuieto);
        float t = uT * (0.25 + 0.75 * vivo);
        // leve torção do espaço: as manchas parecem tinta se mexendo
        vec2 w = uv + 0.035 * vec2(sin(uv.y * 5.0 + t * 0.35), cos(uv.x * 4.0 - t * 0.3));
        float g = 1.0 + uBass * 0.25 * vivo;
        float m1 = mancha(w, vec2(0.80, 0.78) + 0.13 * vec2(sin(t * 0.21), cos(t * 0.17)), 0.42 * g);
        float m2 = mancha(w, vec2(0.12, 0.18) + 0.12 * vec2(cos(t * 0.19), sin(t * 0.23)), 0.46 * g);
        float m3 = mancha(w, vec2(0.58, 0.10) + 0.15 * vec2(sin(t * 0.13 + 2.0), cos(t * 0.29)), 0.34 * g);
        vec3 col = uBg;
        col = mix(col, uB2, m2 * 0.95);
        col = mix(col, uB3, m3 * 0.9);
        col = mix(col, uB1, m1 * 0.95);
        col = mix(col, uBg, uQuieto * 0.85);

        // padrões gráficos: xadrez ondulado, raios, retícula (força vem do slide)
        vec2 px = uv * vec2(1920.0, 1080.0);
        vec2 q = px / 96.0; q.y += sin(q.x * 0.45 + t * 0.6) * (0.5 + uBass * 0.6 * vivo); q.x += sin(q.y * 0.3 - t * 0.4) * 0.3;
        float xad = mod(floor(q.x) + floor(q.y), 2.0);
        vec2 c = (uv - vec2(0.82, 0.62)) * vec2(16.0/9.0, 1.0);
        float ang = atan(c.y, c.x) / 6.28318 + 0.5;
        float raio = step(0.5, fract(ang * 28.0 + t * 0.015));
        vec2 cel = fract(px / 22.0) - 0.5;
        float rr = 0.08 + 0.32 * clamp(m1 + m3 * 0.6, 0.0, 1.0) + uKick * 0.06 * vivo;
        float ponto = 1.0 - smoothstep(rr - 0.05, rr + 0.02, length(cel));
        float pad = xad * uXadrez * 0.16 + raio * uRaios * 0.1 + ponto * uPontos * 0.16;
        col = mix(col, uInk, clamp(pad, 0.0, 1.0) * (1.0 - uQuieto));

        // tela dividida (slide 11): metade ultravioleta, metade lima
        col = mix(col, uLima, step(0.5, uv.x) * uSplit);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  fundo.frustumCulled = false; fundo.renderOrder = -1;
  scene.add(fundo);

  /* ---------- pós: separação RGB curta + grão ---------- */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(1920, 1080);
  composer.addPass(new RenderPass(scene, camera));
  const rgb = new ShaderPass(RGBShiftShader); rgb.uniforms.amount.value = 0;
  composer.addPass(rgb);
  const grao = new FilmPass(0.35, false);
  composer.addPass(grao);
  composer.addPass(new OutputPass());

  /* ---------- sincronia com o estado ---------- */
  const objs = new Map();
  let t = 0;
  function cria(st) {
    if (st.k === 'syr') return criaSeringa(st.cap, st.sub);
    if (st.k === 'pill') return criaPilula(st.forma, st.sub);
    if (st.k === 'grade') return criaGrade();
    if (st.k === 'deco') return criaDeco(st.forma, st.cor);
  }

  function render(a, dt, estados) {
    t += dt;
    const calmo = state.calm;
    let i = 0;
    for (const [k, st] of estados) {
      let o = objs.get(k);
      if (!o) { o = cria(st); if (!o) continue; objs.set(k, o); scene.add(o.outer); }
      const al = Math.max(0, st.alpha);
      o.outer.visible = al > 0.01;
      if (st.k !== 'grade') {
        o.outer.position.set(pxX(st.x), pxY(st.y), 0);
        o.outer.scale.setScalar(Math.max(1e-4, st.s * U * al * (1 + (calmo ? 0 : a.kick * 0.03))));
      } else {
        o.outer.scale.setScalar(Math.max(1e-4, al));
      }
      o.update(st, t, a, calmo, i++);
    }
    for (const [k, o] of objs) if (!estados.has(k)) { scene.remove(o.outer); objs.delete(k); }

    tipo.render(a, dt, calmo);
    U_.uT.value = t; U_.uBass.value = a.bass; U_.uHigh.value = a.high; U_.uKick.value = a.kick;
    U_.uCalm.value = calmo ? 1 : 0;
    rgb.uniforms.amount.value = calmo ? 0 : Math.min(0.0035, a.high * 0.0014 + a.kick * 0.0018);
    grao.uniforms.intensity.value = 0.32 + (calmo ? 0 : a.high * 0.2);
    composer.render(dt);
  }

  /* troca de tema e de fundo entre slides: tudo interpolado */
  function setSlide({ n, tema, fundo: f = {} }, instantaneo = false) {
    tipo.setSlide(n, instantaneo);
    const T = TEMAS[tema] || TEMAS.uva, d = instantaneo ? 0 : 1.1, ease = 'power2.inOut';
    const alvo = (c, h) => { const k = new THREE.Color(h); gsap.to(c, { r: k.r, g: k.g, b: k.b, duration: d, ease }); };
    alvo(U_.uBg.value, T.bg); alvo(U_.uB1.value, T.b[0]); alvo(U_.uB2.value, T.b[1]); alvo(U_.uB3.value, T.b[2]); alvo(U_.uInk.value, T.ink);
    for (const [u, v] of [['uXadrez', f.xadrez], ['uRaios', f.raios], ['uPontos', f.pontos], ['uSplit', f.split]])
      gsap.to(U_[u], { value: v || 0, duration: d, ease });
    gsap.to(U_.uQuieto, { value: f.quieto || 0, duration: instantaneo ? 0 : 0.6, ease });
  }

  return {
    render, setSlide,
    dispose() { tipo.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
