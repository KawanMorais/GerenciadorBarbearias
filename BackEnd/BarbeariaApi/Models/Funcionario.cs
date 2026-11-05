namespace BarbeariaApi.Models;

// Barbeiro que atende os clientes.
public class Funcionario
{
    public int Id { get; set; }
    public int BarbeariaId { get; set; }
    public Barbearia? Barbearia { get; set; }

    public string Nome { get; set; } = "";
    public string? FotoUrl { get; set; }
    public string? Telefone { get; set; }
    public string? Especialidades { get; set; }
    public bool Ativo { get; set; } = true;

    public List<FuncionarioServico> Servicos { get; set; } = new();
    public List<DisponibilidadeFuncionario> Disponibilidades { get; set; } = new();
}

// Tabela de ligação: quais serviços cada funcionário realiza.
public class FuncionarioServico
{
    public int FuncionarioId { get; set; }
    public Funcionario? Funcionario { get; set; }
    public int ServicoId { get; set; }
    public Servico? Servico { get; set; }
}

// Dias e horários de trabalho. Sem nenhum cadastro, vale o horário da barbearia.
public class DisponibilidadeFuncionario
{
    public int Id { get; set; }
    public int FuncionarioId { get; set; }
    public Funcionario? Funcionario { get; set; }

    public DayOfWeek DiaSemana { get; set; }
    public TimeOnly Inicio { get; set; }
    public TimeOnly Fim { get; set; }
}
