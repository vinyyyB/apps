/* Caderneta — guarda-dados.
 *
 * Cole isto no editor de Workers da Cloudflare.
 * Precisa de duas coisas nas configurações do Worker:
 *   - KV namespace com o nome de binding  DADOS
 *   - variável secreta                    CODIGO   (uma senha que você inventa)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-codigo',
  'Access-Control-Max-Age': '86400'
};

const resposta = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' }
  });

const CHAVE = 'caderneta';
const LIMITE = 2 * 1024 * 1024; // 2 MB, folga de sobra

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (!env.CODIGO) return resposta({ erro: 'servidor sem CODIGO configurado' }, 500);
    if (req.headers.get('x-codigo') !== env.CODIGO) return resposta({ erro: 'codigo invalido' }, 401);
    if (!env.DADOS) return resposta({ erro: 'servidor sem KV configurado' }, 500);

    if (req.method === 'GET') {
      const guardado = await env.DADOS.get(CHAVE);
      return new Response(guardado || '{"vazio":true}', {
        headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' }
      });
    }

    if (req.method === 'PUT') {
      const corpo = await req.text();
      if (corpo.length > LIMITE) return resposta({ erro: 'grande demais' }, 413);
      try {
        const o = JSON.parse(corpo);
        if (!o || !Array.isArray(o.subjects)) throw 0;
      } catch {
        return resposta({ erro: 'json invalido' }, 400);
      }
      await env.DADOS.put(CHAVE, corpo);
      return resposta({ ok: true, em: Date.now() });
    }

    return resposta({ erro: 'metodo nao suportado' }, 405);
  }
};
