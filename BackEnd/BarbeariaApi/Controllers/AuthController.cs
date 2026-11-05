using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BarbeariaApi.Controllers;

// Cadastro, login e senha do administrador.
// Logout é só o front apagar o token.
[ApiController]
[Route("api/auth")]
[EnableRateLimiting(LimiteTentativas.Politica)]   // contra força bruta
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth) => _auth = auth;

    [HttpPost("cadastro")]
    public Task<LoginRespostaDto> Cadastrar(CadastroDto dto) => _auth.Cadastrar(dto);

    [HttpPost("login")]
    public Task<LoginRespostaDto> Login(LoginDto dto) => _auth.Login(dto);

    [HttpPost("esqueci-senha")]
    public async Task<IActionResult> EsqueciSenha(EsqueciSenhaDto dto)
    {
        await _auth.EsqueciSenha(dto.Email);
        return Ok(new { mensagem = "Se o e-mail estiver cadastrado, enviaremos um link para criar uma nova senha." });
    }

    [HttpPost("redefinir-senha")]
    public async Task<IActionResult> RedefinirSenha(RedefinirSenhaDto dto)
    {
        await _auth.RedefinirSenha(dto);
        return Ok(new { mensagem = "Senha alterada. Faça login com a nova senha." });
    }

    [Authorize]
    [HttpPut("senha")]
    public async Task<IActionResult> AlterarSenha(AlterarSenhaDto dto)
    {
        await _auth.AlterarSenha(int.Parse(User.FindFirst("sub")!.Value), dto);
        return Ok(new { mensagem = "Senha alterada." });
    }
}
