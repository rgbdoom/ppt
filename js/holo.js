/* ============================================================
   CROMO HOLOGRÁFICO
   Metal espelhado com iridescência (película fina, como bolha de sabão),
   refletindo um ambiente com as cores do deck (laranja, rosa, ultravioleta,
   azul, verde). Usado nos textos grandes e nos comprimidos.
   Versão escura ("cromo negro") para fundo claro: mesmos reflexos, leitura mantida.
   ============================================================ */
import * as THREE from 'three';

const PALETA = { preto: 0x0b0b0c, papel: 0xf1eee6, laranja: 0xff4f1a, rosa: 0xff2d8a, uv: 0x8f5bff, azul: 0x2b3bff, verde: 0xc6ff00 };

/* ambiente: faixas de cor por elevação; é daqui que vêm os reflexos coloridos */
const c = h => new THREE.Color(h);
/* claro: todas as cores do deck · escuro (fundo claro): só tons frios, pra virar um holográfico negro
   sem reflexo verde/laranja (que escurecido fica cor de barro) */
const FAIXAS = {
  claro: [   // [elevação em graus, cor]
    [-90, c(PALETA.preto)], [-35, c(PALETA.azul)], [-14, c(PALETA.uv)], [-10, c(PALETA.verde)], [-7, c(PALETA.preto)],
    [-1, c(PALETA.uv)], [2, c(PALETA.rosa)], [4.5, c(0xffffff)], [7, c(PALETA.laranja)], [12, c(PALETA.papel)],
    [20, c(PALETA.uv)], [45, c(0xffffff)], [90, c(PALETA.papel)],
  ],
  escuro: [
    [-90, c(PALETA.preto)], [-30, c(0x1a1060)], [-12, c(PALETA.uv)], [-8, c(PALETA.preto)], [-1, c(0x241470)],
    [2.5, c(PALETA.rosa)], [4, c(0xd9ccff)], [6, c(PALETA.azul)], [14, c(PALETA.preto)], [25, c(PALETA.uv)], [60, c(0xb9a8ff)], [90, c(0xffffff)],
  ],
};

export function ambienteHolo(renderer, tipo = 'claro') {
  const geo = new THREE.SphereGeometry(50, 64, 256), pos = geo.attributes.position, cor = [];
  const faixas = FAIXAS[tipo];
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

export function materialHolo(envMap, { fosco = false } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: fosco ? 0.3 : 0.1,
    iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 820,
    envMap, envMapIntensity: fosco ? 1.15 : 1.5,
  });
}
