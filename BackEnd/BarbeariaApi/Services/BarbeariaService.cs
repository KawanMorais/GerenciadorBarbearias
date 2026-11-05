using BarbeariaApi.Data;
using BarbeariaApi.Dtos;
using BarbeariaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Services;

// Regras da barbearia: busca e página pública, dados e horários no painel.
public class BarbeariaService
{
    private readonly AppDbContext _db;
    private readonly UploadService _uploads;

    public BarbeariaService(AppDbContext db, UploadService uploads)
    {
        _db = db;
        _uploads = uploads;
    }

    // ---------- Área pública ----------

    public const int PorPagina = 12;

    // Só barbearias ativas com serviço e funcionário ativos, 12 por página.
    public async Task<PaginaDto<BarbeariaResumoDto>> Buscar(string? busca, int pagina)
    {
        pagina = Math.Clamp(pagina, 1, 1000);
        var consulta = _db.Barbearias
            .Where(b => b.Ativa && b.Servicos.Any(s => s.Ativo) && b.Funcionarios.Any(f => f.Ativo));

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = busca.Trim();
            consulta = consulta.Where(b => b.Nome.Contains(termo)
                                           || (b.Bairro != null && b.Bairro.Contains(termo))
                                           || (b.Cidade != null && b.Cidade.Contains(termo))
                                           || (b.Endereco != null && b.Endereco.Contains(termo)));
        }

