using BarbeariaApi.Data;
using BarbeariaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Services;

// A cada 5 minutos, envia os lembretes de 24h e 1h antes do horário.
public class LembreteService : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<LembreteService> _logger;

    public LembreteService(IServiceScopeFactory scopes, ILogger<LembreteService> logger)
    {
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        do
        {
            try
            {
                await EnviarLembretes(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao enviar lembretes");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task EnviarLembretes(CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<EmailService>();

        var agora = Relogio.Agora();
        var hoje = DateOnly.FromDateTime(agora);
        var amanha = hoje.AddDays(1);

        var pendentes = await db.Agendamentos
            .Include(a => a.Barbearia).Include(a => a.Servico).Include(a => a.Funcionario)
            .Where(a => a.Status == StatusAgendamento.Confirmado && a.ClienteEmail != null
                        && (a.Data == hoje || a.Data == amanha)
                        && (!a.Lembrete24hEnviado || !a.Lembrete1hEnviado))
            .ToListAsync(ct);

        foreach (var a in pendentes)
        {
            var inicio = a.Data.ToDateTime(a.HoraInicio);
            var falta = inicio - agora;
            if (falta <= TimeSpan.Zero) continue;

            if (!a.Lembrete1hEnviado && falta <= TimeSpan.FromHours(1))
            {
                email.EnviarLembrete(a, $"hoje às {a.HoraInicio:HH\\:mm}");
                a.Lembrete1hEnviado = true;
                a.Lembrete24hEnviado = true;   // o de 24h fica dispensado
            }
            else if (!a.Lembrete24hEnviado && falta <= TimeSpan.FromHours(24))
            {
                var dia = a.Data == hoje ? "hoje" : "amanhã";
                email.EnviarLembrete(a, $"{dia} às {a.HoraInicio:HH\\:mm}");
                a.Lembrete24hEnviado = true;
            }
        }
        await db.SaveChangesAsync(ct);
    }
}
