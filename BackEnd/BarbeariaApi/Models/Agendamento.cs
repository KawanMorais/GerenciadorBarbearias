namespace BarbeariaApi.Models;

public enum StatusAgendamento
{
    Confirmado = 0,
    Concluido = 1,
    Cancelado = 2,
    NaoCompareceu = 3
}

// Um horário marcado pelo cliente.
public class Agendamento
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";   // usado com o nome para consultar

    public int BarbeariaId { get; set; }
    public Barbearia? Barbearia { get; set; }
    public int FuncionarioId { get; set; }
    public Funcionario? Funcionario { get; set; }
    public int ServicoId { get; set; }
    public Servico? Servico { get; set; }

    // E-mail opcional, só para notificações.
    public string ClienteNome { get; set; } = "";
    public string? ClienteEmail { get; set; }

    public DateOnly Data { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFim { get; set; }
    public decimal PrecoCobrado { get; set; }   // preço do momento da reserva
    public StatusAgendamento Status { get; set; } = StatusAgendamento.Confirmado;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    // Controle dos lembretes por e-mail.
    public bool Lembrete24hEnviado { get; set; }
    public bool Lembrete1hEnviado { get; set; }

    public List<AgendamentoBloco> Blocos { get; set; } = new();
}

// Bloco de 30 min ocupado. O índice único (FuncionarioId, Data, Hora) impede reserva dupla;
// ao cancelar, os blocos são apagados.
public class AgendamentoBloco
{
    public int Id { get; set; }
    public int AgendamentoId { get; set; }
    public Agendamento? Agendamento { get; set; }
    public int FuncionarioId { get; set; }
    public DateOnly Data { get; set; }
    public TimeOnly Hora { get; set; }
}
