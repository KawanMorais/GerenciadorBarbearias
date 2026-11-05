using System.ComponentModel.DataAnnotations;
using BarbeariaApi.Models;

namespace BarbeariaApi.Dtos;

// Formatos do JSON que entra e sai da API (sem expor as entidades).

public record HorarioDto(TimeOnly Hora, bool Livre);

public record ProfissionalHorariosDto(int Id, string Nome, string? FotoUrl, int Livres, List<HorarioDto> Horarios);

public record DiaDto(DateOnly Data, bool Aberto);

public record HorarioFuncionamentoDto(DayOfWeek DiaSemana, TimeOnly Abertura, TimeOnly Fechamento);

// Uma página de uma lista; TemMais indica se há próxima.
public record PaginaDto<T>(List<T> Itens, int Pagina, bool TemMais);

public record BarbeariaResumoDto(int Id, string Nome, string? LogoUrl, string? Endereco, string? Bairro,
    string? Cidade, List<HorarioFuncionamentoDto> Horarios);

public record ServicoPublicoDto(int Id, string Nome, string? Descricao, decimal Preco, int DuracaoMinutos);

public record FuncionarioPublicoDto(int Id, string Nome, string? FotoUrl, List<int> ServicoIds);

public record BarbeariaDetalheDto(int Id, string Nome, string? Descricao, string? LogoUrl, string? CapaUrl,
    string? Endereco, string? Bairro, string? Cidade, string? Telefone,
    int AntecedenciaMinimaHoras, int DiasAgendaAberta,
    List<HorarioFuncionamentoDto> Horarios, List<ServicoPublicoDto> Servicos, List<FuncionarioPublicoDto> Equipe);

public class CriarAgendamentoDto
{
    [Required] public int ServicoId { get; set; }
    [Required] public int FuncionarioId { get; set; }
    [Required] public DateOnly Data { get; set; }
    [Required] public TimeOnly Hora { get; set; }

    [Required(ErrorMessage = "Informe seu nome.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "O nome precisa ter entre 2 e 120 letras.")]
    public string Nome { get; set; } = "";

    [EmailAddress(ErrorMessage = "E-mail inválido.")]
    [StringLength(160)]
    public string? Email { get; set; }

    // Aceite do uso dos dados (LGPD).
    [Range(typeof(bool), "true", "true", ErrorMessage = "É preciso aceitar o uso dos dados para agendar.")]
    public bool AceiteDados { get; set; }
}

public class ConsultaAgendamentoDto
{
    [Required(ErrorMessage = "Informe o código.")] public string Codigo { get; set; } = "";
    [Required(ErrorMessage = "Informe o nome.")] public string Nome { get; set; } = "";
}

public class CancelarAgendamentoDto
{
    [Required(ErrorMessage = "Informe o nome.")] public string Nome { get; set; } = "";
}

public class RemarcarAgendamentoDto
{
    [Required(ErrorMessage = "Informe o nome.")] public string Nome { get; set; } = "";
    [Required] public int FuncionarioId { get; set; }
    [Required] public DateOnly Data { get; set; }
    [Required] public TimeOnly Hora { get; set; }
}

public record AgendamentoDto(
    int Id, string Codigo, StatusAgendamento Status,
    int BarbeariaId, string BarbeariaNome, string? BarbeariaEndereco,
    int ServicoId, string ServicoNome, int DuracaoMinutos, decimal Preco,
    int FuncionarioId, string FuncionarioNome, string? FuncionarioFotoUrl,
    DateOnly Data, TimeOnly HoraInicio, TimeOnly HoraFim,
    string ClienteNome, string? ClienteEmail)
{
    public static AgendamentoDto De(Agendamento a) => new(
        a.Id, a.Codigo, a.Status,
        a.BarbeariaId, a.Barbearia?.Nome ?? "", a.Barbearia?.Endereco,
        a.ServicoId, a.Servico?.Nome ?? "", a.Servico?.DuracaoMinutos ?? 0, a.PrecoCobrado,
        a.FuncionarioId, a.Funcionario?.Nome ?? "", a.Funcionario?.FotoUrl,
        a.Data, a.HoraInicio, a.HoraFim,
        a.ClienteNome, a.ClienteEmail);
}
