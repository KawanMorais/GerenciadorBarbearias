using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BarbeariaApi.Controllers;

// Dados da barbearia, fotos e horário de funcionamento.
[Route("api/admin")]
public class AdminBarbeariaController : AdminControllerBase
{
    private readonly BarbeariaService _barbearias;

    public AdminBarbeariaController(BarbeariaService barbearias) => _barbearias = barbearias;

    [HttpGet("barbearia")]
    public Task<MinhaBarbeariaDto> Obter() => _barbearias.ObterMinha(BarbeariaId);

    [HttpPut("barbearia")]
    public Task<MinhaBarbeariaDto> Atualizar(AtualizarBarbeariaDto dto) => _barbearias.Atualizar(BarbeariaId, dto);

    // Formulário multipart com o campo "arquivo"
    [HttpPost("barbearia/logo")]
    [RequestSizeLimit(UploadService.TamanhoMaximoRequisicao)]
    public async Task<IActionResult> EnviarLogo(IFormFile arquivo) =>
        Ok(new { url = await _barbearias.TrocarLogo(BarbeariaId, arquivo) });

    [HttpPost("barbearia/capa")]
    [RequestSizeLimit(UploadService.TamanhoMaximoRequisicao)]
    public async Task<IActionResult> EnviarCapa(IFormFile arquivo) =>
        Ok(new { url = await _barbearias.TrocarCapa(BarbeariaId, arquivo) });

    [HttpGet("horarios")]
    public Task<HorariosDto> ObterHorarios() => _barbearias.ObterHorarios(BarbeariaId);

    [HttpPut("horarios")]
    public Task<HorariosDto> SalvarHorarios(HorariosDto dto) => _barbearias.SalvarHorarios(BarbeariaId, dto);
}
