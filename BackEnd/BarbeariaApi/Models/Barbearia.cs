namespace BarbeariaApi.Models;

// Barbearia cadastrada no sistema.
public class Barbearia
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string? Documento { get; set; }          // CNPJ ou CPF (opcional)
    public string? Descricao { get; set; }          // "Sobre a barbearia"
    public string? Endereco { get; set; }
    public string? Bairro { get; set; }
    public string? Cidade { get; set; }
    public string? Telefone { get; set; }
    public string? LogoUrl { get; set; }
    public string? CapaUrl { get; set; }

    // Ativa = aparece na busca.
    public bool Ativa { get; set; } = true;

    // Prazos para o cliente marcar.
    public int AntecedenciaMinimaHoras { get; set; } = 1;   // antecedência mínima para marcar
    public int DiasAgendaAberta { get; set; } = 30;         // até quantos dias à frente

    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;

    public List<Administrador> Administradores { get; set; } = new();
    public List<Servico> Servicos { get; set; } = new();
    public List<Funcionario> Funcionarios { get; set; } = new();
    public List<HorarioFuncionamento> Horarios { get; set; } = new();
}
