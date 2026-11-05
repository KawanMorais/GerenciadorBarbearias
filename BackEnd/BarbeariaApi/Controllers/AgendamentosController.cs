using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BarbeariaApi.Controllers;

// Consultar, cancelar ou remarcar um agendamento com código + nome.
// POST para o nome não ir na URL.
[ApiController]
[Route("api/agendamentos")]
[EnableRateLimiting(LimiteTentativas.Politica)]   // impede ficar chutando códigos
public class AgendamentosController : ControllerBase
{
    private readonly AgendamentoService _agendamentos;

    public AgendamentosController(AgendamentoService agendamentos) => _agendamentos = agendamentos;

    [HttpPost("consultar")]
    public Task<AgendamentoDto> Consultar(ConsultaAgendamentoDto dto) => _agendamentos.Consultar(dto.Codigo, dto.Nome);

    [HttpPost("{codigo}/cancelar")]
    public Task<AgendamentoDto> Cancelar(string codigo, CancelarAgendamentoDto dto) =>
        _agendamentos.CancelarPeloCliente(codigo, dto.Nome);

    [HttpPost("{codigo}/remarcar")]
    public Task<AgendamentoDto> Remarcar(string codigo, RemarcarAgendamentoDto dto) =>
        _agendamentos.RemarcarPeloCliente(codigo, dto);
}
