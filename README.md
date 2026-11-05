# Na Régua · Agendamento de barbearias

Site para agendar horário em barbearias sem precisar criar conta. O cliente escolhe a barbearia,
o serviço, o profissional e o horário, e recebe um código para consultar, remarcar ou cancelar.
A barbearia tem um painel para cuidar dos serviços, da equipe, dos horários e dos agendamentos.

- **Back-end:** C# / ASP.NET Core (.NET 10) + MySQL 8
- **Front-end:** React + TypeScript (Vite)

## Só quero testar (sem mexer em código)

1. Instale o **MySQL 8.0**: <https://dev.mysql.com/downloads/installer/> (escolha "Server only" e crie uma senha para o root).
2. Baixe o **[Barbearia-teste.zip](https://github.com/KawanMorais/GerenciadorBarbearias/releases/latest/download/Barbearia-teste.zip)** e extraia (botão direito → Extrair tudo).
3. Dê dois cliques em **`Iniciar.bat`** e digite a senha do root do MySQL.
   Se o Windows avisar "O Windows protegeu o computador": **Mais informações** → **Executar assim mesmo**.
4. O site abre sozinho no navegador. Login de teste: `demo@barbearia.com` / `demo1234`.

Não precisa instalar .NET nem Node.

## Como rodar pelo código

São duas partes que ficam abertas ao mesmo tempo: a **API** (back-end) e o **site** (front-end).

### 1. Instale os programas (só na primeira vez)

- **.NET 10 SDK:** `winget install Microsoft.DotNet.SDK.10`
- **Node.js:** `winget install OpenJS.NodeJS.LTS`
- **MySQL 8.0:** <https://dev.mysql.com/downloads/installer/> (escolha "Server only" e crie uma senha para o root)

Depois de instalar, feche e abra o terminal de novo.

### 2. Baixe o código

```bash
git clone https://github.com/KawanMorais/GerenciadorBarbearias.git
cd GerenciadorBarbearias
```

### 3. Configure a API (só na primeira vez)

Troque `SUA_SENHA` pela senha do root do MySQL:

```bash
cd BackEnd/BarbeariaApi
dotnet user-secrets set "ConnectionStrings:Banco" "Server=localhost;Port=3306;Database=barbearia;User=root;Password=SUA_SENHA;"
dotnet user-secrets set "Jwt:Chave" "uma-frase-qualquer-com-mais-de-32-caracteres-123"
```

As senhas ficam guardadas no seu PC (User Secrets), fora do código.

### 4. Rode a API (terminal 1)

```bash
cd BackEnd/BarbeariaApi
dotnet run --launch-profile http
```

Espere aparecer `Now listening on: http://localhost:5222` e **deixe esse terminal aberto**.
Na primeira vez, a API cria sozinha o banco e uma barbearia de exemplo.

### 5. Rode o site (terminal 2)

Abra **outro** terminal na pasta `GerenciadorBarbearias`:

```bash
cd FrontEnd
npm install
npm run dev
```

O `npm install` só é preciso na primeira vez. Depois abra <http://localhost:5173> no navegador.

### 6. Teste

- **Como cliente:** escolha a "Gêmeos Barbearia" e agende um horário.
- **Como barbearia:** clique em "Sou barbearia" e entre com `demo@barbearia.com` / `demo1234`.

Nas próximas vezes, é só repetir os passos 4 e 5.

## Se der erro

| Mensagem | O que fazer |
|---|---|
| `Falta a conexão com o MySQL` | Faça o passo 3 dentro da pasta `BackEnd/BarbeariaApi`. |
| `Access denied for user 'root'` | Senha errada no passo 3. Rode o comando da conexão de novo. |
| `Unable to connect to any of the specified MySQL hosts` | O MySQL está parado: Serviços do Windows → `MySQL80` → Iniciar. |
| O site diz "Não foi possível falar com o servidor" | A API (passo 4) não está rodando. |
| `npm` bloqueado: "execução de scripts foi desabilitada" | Rode `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` uma vez. |

Mais detalhes (rotas da API, envio de e-mail, backup): [`BackEnd/README.md`](BackEnd/README.md) e [`FrontEnd/README.md`](FrontEnd/README.md).
