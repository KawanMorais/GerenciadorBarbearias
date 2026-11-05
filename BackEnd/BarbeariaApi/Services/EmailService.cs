using System.Globalization;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Channels;
using BarbeariaApi.Models;

namespace BarbeariaApi.Services;

// Envia os e-mails do sistema por uma conta SMTP única, em segundo plano (fila).
// Sem usuário/senha no User Secrets, só registra no console (modo simulado).
public class EmailService : BackgroundService
{
    private static readonly CultureInfo PtBr = new("pt-BR");

    private record Email(string Para, string Assunto, string Texto, string Html);

    // Fila limitada a 1000 e-mails.
    private readonly Channel<Email> _fila = Channel.CreateBounded<Email>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropWrite });
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private string? Usuario => _config["Email:Smtp:Usuario"];
    private string? Senha => _config["Email:Smtp:Senha"]?.Replace(" ", "");   // senha de app vem com espaços
    private bool Configurado => !string.IsNullOrWhiteSpace(_config["Email:Smtp:Host"])
                                && !string.IsNullOrWhiteSpace(Usuario) && !string.IsNullOrWhiteSpace(Senha);

    // ---------- E-mails do cliente (só se ele informou e-mail) ----------

    public void EnviarConfirmacao(Agendamento a) =>
        ParaCliente(a, $"Agendamento confirmado em {a.Barbearia?.Nome}", "Seu horário está confirmado.",
            "Para consultar, remarcar ou cancelar, use o código e o seu nome no site.");

    public void EnviarRemarcacao(Agendamento a) =>
        ParaCliente(a, $"Agendamento remarcado em {a.Barbearia?.Nome}", "Seu horário foi remarcado. Os novos dados são:",
            "Para consultar, remarcar ou cancelar, use o código e o seu nome no site.");

    public void EnviarCancelamento(Agendamento a) =>
        ParaCliente(a, $"Agendamento cancelado em {a.Barbearia?.Nome}", "Este agendamento foi cancelado:",
            "Se quiser, é só agendar um novo horário pelo site.");

    public void EnviarLembrete(Agendamento a, string quando) =>
        ParaCliente(a, $"Lembrete: seu horário é {quando}", $"Passando para lembrar do seu horário {quando}.", null);

    private void ParaCliente(Agendamento a, string assunto, string abertura, string? fechamento)
    {
        if (string.IsNullOrWhiteSpace(a.ClienteEmail)) return;   // sem e-mail, sem notificação
        var resumo = new (string, string)[]
        {
            ("Barbearia", a.Barbearia?.Nome ?? ""),
            ("Endereço", a.Barbearia?.Endereco ?? "—"),
            ("Data", a.Data.ToString("dddd, dd/MM/yyyy", PtBr)),
            ("Horário", a.HoraInicio.ToString("HH:mm")),
            ("Serviço", $"{a.Servico?.Nome} ({a.PrecoCobrado.ToString("C", PtBr)}, pago na barbearia)"),
            ("Profissional", a.Funcionario?.Nome ?? ""),
            ("Código", a.Codigo),
        };
        Enfileirar(a.ClienteEmail, assunto, $"Olá, {a.ClienteNome}!", abertura, resumo, fechamento);
    }

    // ---------- E-mail do administrador ----------

    public void EnviarRecuperacaoSenha(Administrador admin, string token)
    {
        var link = $"{_config["FrontEndUrl"]}/redefinir-senha?token={token}";
        Enfileirar(admin.Email, "Recuperação de senha", $"Olá, {admin.Nome}!",
            "Para criar uma nova senha, acesse o link abaixo. Ele vale por 1 hora.",
            new[] { ("Link", link) },
            "Se não foi você que pediu, ignore este e-mail. Sua senha continua a mesma.");
    }

    // ---------- Montagem e envio ----------

    // Versão texto + HTML; dados do usuário passam por HtmlEncode.
    private void Enfileirar(string para, string assunto, string saudacao, string abertura,
        IEnumerable<(string Rotulo, string Valor)> linhas, string? fechamento)
    {
        var texto = $"{saudacao}\n\n{abertura}\n\n" +
                    string.Join("\n", linhas.Select(l => $"{l.Rotulo}: {l.Valor}")) +
                    (fechamento == null ? "" : $"\n\n{fechamento}");

        static string H(string s) => WebUtility.HtmlEncode(s);
        var html = $"""
            <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:520px">
              <p>{H(saudacao)}</p>
              <p>{H(abertura)}</p>
              <table style="border-collapse:collapse">
                {string.Concat(linhas.Select(l =>
                    $"<tr><td style=\"padding:4px 12px 4px 0;color:#666\">{H(l.Rotulo)}</td><td style=\"padding:4px 0\"><strong>{H(l.Valor)}</strong></td></tr>"))}
              </table>
              {(fechamento == null ? "" : $"<p>{H(fechamento)}</p>")}
            </div>
            """;

        _fila.Writer.TryWrite(new Email(para, assunto, texto, html));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(Configurado
            ? "E-mail: envio real pelo SMTP {Host}, conta {Usuario}."
            : "E-mail: modo SIMULADO (falta Email:Smtp:Usuario/Senha no User Secrets). Os e-mails só aparecem no console.",
            _config["Email:Smtp:Host"], Usuario);

        await foreach (var email in _fila.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await Enviar(email, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Falha ao enviar e-mail para {Para}", email.Para);
            }
        }
    }

    private async Task Enviar(Email email, CancellationToken ct)
    {
        if (!Configurado)
        {
            _logger.LogInformation("[E-MAIL SIMULADO] Para: {Para} | Assunto: {Assunto}\n{Texto}", email.Para, email.Assunto, email.Texto);
            return;
        }

        // SmtpClient só suporta STARTTLS (porta 587).
        using var smtp = new SmtpClient(_config["Email:Smtp:Host"], _config.GetValue("Email:Smtp:Porta", 587))
        {
            EnableSsl = true,
            Timeout = 20_000,
            Credentials = new NetworkCredential(Usuario, Senha),
        };

        // O Gmail exige que o remetente seja a própria conta.
        using var msg = new MailMessage
        {
            From = new MailAddress(Usuario!, _config["Email:NomeRemetente"] ?? "Na Régua"),
            Subject = email.Assunto,
            Body = email.Texto,
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
        };
        msg.To.Add(new MailAddress(email.Para));   // um único destinatário
        msg.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(email.Html, Encoding.UTF8, "text/html"));

        await smtp.SendMailAsync(msg, ct);
        _logger.LogInformation("E-mail enviado para {Para}: {Assunto}", email.Para, email.Assunto);
    }
}
