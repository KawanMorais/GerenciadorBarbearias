namespace BarbeariaApi.Models;

// Horário de funcionamento num dia da semana. Dia sem registro = fechado.
public class HorarioFuncionamento
{
    public int Id { get; set; }
    public int BarbeariaId { get; set; }
    public Barbearia? Barbearia { get; set; }

    public DayOfWeek DiaSemana { get; set; }
    public TimeOnly Abertura { get; set; }
    public TimeOnly Fechamento { get; set; }
}
