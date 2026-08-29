# apps

Uns aplicativos de página única que eu uso no dia a dia. Sem build, sem
dependências, sem framework — cada um é um `index.html` que roda direto no
navegador. Hospedados no GitHub Pages e sincronizados entre celular e
computador por um Worker na Cloudflare.

**https://vinyyyb.github.io/apps/**

## O que tem aqui

| App | Pasta | Pra quê |
|---|---|---|
| Caderneta | `controle_faltas/` | Controle de faltas por matéria, em horas-aula |
| Planner | `planner/` | Semana e quadros de tarefas |
| Grana | `controle_grana/` | Gastos, contas e categorias por mês |

### Caderneta

Você cadastra a carga horária, os dias da semana e quantas chamadas tem por
dia. Ele monta o calendário do semestre sozinho, pula feriado (nacionais,
Carnaval, Corpus Christi e os de Curitiba) e conta as faltas em horas.

A regra: reprova quando as horas faltadas passam de 25% da carga. Numa
matéria de 60h com 2 chamadas de 2h, o limite é 15h — ou seja, dá pra faltar
3 dias inteiros. Cada chamada é marcada de forma independente, então dá pra
registrar o dia em que você ficou só numa aula.

Também dá pra adicionar aula avulsa, mover uma aula de data, marcar dia sem
aula e escolher entre seis temas.

## Como funciona a sincronia

Cada app guarda o estado no `localStorage` do aparelho. Se a sincronia
estiver ligada, ele também manda pro Worker depois de cada alteração e
confere ao abrir e ao voltar pra aba.

```
navegador  ──PUT/GET──>  Worker  ──>  KV
                            ^
                      header x-codigo
```

A caixa no KV é `<codigo>:<app>`, então dois apps da mesma pessoa não se
misturam e duas pessoas no mesmo app não se enxergam.

Quem tem o carimbo de hora mais recente vence e sobrescreve o outro — não
existe mesclagem. Pra uso de uma pessoa só, dá certo. Aparelho recém-aberto
nunca ganha do servidor, então instalar num lugar novo não apaga nada.

### `sync.js`

O módulo que faz isso é genérico, dá pra plugar em qualquer app de página
única:

```js
const sync = criaSync({
  app: 'financas',            // vira /financas no servidor
  chave: 'financas:v1',       // onde guarda no navegador
  ler:     ()     => estado,
  aplicar: (novo) => { estado = novo; render(); }
});

estado = sync.carregar() || estadoInicial();
await sync.iniciar();
// depois de qualquer alteração:
sync.salvar();
```

A configuração (endereço + código) é compartilhada por todos os apps do
mesmo domínio: configurou num, valeu pra todos.

### Servidor

O `worker.js` é o que roda na Cloudflare. Precisa de um KV com binding
`DADOS` e de uma variável secreta `CODIGOS`, com os códigos separados por
vírgula. App novo não exige mudança nenhuma lá — é só usar outro nome no
caminho.

## Segurança

O código de sincronia é a única proteção: quem tiver o endereço e o código
lê e escreve tudo. Ele não está neste repositório, e o link de convite deve
ser tratado como senha.

## Rodando local

Abrir o `index.html` no navegador já funciona. A sincronia precisa de
`http://` ou `https://`, então pra testá-la use um servidor qualquer:

```bash
python3 -m http.server 8000
```

E acesse `http://localhost:8000/`.
