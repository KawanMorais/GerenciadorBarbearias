using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BarbeariaApi.Models;
using Microsoft.IdentityModel.Tokens;

namespace BarbeariaApi.Services;

// Gera o JWT do administrador (enviado como "Authorization: Bearer <token>").
public class TokenService
{
    public const string ClaimBarbeariaId = "barbeariaId";

    private readonly IConfiguration _config;

    public TokenService(IConfiguration config) => _config = config;

    public (string token, DateTime expiraEm) Gerar(Administrador admin)
    {
        var chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Chave"]!));
        var expiraEm = DateTime.UtcNow.AddHours(_config.GetValue("Jwt:HorasValidade", 8));   // validade do token

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, admin.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, admin.Email),
            new Claim(JwtRegisteredClaimNames.Name, admin.Nome),
            new Claim(ClaimBarbeariaId, admin.BarbeariaId.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Emissor"],
            audience: _config["Jwt:Emissor"],
            claims: claims,
            expires: expiraEm,
            signingCredentials: new SigningCredentials(chave, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiraEm);
    }
}
