/* ============================================================
   CENA 3D (Three.js)
   - seringas cromadas (1, 3 e 5 mL) com corpo em cromo fumê e líquido fluo
   - comprimidos cromados, uma forma por substância
   - grade de 794 mini seringas (slide 10)
   - grafismo de fundo que reage ao som: círculos cromados (e ondas op-art no slide 8)
   Os objetos são posicionados em px do palco (mesmos px dos rótulos HTML).
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SPEC, BICO, ordemSeringas } from './dados.js';
import { BAR } from './audio.js';
import { createTextos3d } from './textos3d.js';
import { ambienteHolo, materialHolo } from './holo.js';

const gsap = window.gsap;
const HEX = { preto: 0x0b0b0c, papel: 0xf1eee6, concreto: 0x8a8a86, verde: 0xc6ff00, rosa: 0xff2d8a };
export const TEMAS = {
  E: { bg: HEX.preto, ink: HEX.papel },
  C: { bg: HEX.papel, ink: HEX.preto },
  F: { bg: HEX.verde, ink: HEX.preto },
  S: { bg: HEX.preto, ink: HEX.papel },
};

/* câmera fixa: 1 px do palco = U unidades no plano z = 0 */
const CAM_Z = 27, FOV = 28;
const U = (2 * CAM_Z * Math.tan((FOV / 2) * Math.PI / 180)) / 1080;
const pxX = x => (x - 960) * U, pxY = y => (540 - y) * U;

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
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ---------- cromo holográfico: textos grandes (js/textos3d.js) e comprimidos ---------- */
  const holoEnv = { claro: ambienteHolo(renderer, 'claro'), escuro: ambienteHolo(renderer, 'escuro') };
  const textos = createTextos3d(scene, holoEnv, pxX, pxY, U);
  // comprimidos: holográfico claro no fundo escuro, holográfico negro no fundo claro
  const holoPil = { claro: materialHolo(holoEnv.claro), escuro: materialHolo(holoEnv.escuro) };
  let pilMat = holoPil.claro;

  /* ---------- materiais compartilhados ---------- */
  const cromo = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.14, envMap: env, envMapIntensity: 1.25 });
  const vidro = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMap: env,
    envMapIntensity: 1.4, transparent: true, opacity: 0.32, depthWrite: false });
  const liquidoMat = new THREE.MeshBasicMaterial({ color: HEX.verde });
  const tintaMat = new THREE.MeshBasicMaterial({ color: HEX.papel });      // rolha e canhão 25x7: contraste com o fundo
  const concretoMat = new THREE.MeshBasicMaterial({ color: HEX.concreto }); // canhão 13x4,5
  const rosaMat = new THREE.MeshBasicMaterial({ color: HEX.rosa });         // canhão 40x12
  const escalaMat = new THREE.LineBasicMaterial({ color: HEX.papel, transparent: true, opacity: 0.85 });

  const lathe = (perfil, seg = 64) => new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  /* ---------- seringa ---------- */
  const AG = {
    '13x4,5': { hr: 0.15, hh: 0.32, nr: 0.018, nl: 1.3, mat: concretoMat },
    '25x7': { hr: 0.19, hh: 0.40, nr: 0.028, nl: 2.5, mat: tintaMat },
    '40x12': { hr: 0.24, hh: 0.46, nr: 0.045, nl: 4.0, mat: rosaMat },
  };
  function agulha(tipo) {
    const a = AG[tipo], g = new THREE.Group();
    const canhao = new THREE.Mesh(new THREE.CylinderGeometry(a.hr, a.hr * 0.6, a.hh, 32), a.mat);
    canhao.position.y = -a.hh / 2;
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(a.nr, a.nr, a.nl, 12), cromo);
    haste.position.y = -a.hh - a.nl / 2;
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(a.nr, a.nr * 6, 12), cromo);
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

  function criaSeringa(cap) {
    const { L, R, F } = SPEC[cap], base = -L / 2;
    const outer = new THREE.Group(), eixo = new THREE.Group(), peca = new THREE.Group();
    outer.add(eixo); eixo.add(peca);
    peca.position.y = L / 2 + BICO;              // a origem do objeto é a ponta do bico
    outer.rotation.z = Math.PI / 2;              // horizontal: êmbolo à esquerda, agulha à direita

    peca.add(
      new THREE.Mesh(lathe([[0.08, base - BICO], [0.08, base - 0.38], [0.12, base - 0.3], [R, base - 0.04]]), cromo),
      new THREE.Mesh(lathe([[R, base - 0.04], [R, L / 2]]), vidro),
      new THREE.Mesh(lathe([[R, L / 2], [F, L / 2], [F, L / 2 + 0.08], [R + 0.02, L / 2 + 0.08]]), cromo),
      new THREE.LineSegments(escalaGeo(cap), escalaMat),
    );
    const liquido = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.96, 1, 48), liquidoMat);
    peca.add(liquido);

    const embolo = new THREE.Group();
    const rolha = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, 0.26, 48), tintaMat);
    rolha.position.y = 0.13;
    const rr = 0.16 * Math.sqrt(R / 0.32);
    const haste = new THREE.Mesh(lathe([[rr, 0.26], [rr, L + 0.3], [F * 0.8, L + 0.3], [F * 0.8, L + 0.42], [0, L + 0.42]]), cromo);
    embolo.add(rolha, haste);
    peca.add(embolo);

    // as três agulhas existem; só uma aparece (a 40x12 entra na demonstração de troca)
    const agulhas = {};
    for (const t of Object.keys(AG)) { const g = agulha(t); g.position.y = base - BICO; g.visible = false; peca.add(g); agulhas[t] = g; }

    return {
      outer,
      update(st, t, a, calmo, i) {
        const v = Math.max(0, Math.min(cap, st.vol || 0)), h = Math.max(1e-4, (v / cap) * L);
        liquido.scale.y = h; liquido.position.y = base + h / 2;
        embolo.position.y = base + h;
        // troca de agulha: 40x12 puxa da ampola, 25x7 aplica (ciclo de 4 compassos)
        if (st.ag === 'troca') {
          const P = BAR * 4, c = (t % P) / P;
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

  /* ---------- comprimidos ---------- */
  const PILGEO = {
    capsula: () => new THREE.CapsuleGeometry(0.3, 0.85, 10, 40),
    disco: () => new THREE.CylinderGeometry(0.46, 0.46, 0.17, 56).rotateX(Math.PI / 2),
    oblongo: () => new THREE.CapsuleGeometry(0.27, 0.8, 10, 40).scale(1, 1, 0.6),
    discoP: () => new THREE.CylinderGeometry(0.36, 0.36, 0.22, 56).rotateX(Math.PI / 2),
    hex: () => new THREE.CylinderGeometry(0.46, 0.46, 0.18, 6).rotateX(Math.PI / 2),
  };
  const pilCache = {};
  function criaPilula(forma) {
    const geo = pilCache[forma] || (pilCache[forma] = PILGEO[forma]());
    const outer = new THREE.Group(), m = new THREE.Mesh(geo, pilMat);
    outer.add(m);
    return {
      outer,
      update(st, t, a, calmo, i) {
        m.material = pilMat;   // acompanha o fundo (claro/escuro) mesmo se o comprimido continua no próximo slide
        m.rotation.y = t * 0.6 + i * 0.9 + (calmo ? 0 : a.bass * 0.5);
        m.rotation.x = Math.sin(t * 0.4 + i) * 0.25;
      },
    };
  }

  /* ---------- grade de 794 mini seringas (slide 10), em ordem cronológica ---------- */
  function criaGrade() {
    const ordem = ordemSeringas(), COLS = 40, X0 = 112, DX = 43, Y0 = 128, DY = 26, S = 3.3;
    const outer = new THREE.Group(), malhas = {}, indices = { 1: [], 3: [], 5: [] };
    ordem.forEach((cap, k) => indices[cap].push(k));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const cap of [1, 3, 5]) {
      const { L, R, F } = SPEC[cap], a = -L / 2 - BICO, top = L / 2 + 0.1 + L * 0.5;
      const geo = lathe([[0, a - 2], [0.07, a - 1.9], [0.07, a - 0.35], [0.2, a - 0.3], [0.2, a], [R, -L / 2], [R, L / 2],
        [F, L / 2], [F, L / 2 + 0.1], [0.2, L / 2 + 0.1], [0.2, top], [F * 0.8, top], [F * 0.8, top + 0.15], [0, top + 0.15]], 20);
      geo.translate(0, -((a - 2) + (top + 0.15)) / 2, 0);
      const mesh = new THREE.InstancedMesh(geo, cromo, indices[cap].length);
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
        outer.rotation.x = calmo ? 0 : Math.sin(t * 0.5) * 0.03;
      },
    };
  }

  /* ---------- grafismo de fundo ----------
     círculos concêntricos cromados (todos os slides) + ondas op-art (só no slide 8).
     grave = espessura dos anéis e amplitude das ondas, kick = anéis andando para fora. */
  const cor = h => new THREE.Color(h);
  const U_ = {
    uT: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uKick: { value: 0 },
    uFase: { value: 0 }, uCalm: { value: 0 }, uQuieto: { value: 0 }, uSpec: { value: 0 }, uSplit: { value: 0 }, uOndas: { value: 0 },
    uC: { value: new THREE.Vector2(0.65, 0.6) },
    uBg: { value: cor(HEX.preto) }, uInk: { value: cor(HEX.papel) }, uPapel: { value: cor(HEX.papel) },
  };
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U_, depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uT, uBass, uMid, uHigh, uKick, uFase, uCalm, uQuieto, uSpec, uSplit, uOndas;
      uniform vec2 uC; uniform vec3 uBg, uInk, uPapel;
      varying vec2 vUv;
      vec3 espectro(float x){   // laranja → rosa → ultravioleta → azul → verde (em linear)
        vec3 c0 = vec3(1.0, 0.078, 0.010), c1 = vec3(1.0, 0.026, 0.254), c2 = vec3(0.275, 0.105, 1.0), c3 = vec3(0.024, 0.044, 1.0), c4 = vec3(0.565, 1.0, 0.0);
        x = clamp(x, 0.0, 1.0) * 4.0;
        return x < 1.0 ? mix(c0, c1, x) : x < 2.0 ? mix(c1, c2, x - 1.0) : x < 3.0 ? mix(c2, c3, x - 2.0) : mix(c3, c4, x - 3.0);
      }
      void main(){
        vec2 uv = vUv, p = uv * vec2(16.0, 9.0);
        float vivo = (1.0 - uCalm) * (1.0 - uQuieto);
        vec3 bg = mix(uBg, uPapel, step(0.5, uv.x) * uSplit);

        // círculos concêntricos "cromados": cada anel é um tubo de metal,
        // com brilho que gira em volta (reflexo) e anda para fora a cada kick
        // "soco" de zoom a cada kick: a tela inteira pulsa a partir do centro
        vec2 q = (uv - uC) * vec2(16.0 / 9.0, 1.0) * (1.0 - uKick * 0.06 * vivo);
        float r = length(q), ang = atan(q.y, q.x);
        float x = r * 7.0 - uFase, f = fract(x), d = min(f, 1.0 - f);
        float w = 0.085 + uBass * 0.09 * vivo;
        float tubo = clamp(1.0 - d / w, 0.0, 1.0);
        float aa = clamp(fwidth(x) * 1.5 / w, 0.0, 1.0);
        tubo = smoothstep(0.0, max(aa, 0.08), tubo) * sqrt(tubo);
        float brilho = 0.25 + 0.75 * pow(abs(sin(ang * 1.5 + uT * 0.35 + floor(x) * 0.9)), 6.0);
        float queda = exp(-r * 1.15);
        float anel = tubo * brilho * queda * (0.85 + uKick * 1.2 * vivo);
        // onda de choque: um anel claro que sai do centro a cada batida e se apaga
        float rs = (1.0 - uKick) * 1.6;
        float choque = exp(-pow((r - rs) / 0.035, 2.0)) * uKick * vivo;

        // ondas paralelas (op-art), só onde o slide pede (slide 8)
        float amp = 0.22 + uBass * 1.1 * vivo;
        float y = p.y + sin(p.x * 0.55 + uT * 0.5) * amp + sin(p.x * 1.4 - uT * 0.3 + p.y * 0.35) * amp * 0.45;
        float yy = y * (4.0 + uMid * 1.6 * vivo), fy = min(fract(yy), 1.0 - fract(yy));
        float ondas = (1.0 - smoothstep(0.06, 0.06 + fwidth(yy) * 1.5, fy)) * uOndas;

        vec3 tinta = mix(uInk, espectro(uv.x + sin(uT * 0.2) * 0.15), uSpec);
        float forca = (0.2 + (uBass * 0.3 + uKick * 0.25) * vivo) * (1.0 - uQuieto * 0.85);
        vec3 col = mix(bg, tinta, clamp(anel * forca + choque * 0.55 + ondas * 0.22, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  fundo.frustumCulled = false; fundo.renderOrder = -1;
  scene.add(fundo);

  /* ---------- pós: separação RGB curta + grão ---------- */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(1920, 1080);
  composer.addPass(new RenderPass(scene, camera));
  /* aberração cromática radial: vermelho para fora, azul para dentro, mais forte nas bordas.
     Pega tudo o que é 3D (fundo, comprimidos, seringas, letras em cromo); o texto em HTML fica nítido. */
  const rgb = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, amount: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv;
      void main(){
        vec2 d = vUv - 0.5;
        vec2 k = d * amount * (0.35 + length(d) * 1.6);
        vec4 g = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texture2D(tDiffuse, vUv + k).r, g.g, texture2D(tDiffuse, vUv - k).b, g.a);
      }`,
  });
  composer.addPass(rgb);
  const grao = new FilmPass(0.3, false);
  composer.addPass(grao);
  composer.addPass(new OutputPass());

  /* ---------- sincronia com o estado ---------- */
  const objs = new Map();
  let t = 0, fase = 0;
  function cria(st) {
    if (st.k === 'syr') return criaSeringa(st.cap);
    if (st.k === 'pill') return criaPilula(st.forma);
    if (st.k === 'grade') return criaGrade();
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

    U_.uT.value = t;
    U_.uBass.value = a.bass; U_.uMid.value = a.mid; U_.uHigh.value = a.high; U_.uKick.value = a.kick;
    U_.uCalm.value = calmo ? 1 : 0;
    fase += dt * (0.25 + (calmo ? 0 : a.kick * 2.2));
    U_.uFase.value = fase;

    rgb.uniforms.amount.value = calmo ? 0 : Math.min(0.03, a.kick * 0.024 + a.bass * 0.006 + a.high * 0.004);
    grao.uniforms.intensity.value = 0.28 + (calmo ? 0 : a.high * 0.2);
    textos.render(a, dt, calmo);
    composer.render(dt);
  }

  /* troca de tema e de fundo entre slides: tudo interpolado, sem corte */
  function setSlide({ n, tema, fundo: f = {}, centro }, instantaneo = false) {
    textos.setSlide(n, instantaneo, tema);
    const T = TEMAS[tema] || TEMAS.E, d = instantaneo ? 0 : 1.1, ease = 'power2.inOut';
    const alvo = (c, h) => { const n = new THREE.Color(h); gsap.to(c, { r: n.r, g: n.g, b: n.b, duration: d, ease }); };
    alvo(U_.uBg.value, T.bg); alvo(U_.uInk.value, T.ink);
    alvo(tintaMat.color, T.ink); alvo(escalaMat.color, T.ink);
    // no fundo claro o cromo puro some: vira um metal mais escuro (gunmetal)
    const metal = tema === 'C' || tema === 'F' ? 0x6e6e6e : 0xffffff;
    alvo(cromo.color, metal); alvo(vidro.color, metal);
    pilMat = metal === 0xffffff ? holoPil.claro : holoPil.escuro;
    gsap.to(U_.uSpec, { value: f.spec || 0, duration: d * 1.5, ease });
    gsap.to(U_.uQuieto, { value: f.quieto || 0, duration: instantaneo ? 0 : 0.6, ease });
    gsap.to(U_.uSplit, { value: f.split || 0, duration: d, ease });
    gsap.to(U_.uOndas, { value: f.ondas || 0, duration: d, ease });
    if (centro) gsap.to(U_.uC.value, { x: centro[0] / 1920, y: 1 - centro[1] / 1080, duration: d, ease });
  }

  return { render, setSlide, dispose() { textos.dispose(); holoPil.claro.dispose(); holoPil.escuro.dispose(); holoEnv.claro.dispose(); holoEnv.escuro.dispose(); renderer.dispose(); renderer.domElement.remove(); } };
}
