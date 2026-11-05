using System.ComponentModel.DataAnnotations;
using BarbeariaApi.Dtos;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BarbeariaApi.Controllers;

// Área pública: busca, página da barbearia, horários e agendamento.
[ApiController]
[Route("api/barbearias")]
public class BarbeariasController : ControllerBase
{
    private readonly BarbeariaService _barbearias;
    private readonly AgendamentoService _agendamentos;

    public BarbeariasController(BarbeariaService barbearias, AgendamentoService agendamentos)
    {
        _barbearias = barbearias;
        _agendamentos = agendamentos;
    }

    // GET /api/barbearias?busca=suzano&pagina=1
    [HttpGet]
    public Task<PaginaDto<BarbeariaResumoDto>> Buscar([FromQuery][StringLength(100)] string? busca,
        [FromQuery] int pagina = 1) => _barbearias.Buscar(busca, pagina);

    // Página da barbearia
    [HttpGet("{id:int}")]
    public Task<BarbeariaDetalheDto> Detalhe(int id) => _barbearias.Detalhe(id);

    // Faixa com os próximos dias
    [HttpGet("{id:int}/dias")]
    public Task<List<DiaDto>> Dias(int id) => _barbearias.Dias(id);

    // GET /api/barbearias/1/horarios?servicoId=2&data=2026-11-03
    // &remarcando=CODIGO faz o horário atual do agendamento aparecer livre.
    [HttpGet("{id:int}/horarios")]
    public Task<List<ProfissionalHorariosDto>> Horarios(int id, [FromQuery] int servicoId, [FromQuery] DateOnly data,
        [FromQuery] string? remarcando) => _agendamentos.HorariosDoDia(id, servicoId, data, remarcando);

    // Confirma o agendamento e devolve o código. Limitado para evitar spam.
    [HttpPost("{id:int}/agendamentos")]
    [EnableRateLimiting(LimiteTentativas.Politica)]
    public async Task<ActionResult<AgendamentoDto>> Agendar(int id, CriarAgendamentoDto dto)
    {
        var agendamento = await _agendamentos.Criar(id, dto);
        return StatusCode(StatusCodes.Status201Created, agendamento);
    }
}
