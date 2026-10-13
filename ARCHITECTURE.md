# Arquitetura

## Camadas

- React e componentes locais no estilo shadcn/ui; Radix UI fornece o diálogo com gerenciamento de foco. Tailwind CSS fornece tokens e utilitários básicos.
- TanStack Router mantém busca, categoria, ordenação, disponibilidade, faixa de preço e página na URL. Alterar filtros reinicia a página; links diretos e histórico restauram o estado.
- TanStack Query isola dados privados por token de sessão, descarta consultas obsoletas por `AbortSignal`, invalida carrinho após mutations/eventos e usa rollback em favoritos.
- Axios é o único cliente REST. Os handlers MSW são o backend da demonstração e guardam o estado em IndexedDB para sobreviver a refresh.
- Socket.IO Client conecta ao binding de WebSocket do MSW. Eventos `nft.updated` e `order.updated` contêm identidade e versão. A UI ignora versões antigas, atualiza o detalhe e invalida as consultas afetadas.

## Contratos simulados

Todos os recursos usam `/api` e JSON tipado em `src/domain.ts`:

| Recurso | Operações |
|---|---|
| Sessão | `GET /session`, `POST /session/login`, `POST /session/register`, `POST /session/logout` |
| NFT | `GET /nfts?q&category&sort&page&minPrice&maxPrice&available`, `GET /nfts/:id` |
| Favoritos | `GET /favorites`, `POST /favorites/:id`, `DELETE /favorites/:id` |
| Carrinho e cotação | `GET /cart`, `POST /cart`, `PATCH /cart/:id`, `DELETE /cart/:id`, `POST /quote` |
| Pedido | `POST /orders` com `Idempotency-Key`, `GET /orders/:id` |
| Perfil | `GET /profile`, `PATCH /profile`, `POST /profile/password` |
| Carteira | `GET /wallets`, `POST /wallets`, `PATCH /wallets/:id` |

Erros usam `{ error: { code, message } }` e status HTTP coerentes. ETH trafega como string decimal; a camada mock converte valores em micros para somar subtotal, desconto e taxa sem aritmética de ponto flutuante. A cotação REST define o total usado no checkout.

## Sessão, carrinho e pedidos

O token fictício fica no armazenamento local; credenciais nunca são persistidas em claro. O banco mock armazena SHA-256 das senhas e inclui duas contas demonstrativas. Ao autenticar, linhas do carrinho visitante são mescladas à conta. Logout limpa cache e conexão da sessão atual.

Pedidos exigem chave idempotente. Repetir a mesma chave e conteúdo recupera o mesmo snapshot; conteúdo diferente produz conflito. O recibo usa cópia dos NFTs e da cotação no momento do pedido. Recusa mantém o carrinho; confirmação remove apenas as linhas compradas. No cenário de timeout, a repetição recupera o pedido pendente.

## Cache e sincronização

- Catálogo: chave inclui todos os parâmetros da URL, `staleTime` de 15 s e cancelamento Axios/TanStack Query.
- Detalhe e sessão: atualizados sob demanda; sessão é validada novamente em refresh.
- Carrinho: cache curto de 8 s, chave inclui o token fictício e invalidação após mutations/preço em tempo real.
- Favoritos: inclusão/remoção otimista; erro restaura snapshot anterior.
- Socket.IO: o evento é aplicado somente quando a versão recebida supera a versão em cache; após reconexão o cache relevante é invalidado para reconciliar com REST.
- Sessão: respostas REST `401 SESSION_EXPIRED` removem o token, limpam consultas privadas e encaminham rotas protegidas ao login com `returnTo`; o carrinho e a chave idempotente do pedido permanecem no estado simulado/local para retomada após autenticar novamente.

O binding `@mswjs/socket.io-binding` converte os frames do protocolo Socket.IO em eventos por cima do WebSocket interceptado pelo MSW. O transporte de demonstração usa namespace padrão e eventos textuais; acknowledgements, namespace customizado e anexos binários ficam fora da limitação do binding. Eventos de preço podem ser acionados no controle DEMO; o evento passa pelo cliente `socket.io-client`, não diretamente por setters da UI.

## Cenários e desvios

O seletor DEMO oferece catálogo vazio, rede lenta, latência variável, erro HTTP 503, falha de favorito, sessão expirada, recusa de pagamento e timeout. O reset restaura fixtures e carteiras conhecidas. Assets de arte são SVGs locais gerados para a demonstração, porque o único material visual recebido foi um contact sheet de baixa resolução e nenhum arquivo de Figma/assets foi incluído. Não há integração real com blockchain, pagamento ou carteiras.
