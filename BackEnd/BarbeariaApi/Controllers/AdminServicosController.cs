using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BarbeariaApi.Controllers;

// Cadastro dos serviços da barbearia.
[Route("api/admin/servicos")]
public class AdminServicosController : AdminControllerBase
{
    private readonly ServicoService _servicos;

    public AdminServicosController(ServicoService servicos) => _servicos = servicos;

    [HttpGet]
    public Task<List<ServicoAdminDto>> Listar() => _servicos.Listar(BarbeariaId);

    [HttpPost]
    public async Task<ActionResult<ServicoAdminDto>> Criar(SalvarServicoDto dto) =>
        StatusCode(StatusCodes.Status201Created, await _servicos.Criar(BarbeariaId, dto));

    [HttpPut("{id:int}")]
    public Task<ServicoAdminDto> Atualizar(int id, SalvarServicoDto dto) => _servicos.Atualizar(BarbeariaId, id, dto);

    // PATCH /api/admin/servicos/5/ativo  { "ativo": false }
    [HttpPatch("{id:int}/ativo")]
    public Task<ServicoAdminDto> AlterarAtivo(int id, AtivoDto dto) => _servicos.AlterarAtivo(BarbeariaId, id, dto.Ativo);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        await _servicos.Excluir(BarbeariaId, id);
        return NoContent();
    }
}
