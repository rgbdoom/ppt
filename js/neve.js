/* ============================================================
   NEVE (slide 12 · "Usar mais pó")
   - flocos caindo o tempo todo; a cada kick a neve se espalha
     a partir do "USAR MAIS PÓ"
   - boneco de neve de óculos estilo Juliet (lentes espelhadas no mesmo
     holográfico das letras): entra pulando, dança na batida, fica
     desorientado, treme, incha e explode numa nuvem de neve
   A sequência recomeça cada vez que o slide 12 entra.
   ============================================================ */
import * as THREE from 'three';

const gsap = window.gsap;
const N_FLOCOS = 1500, N_ESTILHACOS = 900;

/* linha do tempo do boneco (segundos desde a entrada do slide) */
const T = { entra: 0.6, dancaAte: 4.0, tontoAte: 8.0, boom: 8.7 };

export function createNeve(scene, { pxX, pxY, U, CAM_Z, renderer, env, holo, metal }) {
  /* ---------- partículas: flocos + estilhaços da explosão, num só Points ---------- */
  const N = N_FLOCOS + N_ESTILHACOS;
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), tam = new Float32Array(N), alfa = new Float32Array(N);
  const queda = new Float32Array(N), fase = new Float32Array(N), vida = new Float32Array(N);
  const W = 1920 * U / 2 + 1, H = 1080 * U / 2 + 1;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function floco(i, topo) {
    pos[i * 3] = rnd(-W, W); pos[i * 3 + 1] = topo ? H + rnd(0, 2) : rnd(-H, H); pos[i * 3 + 2] = rnd(-5, 3);
    vel[i * 3] = vel[i * 3 + 1] = vel[i * 3 + 2] = 0;
    queda[i] = rnd(0.5, 1.5); fase[i] = rnd(0, 6.28); tam[i] = rnd(2.5, 9); alfa[i] = rnd(0.55, 1);
  }
  for (let i = 0; i < N_FLOCOS; i++) floco(i, false);
  for (let i = N_FLOCOS; i < N; i++) { alfa[i] = 0; tam[i] = 0; }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
  geo.setAttribute('aAlfa', new THREE.BufferAttribute(alfa, 1));
  const matPts = new THREE.ShaderMaterial({
    uniforms: { uEsc: { value: CAM_Z * renderer.getPixelRatio() }, uOp: { value: 0 } },
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute float aTam, aAlfa; uniform float uEsc; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aTam * uEsc / -mv.z; vA = aAlfa; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform float uOp; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.08, d); if (a * vA * uOp < 0.004) discard;
        gl_FragColor = vec4(vec3(1.0), a * vA * uOp); }`,
  });
  const pontos = new THREE.Points(geo, matPts);
  pontos.frustumCulled = false; pontos.renderOrder = 2;
  scene.add(pontos);

  /* ---------- boneco de neve ---------- */
  const neveMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f6ff, roughness: 0.85, sheen: 1, sheenColor: 0xc8d4ff, sheenRoughness: 0.5, envMap: env, envMapIntensity: 1.1 });
  const carvao = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6, envMap: env });
  const cenoura = new THREE.MeshStandardMaterial({ color: 0xff4f1a, roughness: 0.45, envMap: env });
  const galho = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8, envMap: env });
  const cachecol = new THREE.MeshStandardMaterial({ color: 0xff2d8a, roughness: 0.6, envMap: env });
  const esfera = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m);

  // tudo em "px do palco" (escala U aplicada no grupo de fora); origem na base do boneco
  const boneco = new THREE.Group(), corpo = new THREE.Group(), cabeca = new THREE.Group(), oculos = new THREE.Group();
  boneco.add(corpo);
  const R1 = 120, R2 = 88, R3 = 64, y1 = R1, y2 = R1 * 2 + R2 * 0.8, y3 = y2 + R2 + R3 * 0.75;
  const base = esfera(R1, neveMat); base.position.y = y1;
  const meio = esfera(R2, neveMat); meio.position.y = y2;
  corpo.add(base, meio, cabeca);
  cabeca.position.y = y3;
  cabeca.add(esfera(R3, neveMat));
  for (const [x, y] of [[0, 34], [0, 0], [0, -34]]) { const b = esfera(9, carvao); b.position.set(x, y2 + y, R2 * 0.97 - Math.abs(y) * 0.2); corpo.add(b); }
  const nariz = new THREE.Mesh(new THREE.ConeGeometry(9, 54, 24), cenoura);
  nariz.rotation.x = Math.PI / 2; nariz.position.set(0, -6, R3 + 22); cabeca.add(nariz);
  for (let k = -2; k <= 2; k++) { const b = esfera(5, carvao); b.position.set(k * 13, -30 - (2 - Math.abs(k)) * 4, R3 * 0.9); cabeca.add(b); }
  const gola = new THREE.Mesh(new THREE.TorusGeometry(R3 * 0.92, 14, 16, 48), cachecol);
  gola.rotation.x = Math.PI / 2; gola.position.y = y2 + R2 * 0.92; corpo.add(gola);
  const ponta = new THREE.Mesh(new THREE.BoxGeometry(30, 80, 12), cachecol);
  ponta.position.set(38, y2 + R2 * 0.6, R2 * 0.8); ponta.rotation.z = 0.25; corpo.add(ponta);
  for (const s of [-1, 1]) {
    const braco = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 150, 8), galho);
    braco.position.set(s * (R2 + 50), y2 + 30, 0); braco.rotation.z = s * -1.05; corpo.add(braco);
    const dedo = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 40, 8), galho);
    dedo.position.set(s * (R2 + 110), y2 + 78, 0); dedo.rotation.z = s * -0.3; corpo.add(dedo);
  }

  // óculos (referência enviada): lentes retangulares largas em laranja-fogo espelhado,
  // armação de metal escuro com a barra de cima grossa, ponte fina e hastes retas
  const fogo = new THREE.MeshPhysicalMaterial({
    color: 0xff5a14, metalness: 0.75, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03,
    iridescence: 0.8, iridescenceIOR: 1.8, iridescenceThicknessMinimum: 280, iridescenceThicknessMaximum: 520,
    envMap: env, envMapIntensity: 1.6,
  });
  const armacao = new THREE.MeshStandardMaterial({ color: 0x2b2b31, metalness: 1, roughness: 0.28, envMap: env, envMapIntensity: 1.3 });
  function lenteForma(w, h, r, cai) {   // retângulo arredondado; o canto de fora embaixo desce um pouco
    const s = new THREE.Shape(), x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
    s.moveTo(x0 + r, y1); s.lineTo(x1 - r, y1); s.quadraticCurveTo(x1, y1, x1, y1 - r);
    s.lineTo(x1, y0 - cai + r); s.quadraticCurveTo(x1, y0 - cai, x1 - r, y0 - cai);
    s.lineTo(x0 + r, y0); s.quadraticCurveTo(x0, y0, x0, y0 + r);
    s.lineTo(x0, y1 - r); s.quadraticCurveTo(x0, y1, x0 + r, y1);
    return s;
  }
  const LW = 66, LH = 40;
  const geoLente = new THREE.ExtrudeGeometry(lenteForma(LW, LH, 12, 6), { depth: 2, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.2, bevelSegments: 3, curveSegments: 10 });
  const geoAro = new THREE.ExtrudeGeometry(lenteForma(LW + 8, LH + 7, 15, 6), { depth: 3, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 10 });
  for (const s of [-1, 1]) {
    const lado = new THREE.Group();
    lado.position.set(s * (LW / 2 + 7), 14, R3 + 6);
    lado.rotation.y = s * 0.22;                       // envolve o rosto
    const aro = new THREE.Mesh(geoAro, armacao); aro.position.z = -3; aro.scale.x = s;
    const lente = new THREE.Mesh(geoLente, fogo); lente.position.z = 0.5; lente.scale.x = s;
    const sobrancelha = new THREE.Mesh(new THREE.BoxGeometry(LW + 10, 9, 8), armacao);   // barra grossa de cima
    sobrancelha.position.set(0, LH / 2 + 4, 1);
    lado.add(aro, lente, sobrancelha);
    const haste = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 92), armacao);
    haste.position.set(s * (R3 + 6), 30, R3 - 46); haste.rotation.y = s * -0.08;
    oculos.add(lado, haste);
  }
  const ponte = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 18, 8), armacao);
  ponte.rotation.z = Math.PI / 2; ponte.position.set(0, 30, R3 + 10); oculos.add(ponte);
  cabeca.add(oculos);

  const fora = new THREE.Group();
  fora.add(boneco);
  const BX = 1500, BY = 960;          // base do boneco no palco (px)
  fora.position.set(pxX(BX), pxY(BY), 0.5);
  fora.scale.setScalar(U);
  fora.visible = false;
  scene.add(fora);
  const ALTURA = y3 + R3;

  /* ---------- estado ---------- */
  const est = { op: 0, desde: -1, ativo: false, explodiu: false, choque: 0, pulo: 0 };
  let t = 0;
  const origemPo = new THREE.Vector3(pxX(430), pxY(700), 0);   // "USAR MAIS PÓ"
  const centroBoneco = new THREE.Vector3(pxX(BX), pxY(BY - ALTURA * 0.45), 0.5);

  function setAtivo(on, instantaneo) {
    if (on && !est.ativo) {
      est.desde = t; est.explodiu = false; est.pulo = 0;
      for (let i = N_FLOCOS; i < N; i++) { alfa[i] = 0; tam[i] = 0; }
    }
    est.ativo = on;
    gsap.to(est, { op: on ? 1 : 0, duration: instantaneo ? 0 : on ? 1.2 : 0.4, ease: 'power2.out' });
    if (on) gsap.fromTo(est, { pulo: 0 }, { pulo: 1, duration: 0.9, ease: 'back.out(2.4)', delay: T.entra });
  }

  function explode() {
    est.explodiu = true; est.choque = 1;
    // estilhaços saem do corpo do boneco
    for (let i = N_FLOCOS; i < N; i++) {
      const th = rnd(0, 6.283), ph = Math.acos(rnd(-1, 1)), r = rnd(0, 1) ** 0.5 * ALTURA * 0.45 * U;
      const dx = Math.sin(ph) * Math.cos(th), dy = Math.cos(ph), dz = Math.sin(ph) * Math.sin(th);
      pos[i * 3] = centroBoneco.x + dx * r; pos[i * 3 + 1] = centroBoneco.y + dy * r * 1.6; pos[i * 3 + 2] = centroBoneco.z + dz * r;
      const v = rnd(4, 15);
      vel[i * 3] = dx * v; vel[i * 3 + 1] = dy * v + rnd(1, 5); vel[i * 3 + 2] = dz * v;
      tam[i] = rnd(4, 16); alfa[i] = 1; vida[i] = rnd(2.2, 3.6);
    }
    // a neve em volta também é empurrada pela explosão
    empurra(centroBoneco, 26, 0.18);
  }

  const d = new THREE.Vector3();
  function empurra(origem, forca, queda_) {
    for (let i = 0; i < N_FLOCOS; i++) {
      d.set(pos[i * 3] - origem.x, pos[i * 3 + 1] - origem.y, pos[i * 3 + 2] - origem.z);
      const dist = d.length() + 0.3;
      d.multiplyScalar(forca / (dist * (1 + dist * queda_)));
      vel[i * 3] += d.x; vel[i * 3 + 1] += d.y; vel[i * 3 + 2] += d.z * 0.3;
    }
  }

  let kickAnt = 0;
  function render(a, dt, calmo) {
    t += dt;
    matPts.uniforms.uOp.value = est.op;
    pontos.visible = est.op > 0.003;
    est.choque *= Math.exp(-dt * 3);
    if (!pontos.visible) { fora.visible = false; return; }

    // batida: a neve se espalha a partir do "USAR MAIS PÓ"
    if (a.kick > 0.9 && kickAnt <= 0.9 && !calmo) empurra(origemPo, 7, 0.25);
    kickAnt = a.kick;

    const amort = Math.exp(-dt * 2.2);
    for (let i = 0; i < N_FLOCOS; i++) {
      const j = i * 3;
      vel[j] *= amort; vel[j + 1] *= amort; vel[j + 2] *= amort;
      pos[j] += (vel[j] + Math.sin(t * 0.8 + fase[i]) * 0.25) * dt;
      pos[j + 1] += (vel[j + 1] - queda[i]) * dt;
      pos[j + 2] += vel[j + 2] * dt;
      if (pos[j + 1] < -H - 0.5) floco(i, true);
      if (pos[j] > W + 1) pos[j] -= 2 * W + 1; else if (pos[j] < -W - 1) pos[j] += 2 * W + 1;
      if (pos[j + 1] > H + 3) pos[j + 1] = H + 2.5;
    }
    for (let i = N_FLOCOS; i < N; i++) {
      if (alfa[i] <= 0) continue;
      const j = i * 3;
      const am = Math.exp(-dt * 1.3);
      vel[j] *= am; vel[j + 1] = vel[j + 1] * am - 7 * dt; vel[j + 2] *= am;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      vida[i] -= dt;
      alfa[i] = Math.max(0, Math.min(1, vida[i] / 1.2));
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlfa.needsUpdate = true;
    geo.attributes.aTam.needsUpdate = true;

    /* boneco */
    const s = t - est.desde;
    fora.visible = est.ativo && !est.explodiu && est.pulo > 0.001;
    if (est.ativo && !est.explodiu && s >= T.boom) explode();
    if (!fora.visible) return;
    const quieto = calmo ? 0.3 : 1;
    let tiltZ = 0, tiltX = 0, cabZ = 0, cabY = 0, esc = 1, dx = 0, oculosY = 0;
    // dança: quica no kick e balança no compasso
    tiltZ = Math.sin(t * 3.1) * 0.06 * quieto;
    const quica = a.kick * 0.05 * quieto;
    if (s > T.dancaAte) {
      // desorientado: cambaleia em círculo, cabeça roda, os óculos escorregam
      const k = Math.min(1, (s - T.dancaAte) / (T.tontoAte - T.dancaAte));
      tiltZ += Math.sin(t * 1.9) * 0.32 * k * quieto;
      tiltX = Math.cos(t * 1.4) * 0.18 * k * quieto;
      cabZ = Math.sin(t * 2.6 + 1) * 0.45 * k * quieto;
      cabY = Math.sin(t * 1.3) * 0.6 * k * quieto;
      dx = Math.sin(t * 0.9) * 40 * k;
      oculosY = -10 * k;
    }
    if (s > T.tontoAte) {
      // antes de explodir: treme e incha
      const k = (s - T.tontoAte) / (T.boom - T.tontoAte);
      tiltZ += Math.sin(t * 60) * 0.04 * k;
      cabZ += Math.sin(t * 47) * 0.06 * k;
      esc = 1 + k * k * 0.18;
    }
    boneco.scale.set(est.pulo * esc * (1 + quica * 0.5), est.pulo * esc * (1 - quica), est.pulo * esc * (1 + quica * 0.5));
    boneco.rotation.set(tiltX, Math.sin(t * 0.5) * 0.25, tiltZ);
    boneco.position.x = dx;
    cabeca.rotation.set(0, cabY, cabZ);
    oculos.position.y = oculosY;
  }

  return {
    setAtivo, render,
    get choque() { return est.choque; },
    dispose() {
      geo.dispose(); matPts.dispose(); scene.remove(pontos); scene.remove(fora);
      [neveMat, carvao, cenoura, galho, cachecol, fogo, armacao].forEach(m => m.dispose());
    },
  };
}
