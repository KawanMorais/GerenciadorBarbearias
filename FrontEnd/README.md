# Site das barbearias (front-end)

Feito em **React + TypeScript**, usando o **Vite** para rodar e empacotar.
Ele conversa com a API da pasta `BackEnd` (endereço `http://localhost:5222`).

## Como rodar

1. Deixe a API rodando (veja o `BackEnd/README.md`).
2. Abra a pasta `FrontEnd` no **VS Code** (Arquivo → Abrir pasta).
3. Abra o terminal do VS Code (menu Terminal → Novo terminal) e rode:

   ```bash
   npm install
   ```

   Só precisa na primeira vez: baixa as bibliotecas para a pasta `node_modules`.
4. Depois, sempre que for usar:

   ```bash
   npm run dev
   ```

5. Abra <http://localhost:5173> no navegador. Ao salvar um arquivo, a página atualiza sozinha.

Para conferir se tem erro de tipo no código: `npx tsc`. Para gerar a versão final (pasta `dist`): `npm run build`.

## Endereços do site

| Endereço | Página |
|---|---|
| `/` | Busca de barbearias |
| `/barbearias/1` | Página da barbearia |
| `/barbearias/1/agendar` | Agendamento: serviço → profissional e horário → confirmação |
| `/meu-agendamento` | Consultar, remarcar ou cancelar com código + nome |
| `/admin/entrar`, `/admin/cadastro` | Login e cadastro da barbearia |
| `/admin` | Painel: Início, Serviços, Funcionários, Horários, Minha barbearia |
| `/redefinir-senha?token=...` | Link que chega no e-mail de "esqueci minha senha" |

## Onde fica cada coisa (`src/`)

| Arquivo / pasta | O que faz |
|---|---|
| `main.tsx` | Ponto de partida: coloca o React na página. |
| `App.tsx` | O mapa de endereços (qual página abre em cada URL). |
| `api.ts` | **Toda** conversa com a API: os tipos do JSON e uma função por rota. |
| `auth.tsx` | Login do admin: guarda a sessão e protege as páginas do painel. |
| `formatos.ts` | Ajudantes: preço em reais, datas, dias da semana, nome do site. |
| `lembrados.ts` | "Lembrar este agendamento neste navegador". |
| `componentes/` | Peças usadas em várias páginas (foto redonda, janela, escolher horário...). |
| `paginas/cliente/` | Telas do cliente. |
| `paginas/conta/` | Login, cadastro e senha. |
| `paginas/painel/` | Telas do painel do admin. |
| `estilo.css` | Todo o visual. As cores ficam nas variáveis do começo do arquivo. |

## Segurança

- **Token do login:** fica no `sessionStorage`, que é apagado quando a aba fecha. Ele só é enviado para as
  rotas do painel, nunca para as públicas. Quando vence (8 horas) ou a API responde 401, o site sai sozinho.
- **Link de nova senha:** o token é tirado da barra de endereço assim que a página abre, e a página
  não manda o endereço para outros sites (`referrer`).
- **Nada de HTML vindo de fora:** todo texto é mostrado pelo React, que escapa os caracteres
  (não usamos `dangerouslySetInnerHTML`). Isso evita que alguém injete código pelo nome ou descrição.
- **Sem serviços externos:** nenhuma fonte, script ou mapa de outro site. Tudo sai da sua máquina.
- As validações da tela (tamanho da foto, campos obrigatórios) são só para avisar mais rápido.
  Quem decide de verdade é a API.

## Trocar o endereço da API

Por padrão o site chama `http://localhost:5222`. Para mudar, crie um arquivo `.env` nesta pasta com:

```
VITE_API_URL=https://endereco-da-api
```
