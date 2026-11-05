using BarbeariaApi.Data;
using BarbeariaApi.Dtos;
using BarbeariaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Services;

// Regras dos funcionários. Sempre filtra pela barbearia do admin.
public class FuncionarioService
{
    private readonly AppDbContext _db;
    private readonly UploadService _uploads;

    public FuncionarioService(AppDbContext db, UploadService uploads)
    {
        _db = db;
        _uploads = uploads;
    }

    public async Task<List<FuncionarioAdminDto>> Listar(int barbeariaId)
    {
        var lista = await Consulta(barbeariaId).OrderBy(f => f.Nome).ToListAsync();
        return lista.Select(ParaDto).ToList();
    }

    public async Task<FuncionarioAdminDto> Obter(int barbeariaId, int id) => ParaDto(await Buscar(barbeariaId, id));

    public async Task<FuncionarioAdminDto> Criar(int barbeariaId, SalvarFuncionarioDto dto)
    {
        var f = new Funcionario { BarbeariaId = barbeariaId };
        await Preencher(f, dto);
        _db.Funcionarios.Add(f);
        await _db.SaveChangesAsync();
        return ParaDto(f);
    }

    public async Task<FuncionarioAdminDto> Atualizar(int barbeariaId, int id, SalvarFuncionarioDto dto)
    {
        var f = await Buscar(barbeariaId, id);
        _db.FuncionarioServicos.RemoveRange(f.Servicos);
        _db.Disponibilidades.RemoveRange(f.Disponibilidades);
        await Preencher(f, dto);
        await _db.SaveChangesAsync();
        return ParaDto(f);
    }

    public async Task<FuncionarioAdminDto> AlterarAtivo(int barbeariaId, int id, bool ativo)
    {
        var f = await Buscar(barbeariaId, id);
        f.Ativo = ativo;
        await _db.SaveChangesAsync();
        return ParaDto(f);
    }

    // Foto inteira; o recorte redondo é feito no CSS.
    public async Task<string> TrocarFoto(int barbeariaId, int id, IFormFile arquivo)
    {
        var f = await Buscar(barbeariaId, id);
        var url = await _uploads.SalvarImagem(arquivo);
        _uploads.Apagar(f.FotoUrl);
        f.FotoUrl = url;
        await _db.SaveChangesAsync();
        return url;
    }

    // Com agendamentos, só pode ser desativado.
    public async Task Excluir(int barbeariaId, int id)
    {
        var f = await Buscar(barbeariaId, id);
        if (await _db.Agendamentos.AnyAsync(a => a.FuncionarioId == id))
            throw new RegraException("Este funcionário já tem agendamentos. Desative-o em vez de excluir.", 409);

        _uploads.Apagar(f.FotoUrl);
        _db.Funcionarios.Remove(f);
        await _db.SaveChangesAsync();
    }

    private IQueryable<Funcionario> Consulta(int barbeariaId) => _db.Funcionarios
        .Include(f => f.Servicos)
        .Include(f => f.Disponibilidades)
        .Where(f => f.BarbeariaId == barbeariaId);

    private async Task<Funcionario> Buscar(int barbeariaId, int id) =>
        await Consulta(barbeariaId).FirstOrDefaultAsync(x => x.Id == id)
        ?? throw RegraException.NaoEncontrado("Funcionário");

    private async Task Preencher(Funcionario f, SalvarFuncionarioDto dto)
    {
        // Só aceita serviços da própria barbearia.
        var servicoIds = dto.ServicoIds.Distinct().ToList();
        var validos = await _db.Servicos.CountAsync(s => servicoIds.Contains(s.Id) && s.BarbeariaId == f.BarbeariaId);
        if (validos != servicoIds.Count)
            throw new RegraException("Algum dos serviços escolhidos não existe nesta barbearia.");

        foreach (var d in dto.Disponibilidades)
            BarbeariaService.ValidarFaixa(d.Inicio, d.Fim);

        f.Nome = dto.Nome.Trim();
        f.Telefone = dto.Telefone;
        f.Especialidades = dto.Especialidades;
        f.Ativo = dto.Ativo;
        f.Servicos = servicoIds.Select(id => new FuncionarioServico { ServicoId = id }).ToList();
        f.Disponibilidades = dto.Disponibilidades
            .Select(d => new DisponibilidadeFuncionario { DiaSemana = d.DiaSemana, Inicio = d.Inicio, Fim = d.Fim })
            .ToList();
    }

    private static FuncionarioAdminDto ParaDto(Funcionario f) => new(
        f.Id, f.Nome, f.FotoUrl, f.Telefone, f.Especialidades, f.Ativo,
        f.Servicos.Select(s => s.ServicoId).OrderBy(x => x).ToList(),
        f.Disponibilidades.OrderBy(d => ((int)d.DiaSemana + 6) % 7).ThenBy(d => d.Inicio)
            .Select(d => new DisponibilidadeDto(d.DiaSemana, d.Inicio, d.Fim)).ToList());
}
