/* Guarda-dados — serve vários apps e várias pessoas no mesmo Worker.
 *
 * Endereço:  https://SEU-WORKER.workers.dev/<app>
 *   /caderneta   /financas   /treino ...
 *
 * A caixa no KV é <codigo>:<app>, então:
 *   - dois apps da mesma pessoa não se misturam
 *   - duas pessoas no mesmo app não se enxergam
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

const resposta = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' }
  });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (!env.DADOS) return resposta({ erro: 'faltou o binding DADOS (KV)' }, 500);
    if (!env.CODIGOS) return resposta({ erro: 'faltou a variavel CODIGOS' }, 500);

    const codigo = (req.headers.get('x-codigo') || '').trim();
    const permitidos = env.CODIGOS.split(',').map(c => c.trim()).filter(Boolean);
    if (!codigo || !permitidos.includes(codigo)) return resposta({ erro: 'codigo invalido' }, 401);

    const app = (new URL(req.url).pathname.replace(/^\/+|\/+$/g, '') || 'padrao').toLowerCase();
    if (!/^[a-z0-9._-]{1,40}$/.test(app)) return resposta({ erro: 'nome de app invalido' }, 400);

    const caixa = codigo + ':' + app;

    if (req.method === 'GET') {
      const guardado = await env.DADOS.get(caixa);
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
      await env.DADOS.put(caixa, corpo);
      return resposta({ ok: true, em: Date.now() });
    }

    return resposta({ erro: 'metodo nao suportado' }, 405);
  }
};
