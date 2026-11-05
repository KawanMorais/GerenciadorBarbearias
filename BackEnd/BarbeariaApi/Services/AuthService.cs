using System.Security.Cryptography;
using System.Text;
using BarbeariaApi.Data;
using BarbeariaApi.Dtos;
using BarbeariaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Services;

// Hash de senha com BCrypt (salt por senha, custo 12).
public static class Senha
{
    private const int Custo = 12;

    public static string Hash(string senha) => BCrypt.Net.BCrypt.HashPassword(senha, Custo);
    public static bool Confere(string senha, string hash) => BCrypt.Net.BCrypt.Verify(senha, hash);
}

// Cadastro, login e senha do administrador.
public class AuthService
{
    // Mantém o mesmo tempo de resposta quando o e-mail não existe.
    private static readonly string HashFalso = Senha.Hash("senha-falsa-para-comparacao");

    private readonly AppDbContext _db;
    private readonly TokenService _tokens;
    private readonly EmailService _email;

    public AuthService(AppDbContext db, TokenService tokens, EmailService email)
    {
        _db = db;
        _tokens = tokens;
        _email = email;
    }

    public async Task<LoginRespostaDto> Cadastrar(CadastroDto dto)
    {
        var email = NormalizarEmail(dto.Email);
        if (await _db.Administradores.AnyAsync(a => a.Email == email))
            throw new RegraException("Já existe uma conta com esse e-mail.", 409);

        var admin = new Administrador
        {
            Nome = dto.AdminNome.Trim(),
            Email = email,
            SenhaHash = Senha.Hash(dto.Senha),
            Barbearia = new Barbearia
            {
                Nome = dto.BarbeariaNome.Trim(),
                Documento = dto.Documento,
                Endereco = dto.Endereco,
                Bairro = dto.Bairro,
                Cidade = dto.Cidade,
                Telefone = dto.Telefone,
            },
        };
        _db.Administradores.Add(admin);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)   // e-mail duplicado em cadastros simultâneos
        {
            throw new RegraException("Já existe uma conta com esse e-mail.", 409);
        }
        return Resposta(admin);
    }

    public async Task<LoginRespostaDto> Login(LoginDto dto)
    {
        var email = NormalizarEmail(dto.Email);
        var admin = await _db.Administradores.Include(a => a.Barbearia).FirstOrDefaultAsync(a => a.Email == email);

        var senhaOk = Senha.Confere(dto.Senha, admin?.SenhaHash ?? HashFalso);
        if (admin == null || !senhaOk)
            throw new RegraException("E-mail ou senha incorretos.", 401);
        return Resposta(admin);
    }

    // Link válido por 1 hora; o banco guarda só o hash do token.
    public async Task EsqueciSenha(string emailInformado)
    {
        var email = NormalizarEmail(emailInformado);
        var admin = await _db.Administradores.FirstOrDefaultAsync(a => a.Email == email);
        if (admin == null) return;   // não revela se o e-mail existe

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        admin.TokenRecuperacao = HashToken(token);
        admin.TokenRecuperacaoExpiraEm = DateTime.UtcNow.AddHours(1);
        await _db.SaveChangesAsync();
        _email.EnviarRecuperacaoSenha(admin, token);
    }

    public async Task RedefinirSenha(RedefinirSenhaDto dto)
    {
        var hash = HashToken(dto.Token);
        var admin = await _db.Administradores.FirstOrDefaultAsync(a => a.TokenRecuperacao == hash);
        if (admin == null || admin.TokenRecuperacaoExpiraEm < DateTime.UtcNow)
            throw new RegraException("Link inválido ou expirado. Peça um novo.");

        admin.SenhaHash = Senha.Hash(dto.NovaSenha);
        admin.TokenRecuperacao = null;          // o link só funciona uma vez
        admin.TokenRecuperacaoExpiraEm = null;
        await _db.SaveChangesAsync();
    }

    public async Task AlterarSenha(int adminId, AlterarSenhaDto dto)
    {
        var admin = await _db.Administradores.FirstAsync(a => a.Id == adminId);
        if (!Senha.Confere(dto.SenhaAtual, admin.SenhaHash))
            throw new RegraException("A senha atual está incorreta.");

        admin.SenhaHash = Senha.Hash(dto.NovaSenha);
        await _db.SaveChangesAsync();
    }

    private LoginRespostaDto Resposta(Administrador admin)
    {
        var (token, expiraEm) = _tokens.Gerar(admin);
        return new LoginRespostaDto(token, expiraEm, admin.BarbeariaId, admin.Barbearia!.Nome, admin.Nome);
    }

    private static string NormalizarEmail(string email) => email.Trim().ToLowerInvariant();

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
