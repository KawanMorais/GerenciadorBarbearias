using System.ComponentModel.DataAnnotations;
using BarbeariaApi.Models;

namespace BarbeariaApi.Dtos;

// ---------- Login e cadastro ----------

public class CadastroDto
{
    // Dados do administrador
    [Required(ErrorMessage = "Informe seu nome.")] [StringLength(120)]
    public string AdminNome { get; set; } = "";

    [Required(ErrorMessage = "Informe o e-mail.")] [EmailAddress(ErrorMessage = "E-mail inválido.")] [StringLength(160)]
    public string Email { get; set; } = "";

    [Required] [StringLength(100, MinimumLength = 6, ErrorMessage = "A senha precisa ter pelo menos 6 caracteres.")]
    public string Senha { get; set; } = "";

    [Required] [Compare(nameof(Senha), ErrorMessage = "As senhas não conferem.")]
    public string ConfirmarSenha { get; set; } = "";

    // Dados da barbearia
    [Required(ErrorMessage = "Informe o nome da barbearia.")] [StringLength(120)]
    public string BarbeariaNome { get; set; } = "";
    [StringLength(20)] public string? Documento { get; set; }
    [StringLength(200)] public string? Endereco { get; set; }
    [StringLength(80)] public string? Bairro { get; set; }
    [StringLength(80)] public string? Cidade { get; set; }
    [StringLength(20)] public string? Telefone { get; set; }
}

public class LoginDto
{
    [Required(ErrorMessage = "Informe o e-mail.")] public string Email { get; set; } = "";
    [Required(ErrorMessage = "Informe a senha.")] public string Senha { get; set; } = "";
}

public record LoginRespostaDto(string Token, DateTime ExpiraEm, int BarbeariaId, string BarbeariaNome, string AdminNome);

public class EsqueciSenhaDto
{
    [Required] [EmailAddress] public string Email { get; set; } = "";
}

public class RedefinirSenhaDto
{
    [Required] public string Token { get; set; } = "";
    [Required] [StringLength(100, MinimumLength = 6, ErrorMessage = "A senha precisa ter pelo menos 6 caracteres.")]
    public string NovaSenha { get; set; } = "";
}

public class AlterarSenhaDto
{
    [Required] public string SenhaAtual { get; set; } = "";
    [Required] [StringLength(100, MinimumLength = 6, ErrorMessage = "A senha precisa ter pelo menos 6 caracteres.")]
    public string NovaSenha { get; set; } = "";
}

// ---------- Minha barbearia ----------

public record MinhaBarbeariaDto(int Id, string Nome, string? Documento, string? Descricao, string? Endereco,
    string? Bairro, string? Cidade, string? Telefone, string? LogoUrl, string? CapaUrl, bool Ativa,
    int AntecedenciaMinimaHoras, int DiasAgendaAberta, bool VisivelNaBusca, List<string> Pendencias);

public class AtualizarBarbeariaDto
{
    [Required(ErrorMessage = "Informe o nome da barbearia.")] [StringLength(120)]
    public string Nome { get; set; } = "";
    [StringLength(20)] public string? Documento { get; set; }
    [StringLength(2000)] public string? Descricao { get; set; }
    [StringLength(200)] public string? Endereco { get; set; }
    [StringLength(80)] public string? Bairro { get; set; }
    [StringLength(80)] public string? Cidade { get; set; }
    [StringLength(20)] public string? Telefone { get; set; }
    public bool Ativa { get; set; } = true;
}

// ---------- Horários ----------

public class HorariosDto
{
    // Dia fora da lista = fechado.
    public List<HorarioFuncionamentoDto> Dias { get; set; } = new();

    [Range(0, 72, ErrorMessage = "A antecedência mínima deve ser entre 0 e 72 horas.")]
    public int AntecedenciaMinimaHoras { get; set; } = 1;

    [Range(1, 180, ErrorMessage = "A agenda pode ficar aberta de 1 a 180 dias.")]
    public int DiasAgendaAberta { get; set; } = 30;
}

// ---------- Serviços ----------

public record ServicoAdminDto(int Id, string Nome, string? Descricao, decimal Preco, int DuracaoMinutos, bool Ativo);

public class SalvarServicoDto
{
    [Required(ErrorMessage = "Informe o nome do serviço.")] [StringLength(100)]
    public string Nome { get; set; } = "";
    [StringLength(500)] public string? Descricao { get; set; }

    [Range(0, 100000, ErrorMessage = "Preço inválido.")]
    public decimal Preco { get; set; }

    [Range(30, 480, ErrorMessage = "A duração deve ser entre 30 e 480 minutos.")]
    public int DuracaoMinutos { get; set; } = 30;

    public bool Ativo { get; set; } = true;
}

public class AtivoDto
{
    public bool Ativo { get; set; }
}

// ---------- Funcionários ----------

public record DisponibilidadeDto(DayOfWeek DiaSemana, TimeOnly Inicio, TimeOnly Fim);

public record FuncionarioAdminDto(int Id, string Nome, string? FotoUrl, string? Telefone, string? Especialidades,
    bool Ativo, List<int> ServicoIds, List<DisponibilidadeDto> Disponibilidades);

public class SalvarFuncionarioDto
{
    [Required(ErrorMessage = "Informe o nome do funcionário.")] [StringLength(120)]
    public string Nome { get; set; } = "";
    [StringLength(20)] public string? Telefone { get; set; }
    [StringLength(300)] public string? Especialidades { get; set; }
    public bool Ativo { get; set; } = true;
    public List<int> ServicoIds { get; set; } = new();

    // Vazio = trabalha em todo o horário da barbearia.
    public List<DisponibilidadeDto> Disponibilidades { get; set; } = new();
}

// ---------- Agendamentos e resumo do dia ----------

public class AlterarStatusDto
{
    [Required] public StatusAgendamento Status { get; set; }
}

public class RemarcarAdminDto
{
    [Required] public int FuncionarioId { get; set; }
    [Required] public DateOnly Data { get; set; }
    [Required] public TimeOnly Hora { get; set; }
}

public record InicioDto(DateOnly Data, int AgendamentosHoje, int ProximosAtendimentos,
    decimal FaturamentoEstimado, int Cancelamentos, List<AgendamentoDto> Agendamentos);
