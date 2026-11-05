# API das Barbearias (back-end)

API em **C# / ASP.NET Core (.NET 10)** com banco **MySQL**, feita para o front em React + TypeScript.

## 1. Como rodar pela primeira vez

1. **Guarde a conexão do MySQL no User Secrets.** Os segredos (senha do MySQL e chave do JWT) ficam
   fora da pasta do projeto, em `%APPDATA%\Microsoft\UserSecrets\`, então nunca vão parar no git.
   A API usa um usuário próprio do MySQL, o `barbearia_app`. Crie no MySQL (como root):

   ```sql
   CREATE DATABASE barbearia;
   CREATE USER 'barbearia_app'@'localhost' IDENTIFIED BY 'SENHA_DO_APP';
   GRANT ALL PRIVILEGES ON barbearia.* TO 'barbearia_app'@'localhost';
   ```

   Depois, dentro de `BackEnd/BarbeariaApi`, rode:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Banco" "Server=localhost;Port=3306;Database=barbearia;User=barbearia_app;Password=SENHA_DO_APP;"
   ```

   A chave do JWT já foi criada no User Secrets deste PC. Em outro PC, crie uma com:
   `dotnet user-secrets set "Jwt:Chave" "<texto aleatório com 32+ caracteres>"`.
   Para ver o que está guardado: `dotnet user-secrets list`.
2. **Rode a API.** Abra o terminal na pasta `BackEnd/BarbeariaApi` e execute:

   ```bash
   dotnet run --launch-profile http
   ```

   Ou, no Visual Studio, abra `BackEnd/Barbearia.slnx` e aperte **F5**.
3. **Teste no navegador:** abra <http://localhost:5222/swagger>. É uma página onde dá para chamar cada rota da API.

Na primeira vez, a API **cria sozinha o banco `barbearia` e todas as tabelas** (isso se chama *migration*)
e cadastra uma barbearia de exemplo, a "Gêmeos Barbearia", com 5 serviços, 3 barbeiros e horário de seg a sáb, 18h às 21h.

**Login de teste do admin:** `demo@barbearia.com` / `demo1234`

### Usando o login no Swagger
1. Chame `POST /api/auth/login` com o e-mail e a senha acima.
2. Copie o `token` da resposta.
3. Clique no botão **Authorize** (cadeado, lá no topo) e cole o token.
4. Agora as rotas `/api/admin/...` funcionam.

## 2. Organização em camadas

O caminho de uma requisição é: **Controller → Service → Data (banco)**.

| Pasta | Camada | O que faz |
|---|---|---|
| `Controllers/` | Apresentação | Só recebe a requisição, chama o serviço e devolve a resposta. Nenhuma regra aqui. Os que começam com `Admin` exigem login. |
| `Dtos/` | Contrato | O formato do JSON que entra e sai. As validações simples (campo obrigatório, tamanho, e-mail) ficam aqui. |
| `Services/` | Regra de negócio | `AuthService`, `BarbeariaService`, `ServicoService`, `FuncionarioService`, `AgendamentoService` têm as regras. `TokenService`, `EmailService`, `UploadService` e `LembreteService` são apoio (JWT, e-mail, fotos, lembretes). |
| `Data/` | Acesso a dados | `AppDbContext` (Entity Framework, a ponte com o MySQL) e os dados de exemplo. |
| `Models/` | Entidades | As classes que viram tabelas. |
| `Migrations/` | — | Gerado pelo Entity Framework: o "script" que cria as tabelas. |
| `wwwroot/uploads/` | — | Onde ficam as fotos enviadas (logo, capa, funcionários). |

Não há uma camada de "Repository" separada: o `AppDbContext` do Entity Framework já faz esse papel,
e criar outra camada só repetiria código.

### Segurança
- Senhas com **BCrypt custo 12**. O BCrypt gera um *salt* aleatório por senha e guarda junto do hash.
- Login com mesma mensagem e mesmo tempo de resposta para e-mail inexistente ou senha errada.
- Token JWT assinado, expira em 8 horas; cada admin só acessa a própria barbearia.
- Link de "esqueci a senha" vale 1 hora, só funciona uma vez e no banco fica só o hash dele.
- **Limite de requisições por IP:** 120 por minuto em qualquer rota, e só 10 por minuto em login, cadastro,
  agendar e consulta por código (depois responde 429, sem ir ao banco).
- **Paginação** na busca de barbearias (12 por página, `?pagina=2`), a única lista pública que cresce sem
  limite. As outras listas já são pequenas por natureza (os agendamentos são sempre de um dia, e serviços e
  funcionários são só da barbearia do admin), então paginar ali só complicaria.
