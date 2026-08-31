/* Guarda-dados — serve vários apps e várias pessoas no mesmo Worker.
 *
 * Endereço:  https://SEU-WORKER.workers.dev/<app>
 *   /caderneta   /financas   /treino ...  (raiz = app "padrao")
 *
 * A caixa no KV é <codigo>:<app>, então:
 *   - dois apps da mesma pessoa não se misturam
 *   - duas pessoas no mesmo app não se enxergam
 *
 * HISTÓRICO: antes de qualquer PUT sobrescrever o valor atual, a versão
 * anterior é guardada. Ficam as últimas 8. Isso é o que permite desfazer
 * uma sincronia que apagou algo por engano (ex: um aparelho zerado
 * mandando dado vazio por cima do que já existia).
 *
 *   GET  /<app>/historico            -> lista {ts, tamanho} das últimas versões
 *   GET  /<app>/historico/<ts>       -> o conteúdo daquela versão
 *
 * Configuração (uma vez só, serve pra todos os apps):
 *   KV namespace  binding DADOS    → namespace controle_faltas
 *   Secret        nome    CODIGOS  → códigos separados por vírgula
 *
 * App novo não precisa de nada aqui: é só usar outro nome no caminho.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-codigo',
  'Access-Control-Max-Age': '86400'
};

const LIMITE = 2 * 1024 * 1024;
const HISTORICO_MAX = 8;

const resposta = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' }
  });

async function guardaHistorico(env, base, valorAntigo) {
  if (!valorAntigo) return; // nada a preservar na primeira gravação
  const idxKey = base + ':hist';
  let idx = [];
  try { idx = JSON.parse((await env.DADOS.get(idxKey)) || '[]'); } catch (e) { idx = []; }

  const ts = Date.now();
  await env.DADOS.put(`${base}:hist:${ts}`, valorAntigo);
  idx.unshift(ts);

  const excesso = idx.splice(HISTORICO_MAX);
  for (const velho of excesso) {
    await env.DADOS.delete(`${base}:hist:${velho}`);
  }
  await env.DADOS.put(idxKey, JSON.stringify(idx));
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (!env.DADOS) return resposta({ erro: 'faltou o binding DADOS (KV)' }, 500);
    if (!env.CODIGOS) return resposta({ erro: 'faltou a variavel CODIGOS' }, 500);

    const codigo = (req.headers.get('x-codigo') || '').trim();
    const permitidos = env.CODIGOS.split(',').map(c => c.trim()).filter(Boolean);
    if (!codigo || !permitidos.includes(codigo)) return resposta({ erro: 'codigo invalido' }, 401);

    const partes = new URL(req.url).pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const app = (partes[0] || 'padrao').toLowerCase();
    if (!/^[a-z0-9._-]{1,40}$/.test(app)) return resposta({ erro: 'nome de app invalido' }, 400);
    const base = codigo + ':' + app;

    // ---- histórico ----
    if (partes[1] === 'historico') {
      if (req.method !== 'GET') return resposta({ erro: 'metodo nao suportado' }, 405);
      const idx = JSON.parse((await env.DADOS.get(base + ':hist')) || '[]');

      if (partes[2]) {
        const ts = partes[2];
        if (!idx.includes(+ts)) return resposta({ erro: 'versao nao encontrada' }, 404);
        const valor = await env.DADOS.get(`${base}:hist:${ts}`);
        if (!valor) return resposta({ erro: 'versao nao encontrada' }, 404);
        return new Response(valor, { headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' } });
      }

      const lista = [];
      for (const ts of idx) {
        const v = await env.DADOS.get(`${base}:hist:${ts}`);
        if (v) lista.push({ ts, tamanho: v.length });
      }
      return resposta({ versoes: lista });
    }

    // ---- dado atual ----
    if (req.method === 'GET') {
      const guardado = await env.DADOS.get(base);
      return new Response(guardado || '{"vazio":true}', {
        headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' }
      });
    }

    if (req.method === 'PUT') {
      const corpo = await req.text();
      if (corpo.length > LIMITE) return resposta({ erro: 'grande demais' }, 413);
      let o;
      try { o = JSON.parse(corpo); } catch { return resposta({ erro: 'json invalido' }, 400); }
      if (!o || typeof o !== 'object') return resposta({ erro: 'json invalido' }, 400);

      const anterior = await env.DADOS.get(base);
      await guardaHistorico(env, base, anterior);
      await env.DADOS.put(base, corpo);
      return resposta({ ok: true, em: Date.now() });
    }

    return resposta({ erro: 'metodo nao suportado' }, 405);
  }
};