        // Um item a mais indica se existe próxima página.
        var barbearias = await consulta.Include(b => b.Horarios).OrderBy(b => b.Nome).ThenBy(b => b.Id)
            .Skip((pagina - 1) * PorPagina).Take(PorPagina + 1).AsSplitQuery().ToListAsync();
        var itens = barbearias.Take(PorPagina).Select(b => new BarbeariaResumoDto(b.Id, b.Nome, b.LogoUrl,
            b.Endereco, b.Bairro, b.Cidade, ParaDto(b.Horarios))).ToList();
        return new PaginaDto<BarbeariaResumoDto>(itens, pagina, barbearias.Count > PorPagina);
    }

    public async Task<BarbeariaDetalheDto> Detalhe(int id)
    {
        var b = await _db.Barbearias
            .Include(x => x.Horarios)
            .Include(x => x.Servicos.Where(s => s.Ativo))
            .Include(x => x.Funcionarios.Where(f => f.Ativo)).ThenInclude(f => f.Servicos)
            .FirstOrDefaultAsync(x => x.Id == id && x.Ativa)
            ?? throw RegraException.NaoEncontrado("Barbearia");

        return new BarbeariaDetalheDto(b.Id, b.Nome, b.Descricao, b.LogoUrl, b.CapaUrl,
            b.Endereco, b.Bairro, b.Cidade, b.Telefone, b.AntecedenciaMinimaHoras, b.DiasAgendaAberta,
            ParaDto(b.Horarios),
            b.Servicos.OrderBy(s => s.Nome)
                .Select(s => new ServicoPublicoDto(s.Id, s.Nome, s.Descricao, s.Preco, s.DuracaoMinutos)).ToList(),
            b.Funcionarios.OrderBy(f => f.Nome)
                .Select(f => new FuncionarioPublicoDto(f.Id, f.Nome, f.FotoUrl, f.Servicos.Select(fs => fs.ServicoId).ToList()))
                .ToList());
    }

    // Próximos dias da agenda, com Aberto = false nos fechados.
    public async Task<List<DiaDto>> Dias(int id)
    {
        var b = await _db.Barbearias.Include(x => x.Horarios).FirstOrDefaultAsync(x => x.Id == id && x.Ativa)
            ?? throw RegraException.NaoEncontrado("Barbearia");

        var hoje = Relogio.Hoje();
        var diasAbertos = b.Horarios.Select(h => h.DiaSemana).ToHashSet();
        return Enumerable.Range(0, b.DiasAgendaAberta + 1)
            .Select(i => hoje.AddDays(i))
            .Select(d => new DiaDto(d, diasAbertos.Contains(d.DayOfWeek)))
            .ToList();
    }

    // ---------- Painel do admin ----------

    // Pendencias = o que falta para aparecer na busca.
    public async Task<MinhaBarbeariaDto> ObterMinha(int barbeariaId)
    {
        var b = await _db.Barbearias.FirstAsync(x => x.Id == barbeariaId);

        var pendencias = new List<string>();
        if (!await _db.HorariosFuncionamento.AnyAsync(h => h.BarbeariaId == barbeariaId))
            pendencias.Add("Cadastre o horário de funcionamento.");
        if (!await _db.Servicos.AnyAsync(s => s.BarbeariaId == barbeariaId && s.Ativo))
            pendencias.Add("Cadastre pelo menos um serviço ativo.");
        if (!await _db.Funcionarios.AnyAsync(f => f.BarbeariaId == barbeariaId && f.Ativo))
            pendencias.Add("Cadastre pelo menos um funcionário ativo.");
        if (!b.Ativa)
            pendencias.Add("A barbearia está desativada na busca.");

        return new MinhaBarbeariaDto(b.Id, b.Nome, b.Documento, b.Descricao, b.Endereco, b.Bairro, b.Cidade,
            b.Telefone, b.LogoUrl, b.CapaUrl, b.Ativa, b.AntecedenciaMinimaHoras, b.DiasAgendaAberta,
            pendencias.Count == 0, pendencias);
    }

    public async Task<MinhaBarbeariaDto> Atualizar(int barbeariaId, AtualizarBarbeariaDto dto)
    {
        var b = await _db.Barbearias.FirstAsync(x => x.Id == barbeariaId);
        b.Nome = dto.Nome.Trim();
        b.Documento = dto.Documento;
        b.Descricao = dto.Descricao;
        b.Endereco = dto.Endereco;
        b.Bairro = dto.Bairro;
        b.Cidade = dto.Cidade;
        b.Telefone = dto.Telefone;
        b.Ativa = dto.Ativa;
        await _db.SaveChangesAsync();
        return await ObterMinha(barbeariaId);
    }

    public async Task<string> TrocarLogo(int barbeariaId, IFormFile arquivo)
    {
        var b = await _db.Barbearias.FirstAsync(x => x.Id == barbeariaId);
        var url = await _uploads.SalvarImagem(arquivo);
        _uploads.Apagar(b.LogoUrl);
        b.LogoUrl = url;
        await _db.SaveChangesAsync();
        return url;
    }

    public async Task<string> TrocarCapa(int barbeariaId, IFormFile arquivo)
    {
        var b = await _db.Barbearias.FirstAsync(x => x.Id == barbeariaId);
        var url = await _uploads.SalvarImagem(arquivo);
        _uploads.Apagar(b.CapaUrl);
        b.CapaUrl = url;
        await _db.SaveChangesAsync();
        return url;
    }

    public async Task<HorariosDto> ObterHorarios(int barbeariaId)
    {
        var b = await _db.Barbearias.Include(x => x.Horarios).FirstAsync(x => x.Id == barbeariaId);
        return new HorariosDto
        {
            Dias = ParaDto(b.Horarios),
            AntecedenciaMinimaHoras = b.AntecedenciaMinimaHoras,
            DiasAgendaAberta = b.DiasAgendaAberta,
        };
    }

    // Substitui todos os horários pelos enviados. Dia que não vier = fechado.
    public async Task<HorariosDto> SalvarHorarios(int barbeariaId, HorariosDto dto)
    {
        if (dto.Dias.GroupBy(d => d.DiaSemana).Any(g => g.Count() > 1))
            throw new RegraException("Cada dia da semana só pode aparecer uma vez.");
        foreach (var dia in dto.Dias)
            ValidarFaixa(dia.Abertura, dia.Fechamento);

        var b = await _db.Barbearias.Include(x => x.Horarios).FirstAsync(x => x.Id == barbeariaId);
        _db.HorariosFuncionamento.RemoveRange(b.Horarios);
        b.Horarios = dto.Dias.Select(d => new HorarioFuncionamento
        {
            DiaSemana = d.DiaSemana, Abertura = d.Abertura, Fechamento = d.Fechamento,
        }).ToList();
        b.AntecedenciaMinimaHoras = dto.AntecedenciaMinimaHoras;
        b.DiasAgendaAberta = dto.DiasAgendaAberta;
        await _db.SaveChangesAsync();
        return await ObterHorarios(barbeariaId);
    }

    // Faixas em horas cheias ou meias horas.
    public static void ValidarFaixa(TimeOnly inicio, TimeOnly fim)
    {
        if (inicio >= fim)
            throw new RegraException($"O horário de início ({inicio:HH\\:mm}) precisa ser antes do fim ({fim:HH\\:mm}).");
        if (inicio.Minute % 30 != 0 || fim.Minute % 30 != 0)
            throw new RegraException("Use horários cheios ou de meia hora (ex.: 18:00, 18:30).");
    }

    private static List<HorarioFuncionamentoDto> ParaDto(IEnumerable<HorarioFuncionamento> horarios) =>
        horarios.OrderBy(h => ((int)h.DiaSemana + 6) % 7)   // segunda primeiro
            .Select(h => new HorarioFuncionamentoDto(h.DiaSemana, h.Abertura, h.Fechamento)).ToList();
}
