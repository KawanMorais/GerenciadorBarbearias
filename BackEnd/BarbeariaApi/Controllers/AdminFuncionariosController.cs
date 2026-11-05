using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BarbeariaApi.Controllers;

// Cadastro dos funcionários.
[Route("api/admin/funcionarios")]
public class AdminFuncionariosController : AdminControllerBase
{
    private readonly FuncionarioService _funcionarios;

    public AdminFuncionariosController(FuncionarioService funcionarios) => _funcionarios = funcionarios;

    [HttpGet]
    public Task<List<FuncionarioAdminDto>> Listar() => _funcionarios.Listar(BarbeariaId);

    [HttpGet("{id:int}")]
    public Task<FuncionarioAdminDto> Obter(int id) => _funcionarios.Obter(BarbeariaId, id);

    [HttpPost]
    public async Task<ActionResult<FuncionarioAdminDto>> Criar(SalvarFuncionarioDto dto) =>
        StatusCode(StatusCodes.Status201Created, await _funcionarios.Criar(BarbeariaId, dto));

    [HttpPut("{id:int}")]
    public Task<FuncionarioAdminDto> Atualizar(int id, SalvarFuncionarioDto dto) =>
        _funcionarios.Atualizar(BarbeariaId, id, dto);

    [HttpPatch("{id:int}/ativo")]
    public Task<FuncionarioAdminDto> AlterarAtivo(int id, AtivoDto dto) =>
        _funcionarios.AlterarAtivo(BarbeariaId, id, dto.Ativo);

    // Formulário multipart com o campo "arquivo"
    [HttpPost("{id:int}/foto")]
    [RequestSizeLimit(UploadService.TamanhoMaximoRequisicao)]
    public async Task<IActionResult> EnviarFoto(int id, IFormFile arquivo) =>
        Ok(new { url = await _funcionarios.TrocarFoto(BarbeariaId, id, arquivo) });

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        await _funcionarios.Excluir(BarbeariaId, id);
        return NoContent();
    }
}
