using BarbeariaApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BarbeariaApi.Controllers;

// Base do painel: exige login e pega do token a barbearia do admin.
[ApiController]
[Authorize]
public abstract class AdminControllerBase : ControllerBase
{
    protected int BarbeariaId => int.Parse(User.FindFirst(TokenService.ClaimBarbeariaId)!.Value);
}
