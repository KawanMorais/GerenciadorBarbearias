using System.Diagnostics;
using MySql.Data.MySqlClient;

namespace BarbeariaApi.Services;

// Backup diário com mysqldump na pasta Backups (mantém 7 dias). Confere a cada hora.
public class BackupService : BackgroundService
{
    private const int DiasGuardados = 7;
    private const string MysqldumpPadraoWindows = @"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe";

    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<BackupService> _logger;

    public BackupService(IConfiguration config, IWebHostEnvironment env, ILogger<BackupService> logger)
    {
        _config = config;
        _env = env;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_config.GetValue("Backup:Ativo", true)) return;

        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try
            {
                await FazerBackupDeHoje(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Falha no backup do banco");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task FazerBackupDeHoje(CancellationToken ct)
    {
        var pasta = Path.Combine(_env.ContentRootPath, _config["Backup:Pasta"] ?? "Backups");
        Directory.CreateDirectory(pasta);
        var arquivo = Path.Combine(pasta, $"barbearia-{Relogio.Hoje():yyyy-MM-dd}.sql");
        if (File.Exists(arquivo)) return;

        var conexao = new MySqlConnectionStringBuilder(_config.GetConnectionString("Banco"));

        // Senha em arquivo temporário, não na linha de comando.
        var arquivoSenha = Path.GetTempFileName();
        var temporario = arquivo + ".parcial";
        try
        {
            var senha = conexao.Password.Replace("\\", "\\\\").Replace("\"", "\\\"");
            await File.WriteAllTextAsync(arquivoSenha, $"[client]\npassword=\"{senha}\"\n", ct);

            var mysqldump = _config["Backup:Mysqldump"]
                            ?? (File.Exists(MysqldumpPadraoWindows) ? MysqldumpPadraoWindows : "mysqldump");
            var inicio = new ProcessStartInfo(mysqldump)
            {
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            foreach (var arg in new[]
                     {
                         $"--defaults-extra-file={arquivoSenha}",   // precisa ser o primeiro argumento
                         $"--host={conexao.Server}", $"--port={conexao.Port}", $"--user={conexao.UserID}",
                         "--single-transaction", "--no-tablespaces", "--default-character-set=utf8mb4",
                         $"--result-file={temporario}", conexao.Database,
                     })
                inicio.ArgumentList.Add(arg);

            using var processo = Process.Start(inicio)!;
            var erros = await processo.StandardError.ReadToEndAsync(ct);
            await processo.WaitForExitAsync(ct);
            if (processo.ExitCode != 0)
            {
                _logger.LogError("Backup falhou (mysqldump saiu com código {Codigo}): {Erros}", processo.ExitCode, erros);
                return;
            }

            File.Move(temporario, arquivo);   // só se terminou inteiro
            _logger.LogInformation("Backup do banco salvo em {Arquivo}", arquivo);
        }
        catch (System.ComponentModel.Win32Exception)
        {
            _logger.LogWarning("Backup não feito: mysqldump não encontrado. Informe o caminho em \"Backup:Mysqldump\" (veja o README).");
        }
        finally
        {
            File.Delete(arquivoSenha);
            if (File.Exists(temporario)) File.Delete(temporario);
        }

        // Apaga os backups mais antigos.
        foreach (var antigo in Directory.GetFiles(pasta, "barbearia-*.sql").OrderDescending().Skip(DiasGuardados))
            File.Delete(antigo);
    }
}
