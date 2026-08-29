# Caderneta — controle de faltas

Página única, sem build e sem dependências. Guarda os dados no navegador
de cada aparelho e, se você ligar a sincronia, também num Worker seu na
Cloudflare — aí casa, trabalho e celular veem a mesma lista.

## 1. Publicar o app (GitHub Pages)

1. Crie um repositório e suba o `index.html` na raiz.
2. `Settings` → `Pages` → *Source*: `Deploy from a branch`, branch `main`,
   pasta `/ (root)`.
3. Em ~1 minuto sai em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

No iPhone, abra pelo **Safari** e use *Adicionar à Tela de Início*.

## 2. Ligar a sincronia (Cloudflare Worker)

Tudo pelo site, sem instalar nada.

1. Crie a conta em `dash.cloudflare.com`.
2. **Storage & Databases** → **KV** → *Create namespace*. Nome: `caderneta`.
3. **Compute (Workers)** → *Create* → *Start from Hello World* → *Deploy*.
4. No Worker criado, abra *Edit code*, apague tudo e cole o `worker.js`.
   Deploy.
5. Ainda no Worker, **Settings** → **Bindings**:
   - *Add* → **KV namespace** → nome da variável `DADOS`, aponte pro
     namespace `caderneta`.
   - *Add* → **Secret** (texto) → nome `CODIGO`, valor: uma senha que você
     inventa. É o que você vai digitar nos aparelhos.
6. Copie o endereço do Worker, algo como
   `https://caderneta.SEU-NOME.workers.dev`.

Depois de mudar bindings, faça Deploy de novo.

## 3. Nos aparelhos

Em cada um: `Ajustes` → **Sincronizar entre aparelhos** → cole o endereço e
o código → *Salvar*.

O primeiro aparelho envia o que já tem. Os outros, estando vazios, puxam do
servidor. Dali em diante, cada alteração sobe sozinha e o app confere ao
abrir e ao voltar pra aba.

## Como ele decide quem vence

Cada gravação carimba a hora. Ao sincronizar, o lado mais recente vence e
sobrescreve o outro — não existe mesclagem. Na prática não incomoda,
porque é uma pessoa só marcando falta. Mas se você editar no PC do trabalho
com o celular sem internet, e depois o celular sincronizar com uma edição
mais nova, a do trabalho se perde.

Aparelho recém-instalado nunca ganha do servidor, então abrir o app numa
máquina nova não apaga nada.

## Limites e custos

O plano grátis da Cloudflare dá 100 mil requisições por dia no Worker e
mil escritas por dia no KV. Esse app faz umas poucas dezenas por dia.

## Backup

`Ajustes` → *Baixar arquivo* / *Abrir arquivo*, independente da sincronia.
Vale guardar um de vez em quando.

Não use aba anônima: o armazenamento é apagado ao fechar.
