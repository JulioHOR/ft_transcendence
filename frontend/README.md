# Frontend

SPA em React 19 + TypeScript + Vite + Material UI para o ft_transcendence.

## Comandos

```sh
npm ci
npm run dev      # Vite em http://localhost:5173
npm run build    # tsc -b + vite build
npm run lint     # oxlint src
npm run format
```

O app em produção é servido pelo Nginx do container `frontend` em
`https://localhost:8443`, que também faz proxy de `/api/`, `/socket.io/` e
`/game/`. O Vite dev server não define proxy: para testar login, chat e jogo,
use o Nginx (`make up`).

## Estrutura

- `src/app/`: providers de sessão, chat, amigos, rotas e navegação.
- `src/pages/`: login, perfil, amigos, chat, Pong, ambiente 3D, termos e privacidade.
- `src/api/`: cliente HTTP, endpoints, validações e tipos.
- `src/games/pong/`: jogo, protocolo, view e estatísticas.
- `src/transports/pong/`: transporte WebSocket.
- `src/ui/`: componentes reutilizáveis, tema e toasts.
- `src/chat/`: sessão de chat privado e abas.

## Variáveis

O frontend fala com a mesma origem (`/api`, `/socket.io`, `/game`); não há
`VITE_*` nem URL de backend hardcoded. O cookie de sessão é `HttpOnly` e enviado
com `credentials: "include"`.

## Testes e qualidade

`npm run build` roda o typecheck (`tsc -b`) antes do Vite. `npm run lint` usa
Oxlint. Não há suíte de testes de UI no frontend; a verificação visual é feita
no Chrome em desktop e mobile.
