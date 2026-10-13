# Kurio — Marketplace de NFTs

Frontend em React + TypeScript para descobrir, favoritar e comprar colecionáveis digitais. Toda a camada de dados é simulada: a API REST e os eventos em tempo real são interceptados pelo MSW, então o projeto roda sem backend, sem blockchain e sem gateway de pagamento.

- **Aplicação publicada:** [Kurio]
- **Repositório:** [Kurio]

## Stack

React, TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO (cliente), Tailwind CSS, componentes no estilo shadcn/ui (Radix UI), MSW (REST e `@mswjs/socket.io-binding`), Playwright e Lighthouse. Build com Vite.

## Requisitos

- Node.js 20 ou superior e npm
- Chromium para os testes (`npx playwright install chromium`)
- Chrome/Chromium para o Lighthouse (defina `CHROME_PATH` se não estiver num local padrão)

## Como rodar

```bash
npm install
npx playwright install chromium
npm run dev
```

Abra o endereço mostrado pelo Vite. Os mocks sobem automaticamente em desenvolvimento.

## Variáveis de ambiente

Os valores padrão já funcionam; o arquivo `.env.example` serve de referência.

| Variável | Padrão | Função |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW fora do modo de desenvolvimento |
| `VITE_API_URL` | `/api` | Base das chamadas REST (Axios) |

O build de demonstração (`npm run build`) usa `vite build --mode demo` e liga os mocks pelo próprio modo, sem depender de arquivo `.env`. Por isso o deploy na Vercel funciona mesmo sem variáveis configuradas.

## Credenciais fictícias

| E-mail | Senha |
|---|---|
| `demo@kurio.art` | `ember123` |
| `luna@kurio.art` | `moon12345` |

As senhas ficam como hash SHA-256 no estado simulado. Cupom disponível: `KURIO10` (10% de desconto).

## Cenários e reset

Abra o botão **DEMO** no canto da tela e escolha o cenário de rede:

| Cenário | O que reproduz |
|---|---|
| Padrão | Fluxo normal |
| Catálogo vazio | Resultado vazio |
| Rede lenta | Skeletons e carregamento demorado |
| Latência variável | Respostas fora de ordem |
| Falha HTTP 503 | Erro do catálogo e botão "Tentar novamente" |
| Falha de favorito | Atualização otimista com rollback |
| Sessão expirada | Resposta 401 e retomada após novo login |
| Pagamento recusado | Pedido recusado, carrinho preservado |
| Timeout no pedido | Pedido pendente recuperado pela chave de idempotência |

**Restaurar cenário inicial** limpa conta, carrinho, pedidos e parâmetros do cenário. O estado simulado fica em IndexedDB para sobreviver a refresh.

### Reproduzir o tempo real (Socket.IO)

1. Entre com uma conta, coloque um NFT no carrinho e abra o checkout.
2. No painel DEMO, use os botões de alteração de preço ou de disponibilidade.
3. O evento `nft.updated` passa pelo `socket.io-client`, a cotação é invalidada e o checkout exige nova revisão antes de confirmar.
4. O painel também dispara eventos duplicados e antigos (a interface ignora versões menores) e a atualização de pedido (`order.updated`).

## Comandos

```bash
npm run dev          # Vite + MSW
npm run build        # TypeScript + build de demonstração
npm run preview      # serve o build otimizado
npm run typecheck    # verificação de tipos
npm run lint         # ESLint
npm run test:e2e     # Playwright (Chromium, desktop e mobile) + relatório HTML
npm run test:e2e:ui  # Playwright em modo interativo
npm run audit        # build + medições do Lighthouse
```

Falhas do Playwright geram traces em `test-results/` e o relatório HTML em `playwright-report/` (`npx playwright show-report`). As baselines visuais ficam em `tests/*-snapshots/`; para regerá-las depois de mudar o visual: `npm run test:e2e -- --update-snapshots`.

O Lighthouse usa o cenário padrão, três medições por página e perfil (início e detalhe, mobile e desktop) e grava relatórios HTML/JSON e medianas em `outputs/lighthouse/`. A configuração está em `config/lighthouse.json`.

### Resultado do Lighthouse (mediana de 3 execuções)

[PREENCHER depois de rodar `npm run audit`: tabela com Performance, Accessibility, Best Practices, SEO, LCP, CLS e TBT por página e perfil, e a versão do Lighthouse e do Chrome usada.]

## Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md): contratos REST e eventos, sessão, carrinho, idempotência, cache e reconciliação entre REST e Socket.IO, limitações dos mocks.

## Deploy

Build estático na Vercel (`vercel.json`): saída em `dist`, com rewrite para `index.html` nas rotas da aplicação. `/api` e `/socket.io` ficam fora do rewrite, porque são atendidos pelo MSW no navegador. Acesso direto e refresh funcionam nas rotas previstas.
                                   
## Problemas conhecidos

- **Teste E2E mobile de busca e ordenação** (`tests/marketplace.spec.ts:28`, projeto `mobile-chromium`): falha porque o seletor de ordenação (`.sort-select-wrap select`) é tratado como invisível no viewport de 390 px. Passa no desktop. A causa não foi totalmente diagnosticada. [Escreva aqui o que você viu no passo 1: "visualmente a barra mobile aparece normalmente" ou "o painel lateral aparece no lugar da barra".]
- Todos os outros testes da suíte passam com as baselines versionadas.

## Limitações e desvios do Figma

- O arquivo do Figma estava disponível só para visualização, sem exportação. A fonte (monoespaçada) e a paleta foram aproximadas a partir das capturas de tela, e as ilustrações dos NFTs são SVGs gerados localmente, não as artes originais.
- Parte das telas segue a estrutura do Figma de forma aproximada. Os desvios conhecidos estão no ARCHITECTURE.md.
- Os mocks rodam no navegador (service worker): não há servidor Socket.IO real, e acknowledgements, namespaces customizados e anexos binários não são suportados pelo binding.
- Não há integração real com blockchain, carteiras ou pagamento.