using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BarbeariaApi.Controllers;

// Resumo do dia e ações do admin nos agendamentos.
[Route("api/admin")]
public class AdminAgendamentosController : AdminControllerBase
{
    private readonly AgendamentoService _agendamentos;

    public AdminAgendamentosController(AgendamentoService agendamentos) => _agendamentos = agendamentos;

    // GET /api/admin/inicio?data=2026-11-03  (sem data = hoje)
    [HttpGet("inicio")]
    public Task<InicioDto> Inicio([FromQuery] DateOnly? data) => _agendamentos.Inicio(BarbeariaId, data);

    [HttpGet("agendamentos")]
    public Task<List<AgendamentoDto>> Listar([FromQuery] DateOnly? data, [FromQuery] int? funcionarioId) =>
        _agendamentos.Listar(BarbeariaId, data, funcionarioId);

    [HttpGet("agendamentos/{id:int}")]
    public Task<AgendamentoDto> Obter(int id) => _agendamentos.Obter(BarbeariaId, id);

    // PATCH /api/admin/agendamentos/7/status  { "status": "Concluido" }
    [HttpPatch("agendamentos/{id:int}/status")]
    public Task<AgendamentoDto> AlterarStatus(int id, AlterarStatusDto dto) =>
        _agendamentos.AlterarStatus(BarbeariaId, id, dto.Status);

    [HttpPost("agendamentos/{id:int}/remarcar")]
    public Task<AgendamentoDto> Remarcar(int id, RemarcarAdminDto dto) =>
        _agendamentos.RemarcarPeloAdmin(BarbeariaId, id, dto);

    [HttpDelete("agendamentos/{id:int}/dados-cliente")]
    public Task<AgendamentoDto> ApagarDadosCliente(int id) => _agendamentos.ApagarDadosCliente(BarbeariaId, id);
}
