namespace BarbeariaApi.Models;

// Ex.: "Corte de cabelo", 30 min, R$ 35,00.
public class Servico
{
    public int Id { get; set; }
    public int BarbeariaId { get; set; }
    public Barbearia? Barbearia { get; set; }

    public string Nome { get; set; } = "";
    public string? Descricao { get; set; }
    public decimal Preco { get; set; }
    public int DuracaoMinutos { get; set; } = 30;   // sempre múltiplo de 30
    public bool Ativo { get; set; } = true;

    public List<FuncionarioServico> Funcionarios { get; set; } = new();
}
