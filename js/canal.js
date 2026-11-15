/* ============================================================
   CANAL ENTRE O CELULAR (treino.html) E A APRESENTAÇÃO (index.html)
   - ntfy.sh: serviço gratuito de mensagens, sem conta. Liga aparelhos
     diferentes pela internet. A "sala" é derivada da senha, então as duas
     páginas se encontram sozinhas, sem pareamento.
   - BroadcastChannel: liga abas do mesmo navegador (útil para testar).
   Mensagens: { tipo: 'vai' | 'pos', s: slide (1–12), p: passo }
   ============================================================ */
const NTFY = 'https://ntfy.sh';

export function abreCanal(sala, aoReceber, aoMudarEstado = () => {}) {
  const meu = Math.random().toString(36).slice(2, 10);
  const vistos = new Set();
  const recebe = m => {
    if (!m || m.de === meu) return;
    const chave = m.de + ':' + m.n;
    if (vistos.has(chave)) return;          // a mesma mensagem pode chegar pelos dois caminhos
    vistos.add(chave);
    aoReceber(m);
  };

  let bc = null;
  try { bc = new BroadcastChannel('2026-em-doses'); bc.onmessage = e => recebe(e.data); } catch {}

  let es = null;
  if (sala) {
    try {
      es = new EventSource(`${NTFY}/${sala}/sse`);
      es.onopen = () => aoMudarEstado('on');
      es.onerror = () => aoMudarEstado('off');   // o EventSource tenta reconectar sozinho
      es.onmessage = e => {
        try {
          const d = JSON.parse(e.data);
          if (d.event && d.event !== 'message') return;
          recebe(JSON.parse(d.message));
        } catch {}
      };
    } catch { aoMudarEstado('off'); }
  }

  let n = 0;
  return {
    envia(msg) {
      const m = { ...msg, de: meu, n: ++n };
      try { bc && bc.postMessage(m); } catch {}
      if (sala) fetch(`${NTFY}/${sala}`, { method: 'POST', body: JSON.stringify(m) }).catch(() => {});
    },
  };
}
