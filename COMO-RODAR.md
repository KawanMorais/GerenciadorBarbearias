# Como mandar o site para alguém testar

Quem testa só precisa instalar o **MySQL**.

## Você (quem manda)

1. Dê dois cliques em `Pacote\gerar-pacote.bat` e espere terminar (cerca de 1 minuto).
2. Mande **só** o arquivo `Pacote\Barbearia-teste.zip` para o seu amigo (não a pasta `Pacote` inteira).
   Dentro dele já vai um `LEIA-ME.txt` com estes mesmos passos.

## Seu amigo (quem testa)

1. Instala o MySQL 8.0: <https://dev.mysql.com/downloads/installer/>
   Escolhe **Server only**, cria uma senha para o **root** e anota.
2. Extrai o `Barbearia-teste.zip` (botão direito → **Extrair tudo**).
3. Dá dois cliques em `Iniciar.bat` e digita a senha do root.
   Se o Windows avisar "O Windows protegeu o computador": **Mais informações** → **Executar assim mesmo**.
4. O site abre sozinho no navegador. Login da barbearia de teste: `demo@barbearia.com` / `demo1234`.

Para fechar, é só fechar a janela preta.

## Se der erro

| Mensagem na janela preta | Solução |
|---|---|
| `Access denied` | Senha do MySQL errada. Abra o `Iniciar.bat` de novo. |
| `Unable to connect` | MySQL parado. Menu Iniciar → Serviços → `MySQL80` → Iniciar. |

---

Para mexer no código (precisa de .NET e Node), veja `BackEnd/README.md` e `FrontEnd/README.md`.
