/* ============================================================
   PORTÃO DE ACESSO — tela de senha antes da apresentação
   Atenção: isto só esconde a ENTRADA. Num site estático, os arquivos
   (inclusive o conteúdo) continuam legíveis para quem abrir o repositório.
   A senha não fica escrita aqui: o código guarda só o hash SHA-256 dela.
   ============================================================ */
const HASH = '45553cb1d7ff20a12ab1cb54e5f5f4d625f27ec5f13be96ebf4912745d217258';
const N = 4;

async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function portao() {
  const el = document.getElementById('portao');
  // já liberado nesta aba: não pede de novo ao recarregar
  // devolve a "sala" do canal com o celular, derivada da senha (só quem sabe a senha chega nela)
  try {
    const sala = sessionStorage.getItem('2026-sala');
    if (sessionStorage.getItem('2026-ok') === '1' && sala) { el.remove(); return Promise.resolve(sala); }
  } catch {}

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
        const sala = '2026-em-doses-' + (await sha256('sala:' + campo.value)).slice(0, 24);
        try { sessionStorage.setItem('2026-ok', '1'); sessionStorage.setItem('2026-sala', sala); } catch {}
        dica.textContent = 'LIBERADO';
        el.classList.add('certo');
        gsap.to(el, { yPercent: -100, duration: 1.1, ease: 'expo.inOut', delay: 0.35, onComplete: () => { el.remove(); ok(sala); } });
      } else {
        el.classList.add('erro');
        dica.textContent = 'SENHA INCORRETA';
        gsap.fromTo(el.querySelector('.pin'), { x: -18 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        setTimeout(() => { campo.value = ''; desenha(); }, 450);
      }
    });
  });
}
