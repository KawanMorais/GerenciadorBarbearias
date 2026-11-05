using BarbeariaApi.Data;
using BarbeariaApi.Dtos;
using BarbeariaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Services;

// Regras dos serviços da barbearia. Sempre filtra pela barbearia do admin.
public class ServicoService
{
    private readonly AppDbContext _db;

    public ServicoService(AppDbContext db) => _db = db;

    public Task<List<ServicoAdminDto>> Listar(int barbeariaId) =>
        _db.Servicos.Where(s => s.BarbeariaId == barbeariaId).OrderBy(s => s.Nome)
            .Select(s => new ServicoAdminDto(s.Id, s.Nome, s.Descricao, s.Preco, s.DuracaoMinutos, s.Ativo))
            .ToListAsync();

    public async Task<ServicoAdminDto> Criar(int barbeariaId, SalvarServicoDto dto)
    {
        var s = new Servico { BarbeariaId = barbeariaId };
        Preencher(s, dto);
        _db.Servicos.Add(s);
        await _db.SaveChangesAsync();
        return ParaDto(s);
    }

    // Agendamentos já feitos mantêm o preço antigo.
    public async Task<ServicoAdminDto> Atualizar(int barbeariaId, int id, SalvarServicoDto dto)
    {
        var s = await Buscar(barbeariaId, id);
        Preencher(s, dto);
        await _db.SaveChangesAsync();
        return ParaDto(s);
    }

    public async Task<ServicoAdminDto> AlterarAtivo(int barbeariaId, int id, bool ativo)
    {
        var s = await Buscar(barbeariaId, id);
        s.Ativo = ativo;
        await _db.SaveChangesAsync();
        return ParaDto(s);
    }

    // Com agendamentos, só pode ser desativado.
    public async Task Excluir(int barbeariaId, int id)
    {
        var s = await Buscar(barbeariaId, id);
        if (await _db.Agendamentos.AnyAsync(a => a.ServicoId == id))
            throw new RegraException("Este serviço já tem agendamentos. Desative-o em vez de excluir.", 409);

        await _db.FuncionarioServicos.Where(fs => fs.ServicoId == id).ExecuteDeleteAsync();
        _db.Servicos.Remove(s);
        await _db.SaveChangesAsync();
    }

    private async Task<Servico> Buscar(int barbeariaId, int id) =>
        await _db.Servicos.FirstOrDefaultAsync(x => x.Id == id && x.BarbeariaId == barbeariaId)
        ?? throw RegraException.NaoEncontrado("Serviço");

    private static void Preencher(Servico s, SalvarServicoDto dto)
    {
        if (dto.DuracaoMinutos % AgendamentoService.MinutosBloco != 0)
            throw new RegraException("A duração precisa ser múltipla de 30 minutos (30, 60, 90...).");

        s.Nome = dto.Nome.Trim();
        s.Descricao = dto.Descricao;
        s.Preco = dto.Preco;
        s.DuracaoMinutos = dto.DuracaoMinutos;
        s.Ativo = dto.Ativo;
    }

    private static ServicoAdminDto ParaDto(Servico s) =>
        new(s.Id, s.Nome, s.Descricao, s.Preco, s.DuracaoMinutos, s.Ativo);
}
