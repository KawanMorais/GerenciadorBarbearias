namespace BarbeariaApi.Models;

// Dono ou gerente da barbearia. É o único que faz login.
public class Administrador
{
    public int Id { get; set; }
    public int BarbeariaId { get; set; }
    public Barbearia? Barbearia { get; set; }

    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string SenhaHash { get; set; } = "";   // hash BCrypt

    // Usados no "Esqueci minha senha".
    public string? TokenRecuperacao { get; set; }
    public DateTime? TokenRecuperacaoExpiraEm { get; set; }
}
