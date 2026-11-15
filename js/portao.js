/* ============================================================
   PORTÃO DE ACESSO — tela de senha antes da apresentação
   Atenção: isto só esconde a ENTRADA. Num site estático, os arquivos
   (inclusive o conteúdo) continuam legíveis para quem abrir o repositório.
   A senha não fica escrita aqui: o código guarda só o hash SHA-256 dela.
   ============================================================ */
const HASH = '08dd19ebe332aeb67bca30589e54e627232949c7373d3e353f94c21f69a9d9c5';
const N = 4;

async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function portao() {
  const el = document.getElementById('portao');
  // já liberado nesta aba: não pede de novo ao recarregar
  try { if (sessionStorage.getItem('2026-ok') === '1') { el.remove(); return Promise.resolve(); } } catch {}

  const campo = el.querySelector('input'), casas = [...el.querySelectorAll('.casa')], dica = el.querySelector('.dica');
  const gsap = window.gsap;
  const foca = () => campo.focus();
  el.addEventListener('click', foca);
  foca();

  gsap.from(el.querySelectorAll('[data-in]'), { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.1 });

  return new Promise(ok => {
    const desenha = () => {
      const v = campo.value;
      casas.forEach((c, i) => {
        c.textContent = v[i] ? '•' : '';
        c.classList.toggle('cheia', !!v[i]);
        c.classList.toggle('atual', i === v.length);
      });
    };
    desenha();

    campo.addEventListener('input', async () => {
      campo.value = campo.value.replace(/\D/g, '').slice(0, N);
      el.classList.remove('erro');
      desenha();
      if (campo.value.length < N) return;
      if ((await sha256(campo.value)) === HASH) {
        try { sessionStorage.setItem('2026-ok', '1'); } catch {}
        dica.textContent = 'LIBERADO';
        el.classList.add('certo');
        gsap.to(el, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', delay: 0.35, onComplete: () => { el.remove(); ok(); } });
      } else {
        el.classList.add('erro');
        dica.textContent = 'SENHA INCORRETA';
        gsap.fromTo(el.querySelector('.pin'), { x: -18 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        setTimeout(() => { campo.value = ''; desenha(); }, 450);
      }
    });
  });
}
