/* ============================================================
   ESTADO DOS OBJETOS EM CENA
   Recebe a lista do layout e anima cada objeto até o novo lugar (GSAP).
   O 3D e a reserva 2D só desenham o que está aqui, quadro a quadro.
   Objeto que continua de um slide para o outro ANDA; o que sai, encolhe;
   o que entra, cresce. Nada de corte seco.
   ============================================================ */
const gsap = window.gsap;

export function criaItens() {
  const est = new Map();
  const chave = it => (it.k === 'syr' ? `${it.id}@${it.cap}` : it.id);

  function sync(items, { calmo = false } = {}) {
    const vivos = new Set();
    let entrada = 0;
    for (const it of items) {
      const k = chave(it);
      vivos.add(k);
      let st = est.get(k);
      if (!st) {
        st = { ...it, alpha: 0, y: it.y + 40, revela: 0 };
        est.set(k, st);
        gsap.to(st, { alpha: 1, y: it.y, duration: calmo ? 0.4 : 1.1, ease: 'expo.out', delay: 0.15 + entrada * 0.07 });
        if (it.k === 'grade') gsap.to(st, { revela: 1, duration: 6.5, ease: 'power1.inOut', delay: 0.4 });
        // seringa nova entra vazia e enche até a dose
        if (it.k === 'syr') { st.vol = 0; gsap.to(st, { vol: it.vol, duration: 1.8, ease: 'expo.out', delay: 0.6 + entrada * 0.12 }); }
        entrada++;
      } else {
        gsap.killTweensOf(st);
        st.saindo = false;
        st.ag = it.ag;
        gsap.to(st, { x: it.x, y: it.y, s: it.s, alpha: 1, duration: 1.2, ease: 'expo.inOut' });
        if (it.vol !== undefined) gsap.to(st, { vol: it.vol, duration: 1.6, ease: 'expo.out', delay: 0.3 });
        if (it.k === 'grade') st.revela = 1;
      }
    }
    for (const [k, st] of est) {
      if (vivos.has(k) || st.saindo) continue;
      st.saindo = true;
      gsap.killTweensOf(st);
      gsap.to(st, { alpha: 0, duration: 0.5, ease: 'power2.in', onComplete: () => est.delete(k) });
    }
  }

  return { est, sync };
}