- Corpo das requisições limitado a 1 MB (fotos: 2 MB) e texto da busca a 100 caracteres.
- Isso protege contra abuso de uma pessoa ou de um robô. Um DDoS de verdade (milhares de computadores)
  só se segura antes de chegar na API, com um serviço como o Cloudflare na hora de publicar o site.
- Fotos: até 2 MB, e a API confere os bytes do arquivo (não só a extensão); o nome do arquivo é gerado pelo servidor.
- Segredos no User Secrets; CORS liberado só para o endereço do front; em produção, só HTTPS e erros sem detalhes internos.
- Agendar também tem limite por IP (um robô não consegue lotar a agenda nem disparar e-mails em massa).
- E-mail do cliente: a API aceita um único endereço de verdade e todo texto do e-mail é escapado (sem HTML injetado).
- Cabeçalho `X-Content-Type-Options: nosniff`: o navegador nunca trata uma foto enviada como página.

## 3. Rotas da API

Datas no formato `2026-11-03`, horas no formato `18:30`. Erros de regra voltam como `{ "mensagem": "..." }`.

### Área do cliente (sem login)
| Método | Rota | Tela |
|---|---|---|
| GET | `/api/barbearias?busca=suzano&pagina=1` | 1: lista e busca (nome, bairro ou cidade), 12 por página: `{ itens, pagina, temMais }` |
| GET | `/api/barbearias/{id}` | 1b: página da barbearia (serviços, equipe, horários) |
| GET | `/api/barbearias/{id}/dias` | faixa dos próximos dias (aberto/fechado) |
| GET | `/api/barbearias/{id}/horarios?servicoId=1&data=2026-11-03` | 3 e 4: profissionais do serviço e os horários de cada um (`livre: false` = riscado). Ao remarcar, some `&remarcando=CODIGO` para o horário atual do cliente aparecer livre |
| POST | `/api/barbearias/{id}/agendamentos` | 5: confirmar (nome obrigatório, e-mail opcional, `aceiteDados: true`) e receber o código |
| POST | `/api/agendamentos/consultar` | 7: `{ codigo, nome }` |
| POST | `/api/agendamentos/{codigo}/cancelar` | 7: `{ nome }` |
| POST | `/api/agendamentos/{codigo}/remarcar` | 7: `{ nome, funcionarioId, data, hora }` |

### Login (admin)
| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/auth/cadastro` | cadastra barbearia + admin e já devolve o token |
| POST | `/api/auth/login` | devolve o token (vale 8 horas) |
| POST | `/api/auth/esqueci-senha` | manda o link de nova senha por e-mail |
| POST | `/api/auth/redefinir-senha` | `{ token, novaSenha }` |
| PUT | `/api/auth/senha` | trocar a senha estando logado |

Logout: o front só apaga o token que guardou.

### Painel do admin (precisa do token)
| Método | Rota | Tela |
|---|---|---|
| GET | `/api/admin/inicio?data=...` | 10: cartões do dia + lista de agendamentos |
| GET | `/api/admin/agendamentos?data=...&funcionarioId=...` | lista de agendamentos |
| PATCH | `/api/admin/agendamentos/{id}/status` | `{ "status": "Concluido" }` (Confirmado, Concluido, Cancelado, NaoCompareceu) |
| POST | `/api/admin/agendamentos/{id}/remarcar` | `{ funcionarioId, data, hora }` |
| DELETE | `/api/admin/agendamentos/{id}/dados-cliente` | apaga nome/e-mail do cliente (LGPD) |
| GET/POST | `/api/admin/servicos` | 12: listar / criar |
| PUT/DELETE | `/api/admin/servicos/{id}` | editar / excluir (só se nunca teve agendamento) |
| PATCH | `/api/admin/servicos/{id}/ativo` | ativar/desativar |
| GET/POST | `/api/admin/funcionarios` | 13: listar / criar (com `servicoIds` e `disponibilidades`) |
| GET/PUT/DELETE | `/api/admin/funcionarios/{id}` | ver / editar / excluir |
| PATCH | `/api/admin/funcionarios/{id}/ativo` | ativar/desativar |
| POST | `/api/admin/funcionarios/{id}/foto` | enviar foto (campo `arquivo`, JPG/PNG/WEBP até 2 MB) |
| GET/PUT | `/api/admin/horarios` | 14: horário por dia da semana + antecedência mínima + dias de agenda aberta |
| GET/PUT | `/api/admin/barbearia` | 16: dados da barbearia; `ativa` liga/desliga na busca; `pendencias` mostra o que falta |
| POST | `/api/admin/barbearia/logo` e `/capa` | enviar logo e foto de capa |

As fotos voltam como caminho (`/uploads/abc.jpg`). No front, monte o endereço completo:
`http://localhost:5222/uploads/abc.jpg`.

