using BarbeariaApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BarbeariaApi.Data;

// Acesso ao MySQL via Entity Framework. Cada DbSet é uma tabela.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Barbearia> Barbearias => Set<Barbearia>();
    public DbSet<Administrador> Administradores => Set<Administrador>();
    public DbSet<Servico> Servicos => Set<Servico>();
    public DbSet<Funcionario> Funcionarios => Set<Funcionario>();
    public DbSet<FuncionarioServico> FuncionarioServicos => Set<FuncionarioServico>();
    public DbSet<DisponibilidadeFuncionario> Disponibilidades => Set<DisponibilidadeFuncionario>();
    public DbSet<HorarioFuncionamento> HorariosFuncionamento => Set<HorarioFuncionamento>();
    public DbSet<Agendamento> Agendamentos => Set<Agendamento>();
    public DbSet<AgendamentoBloco> AgendamentoBlocos => Set<AgendamentoBloco>();

    // O conector MySQL não lê TimeOnly/DateOnly direto; converte via TimeSpan/DateTime.
    protected override void ConfigureConventions(ModelConfigurationBuilder configuracao)
    {
        configuracao.Properties<TimeOnly>().HaveConversion<TimeOnlyParaTimeSpan>().HaveColumnType("time");
        configuracao.Properties<DateOnly>().HaveConversion<DateOnlyParaDateTime>().HaveColumnType("date");
    }

    private class TimeOnlyParaTimeSpan : ValueConverter<TimeOnly, TimeSpan>
    {
        public TimeOnlyParaTimeSpan() : base(t => t.ToTimeSpan(), s => TimeOnly.FromTimeSpan(s)) { }
    }

    private class DateOnlyParaDateTime : ValueConverter<DateOnly, DateTime>
    {
        public DateOnlyParaDateTime() : base(d => d.ToDateTime(TimeOnly.MinValue), d => DateOnly.FromDateTime(d)) { }
    }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Barbearia>(e =>
        {
            e.Property(x => x.Nome).HasMaxLength(120).IsRequired();
            e.Property(x => x.Documento).HasMaxLength(20);
            e.Property(x => x.Descricao).HasMaxLength(2000);
            e.Property(x => x.Endereco).HasMaxLength(200);
            e.Property(x => x.Bairro).HasMaxLength(80);
            e.Property(x => x.Cidade).HasMaxLength(80);
            e.Property(x => x.Telefone).HasMaxLength(20);
            e.Property(x => x.LogoUrl).HasMaxLength(300);
            e.Property(x => x.CapaUrl).HasMaxLength(300);
        });

        mb.Entity<Administrador>(e =>
        {
            e.Property(x => x.Nome).HasMaxLength(120).IsRequired();
            e.Property(x => x.Email).HasMaxLength(160).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();   // um e-mail só pode ter uma conta
            e.Property(x => x.SenhaHash).HasMaxLength(100).IsRequired();
            e.Property(x => x.TokenRecuperacao).HasMaxLength(100);
        });

        mb.Entity<Servico>(e =>
        {
            e.Property(x => x.Nome).HasMaxLength(100).IsRequired();
            e.Property(x => x.Descricao).HasMaxLength(500);
            e.Property(x => x.Preco).HasPrecision(10, 2);
        });

        mb.Entity<Funcionario>(e =>
        {
            e.Property(x => x.Nome).HasMaxLength(120).IsRequired();
            e.Property(x => x.FotoUrl).HasMaxLength(300);
            e.Property(x => x.Telefone).HasMaxLength(20);
            e.Property(x => x.Especialidades).HasMaxLength(300);
        });

        mb.Entity<FuncionarioServico>(e =>
        {
            e.HasKey(x => new { x.FuncionarioId, x.ServicoId });
            e.HasOne(x => x.Funcionario).WithMany(f => f.Servicos).HasForeignKey(x => x.FuncionarioId);
            // Restrict evita dois caminhos de exclusão em cascata.
            e.HasOne(x => x.Servico).WithMany(s => s.Funcionarios).HasForeignKey(x => x.ServicoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<Agendamento>(e =>
        {
            e.Property(x => x.Codigo).HasMaxLength(10).IsRequired();
            e.HasIndex(x => x.Codigo).IsUnique();
            e.Property(x => x.ClienteNome).HasMaxLength(120).IsRequired();
            e.Property(x => x.ClienteEmail).HasMaxLength(160);
            e.Property(x => x.PrecoCobrado).HasPrecision(10, 2);
            e.HasIndex(x => new { x.BarbeariaId, x.Data });
            e.HasOne(x => x.Funcionario).WithMany().HasForeignKey(x => x.FuncionarioId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Servico).WithMany().HasForeignKey(x => x.ServicoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<AgendamentoBloco>(e =>
        {
            // Um funcionário nunca tem dois agendamentos no mesmo bloco.
            e.HasIndex(x => new { x.FuncionarioId, x.Data, x.Hora }).IsUnique();
        });
    }
}