## 4. Regras importantes que a API garante

- Blocos de 30 min a partir da abertura; o serviço precisa terminar até o fechamento (RN01, RN02).
- Serviço de 60 min ocupa dois blocos seguidos (RN03).
- Um barbeiro nunca tem dois clientes no mesmo bloco, e barbeiros diferentes podem atender no mesmo horário (RN04).
  Isso é garantido por um **índice único no banco**: testamos 8 pedidos ao mesmo tempo para o mesmo horário e só 1 foi aceito (RNF13).
- Só aparecem barbearias ativas com pelo menos um serviço e um funcionário (RN14).
- O preço fica gravado no agendamento; mudar o preço depois não altera o que já foi marcado (RN10).
- Consulta por código + nome, sem diferenciar maiúsculas e acentos, aceitando só o primeiro nome (RN16).
- Cada admin só vê e altera os dados da própria barbearia (RN13).
- Senhas guardadas com hash BCrypt (RNF06) e token JWT que expira em 8 horas (RNF07).

## 5. E-mails

O sistema manda e-mail **só para quem informou e-mail** ao agendar: confirmação (com nome da barbearia,
endereço, data, horário, serviço, profissional e código), remarcação, cancelamento, lembretes de 24h e 1h
antes (verificados a cada 5 minutos) e o link de "esqueci minha senha" do admin.

É **uma conta geral do sistema** (não uma por barbearia). Sem ela configurada, os e-mails são **simulados**:
aparecem no terminal da API com `[E-MAIL SIMULADO]`. Ao iniciar, a API escreve no terminal qual modo está usando.

### Ligar o envio de verdade (Gmail)
1. Crie (ou use) uma conta Gmail só para o site, por exemplo `naregua.agendamentos@gmail.com`.
2. Nessa conta, ative a **verificação em duas etapas** (myaccount.google.com → Segurança).
3. Crie uma **senha de app**: myaccount.google.com/apppasswords → dê o nome "Barbearia" → o Google mostra
   16 letras. Essa senha serve só para o site; a senha normal da conta continua secreta.
4. Guarde no User Secrets, dentro de `BackEnd/BarbeariaApi`:

   ```bash
   dotnet user-secrets set "Email:Smtp:Usuario" "naregua.agendamentos@gmail.com"
   dotnet user-secrets set "Email:Smtp:Senha" "abcd efgh ijkl mnop"
   ```

5. Reinicie a API. Deve aparecer `E-mail: envio real pelo SMTP smtp.gmail.com`.

O servidor (`smtp.gmail.com`, porta 587) e o nome que aparece como remetente (`Na Régua`) ficam no
`appsettings.json`, porque não são segredo. Usuário e senha **nunca** vão no `appsettings.json`.
Os e-mails vão para uma fila e saem em segundo plano: o cliente não espera, e se o Gmail falhar o
agendamento continua valendo (o erro aparece no terminal).

## Backup do banco (RNF05)

A API faz sozinha um backup por dia: ao iniciar e depois a cada hora ela confere se já existe o arquivo
de hoje em `BackEnd/BarbeariaApi/Backups/barbearia-AAAA-MM-DD.sql`. Se não existe, gera com o `mysqldump`
(vem junto com o MySQL). Ficam guardados os últimos 7 dias.

- Se o MySQL foi instalado em outro lugar, informe o caminho:
  `dotnet user-secrets set "Backup:Mysqldump" "D:\MySQL\bin\mysqldump.exe"`.
- Para desligar: `"Backup": { "Ativo": false }` no `appsettings.json`.
- Para restaurar um backup (apaga o que está no banco e volta ao dia do arquivo), no **Prompt de Comando**
  (cmd, não o PowerShell), dentro de `BackEnd\BarbeariaApi`:
  `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p barbearia < Backups\barbearia-2026-11-05.sql`

## 6. Para o front (React)

- O CORS já libera `http://localhost:5173` (Vite) e `http://localhost:3000`. Para outra porta, edite `Cors:Origens` no `appsettings.json`.
- Mande o token assim: cabeçalho `Authorization: Bearer <token>`.
- "Lembrar no navegador" (RF29): o front guarda o código e o nome no `localStorage` e chama `/api/agendamentos/consultar`.

## 7. Comandos úteis

| Comando | Para quê |
|---|---|
| `dotnet run --launch-profile http` | rodar a API |
| `dotnet build` | só compilar e ver se tem erro |
| `dotnet ef migrations add NomeDaMudanca` | depois de mudar algo em `Models/`, gera a migration nova (ela é aplicada sozinha ao rodar) |
| `dotnet ef database drop` | apagar o banco para começar do zero (cuidado: apaga tudo) |
