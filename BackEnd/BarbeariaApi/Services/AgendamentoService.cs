using BarbeariaApi.Data;
using BarbeariaApi.Dtos;
using BarbeariaApi.Models;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Services;

// Regras de horários e agendamentos, usadas pela área do cliente e pelo painel do admin.
public class AgendamentoService
{
    public const int MinutosBloco = 30;   // tamanho de cada bloco da agenda

    private readonly AppDbContext _db;
    private readonly EmailService _email;

    public AgendamentoService(AppDbContext db, EmailService email)
    {
        _db = db;
        _email = email;
    }

    // =====================================================================
    // Horários livres
    // =====================================================================

    // Profissionais do serviço e seus horários no dia.
    // "remarcando": código cujos blocos contam como livres.
    public async Task<List<ProfissionalHorariosDto>> HorariosDoDia(int barbeariaId, int servicoId, DateOnly data,
        string? remarcando = null)
    {
        var barbearia = await _db.Barbearias.Include(b => b.Horarios).FirstOrDefaultAsync(b => b.Id == barbeariaId && b.Ativa)
            ?? throw RegraException.NaoEncontrado("Barbearia");
        var servico = await _db.Servicos.FirstOrDefaultAsync(s => s.Id == servicoId && s.BarbeariaId == barbeariaId && s.Ativo)
            ?? throw RegraException.NaoEncontrado("Serviço");

        // Só funcionários ativos que realizam o serviço escolhido.
        var funcionarios = await _db.Funcionarios
            .Include(f => f.Disponibilidades)
            .Where(f => f.BarbeariaId == barbeariaId && f.Ativo && f.Servicos.Any(fs => fs.ServicoId == servicoId))
            .OrderBy(f => f.Nome)
            .ToListAsync();

        var ids = funcionarios.Select(f => f.Id).ToList();
        var blocos = await _db.AgendamentoBlocos
            .Where(b => ids.Contains(b.FuncionarioId) && b.Data == data)
            .Where(b => remarcando == null || b.Agendamento!.Codigo != remarcando.Trim().ToUpper())
            .Select(b => new { b.FuncionarioId, b.Hora })
            .ToListAsync();
        var agora = Relogio.Agora();

        return funcionarios.Select(f =>
        {
            var ocupados = blocos.Where(b => b.FuncionarioId == f.Id).Select(b => b.Hora).ToHashSet();
            var horarios = CalcularHorarios(barbearia, f, servico, data, ocupados, agora, ignorarPrazos: false);
            return new ProfissionalHorariosDto(f.Id, f.Nome, f.FotoUrl, horarios.Count(h => h.Livre), horarios);
        }).ToList();
    }

    // Horários de início do serviço no dia (livres ou não), já sem os que passaram.
    private static List<HorarioDto> CalcularHorarios(Barbearia barbearia, Funcionario funcionario, Servico servico,
        DateOnly data, HashSet<TimeOnly> ocupados, DateTime agora, bool ignorarPrazos)
    {
        var resultado = new List<HorarioDto>();
        var hoje = DateOnly.FromDateTime(agora);
        if (data < hoje) return resultado;
        if (!ignorarPrazos && data > hoje.AddDays(barbearia.DiasAgendaAberta)) return resultado;

        var expediente = barbearia.Horarios.FirstOrDefault(h => h.DiaSemana == data.DayOfWeek);
        if (expediente == null) return resultado;   // barbearia fechada nesse dia

        int abertura = Minutos(expediente.Abertura), fechamento = Minutos(expediente.Fechamento);

        // Janelas de trabalho do funcionário no dia (sem cadastro = horário todo).
        var janelas = funcionario.Disponibilidades.Count == 0
            ? new List<(int ini, int fim)> { (abertura, fechamento) }
            : funcionario.Disponibilidades
                .Where(d => d.DiaSemana == data.DayOfWeek)
                .Select(d => (ini: Math.Max(Minutos(d.Inicio), abertura), fim: Math.Min(Minutos(d.Fim), fechamento)))
                .ToList();

        var limite = ignorarPrazos ? agora : agora.AddHours(barbearia.AntecedenciaMinimaHoras);
        int duracao = servico.DuracaoMinutos;

        // O serviço precisa terminar até o fechamento.
        for (int inicio = abertura; inicio + duracao <= fechamento; inicio += MinutosBloco)
        {
            if (!janelas.Any(j => inicio >= j.ini && inicio + duracao <= j.fim)) continue;

            var hora = new TimeOnly(inicio / 60, inicio % 60);
            if (data.ToDateTime(hora) < limite) continue;

            // Todos os blocos do serviço precisam estar livres.
            bool livre = Blocos(hora, duracao).All(b => !ocupados.Contains(b));
            resultado.Add(new HorarioDto(hora, livre));
        }
        return resultado;
    }

    private static IEnumerable<TimeOnly> Blocos(TimeOnly inicio, int duracaoMinutos)
    {
        for (int m = 0; m < duracaoMinutos; m += MinutosBloco)
            yield return inicio.AddMinutes(m);
    }

    private static int Minutos(TimeOnly t) => t.Hour * 60 + t.Minute;

    // =====================================================================
    // Área do cliente
    // =====================================================================

    public async Task<AgendamentoDto> Criar(int barbeariaId, CriarAgendamentoDto dto)
    {
        var barbearia = await _db.Barbearias.Include(b => b.Horarios).FirstOrDefaultAsync(b => b.Id == barbeariaId && b.Ativa)
            ?? throw RegraException.NaoEncontrado("Barbearia");
        var servico = await _db.Servicos.FirstOrDefaultAsync(s => s.Id == dto.ServicoId && s.BarbeariaId == barbeariaId && s.Ativo)
            ?? throw RegraException.NaoEncontrado("Serviço");
        var funcionario = await BuscarFuncionarioDoServico(barbeariaId, dto.FuncionarioId, servico.Id);

        await ValidarHorarioLivre(barbearia, funcionario, servico, dto.Data, dto.Hora, null, ignorarPrazos: false);

        var email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        if (email != null && !EmailValido(email))
            throw new RegraException("E-mail inválido. Confira e tente de novo.");

        var agendamento = new Agendamento
        {
            Codigo = await NovoCodigo(),
            BarbeariaId = barbeariaId,
            Barbearia = barbearia,
            FuncionarioId = funcionario.Id,
            Funcionario = funcionario,
            ServicoId = servico.Id,
            Servico = servico,
            ClienteNome = dto.Nome.Trim(),
            ClienteEmail = email,
            Data = dto.Data,
            HoraInicio = dto.Hora,
            HoraFim = dto.Hora.AddMinutes(servico.DuracaoMinutos),
            PrecoCobrado = servico.Preco,   // preço fixado na reserva
        };
        OcuparBlocos(agendamento, servico.DuracaoMinutos);
        PrepararLembretes(agendamento);

        _db.Agendamentos.Add(agendamento);
        await SalvarProtegendoConflito();
        _email.EnviarConfirmacao(agendamento);   // só envia se o cliente informou e-mail
        return AgendamentoDto.De(agendamento);
    }

    public async Task<AgendamentoDto> Consultar(string codigo, string nome) =>
        AgendamentoDto.De(await BuscarPeloCliente(codigo, nome));

    // Cancelar/remarcar só antes do horário.
    public async Task<AgendamentoDto> CancelarPeloCliente(string codigo, string nome)
    {
        var a = await BuscarPeloCliente(codigo, nome);
        GarantirQueAindaNaoPassou(a);
        await Cancelar(a);
        return AgendamentoDto.De(a);
    }

    public async Task<AgendamentoDto> RemarcarPeloCliente(string codigo, RemarcarAgendamentoDto dto)
    {
        var a = await BuscarPeloCliente(codigo, dto.Nome);
        GarantirQueAindaNaoPassou(a);
        await Remarcar(a, dto.FuncionarioId, dto.Data, dto.Hora, ignorarPrazos: false);
        return AgendamentoDto.De(a);
    }

    private async Task<Agendamento> BuscarPeloCliente(string codigo, string nome)
    {
        var a = await ComDetalhes().FirstOrDefaultAsync(x => x.Codigo == codigo.Trim().ToUpper());

        // Mesma mensagem para código ou nome errado.
        if (a == null || !Texto.NomeConfere(a.ClienteNome, nome))
            throw new RegraException("Agendamento não encontrado. Confira o código e o nome.", 404);
        return a;
    }

    private static void GarantirQueAindaNaoPassou(Agendamento a)
    {
        if (a.Data.ToDateTime(a.HoraInicio) <= Relogio.Agora())
            throw new RegraException("Esse horário já passou e não pode mais ser alterado.");
    }

    // =====================================================================
    // Painel do admin (sempre filtrado pela barbearia do admin)
    // =====================================================================

    public async Task<InicioDto> Inicio(int barbeariaId, DateOnly? data)
    {
        var dia = data ?? Relogio.Hoje();
        var lista = await ComDetalhes().Where(a => a.BarbeariaId == barbeariaId && a.Data == dia)
            .OrderBy(a => a.HoraInicio).ToListAsync();

        var agora = Relogio.Agora();
        var validos = lista.Where(a => a.Status != StatusAgendamento.Cancelado).ToList();

        return new InicioDto(
            dia,
            AgendamentosHoje: validos.Count,
            ProximosAtendimentos: validos.Count(a => a.Status == StatusAgendamento.Confirmado
                                                     && a.Data.ToDateTime(a.HoraInicio) >= agora),
            FaturamentoEstimado: validos.Where(a => a.Status != StatusAgendamento.NaoCompareceu).Sum(a => a.PrecoCobrado),
            Cancelamentos: lista.Count - validos.Count,
            Agendamentos: lista.Select(AgendamentoDto.De).ToList());
    }

    public async Task<List<AgendamentoDto>> Listar(int barbeariaId, DateOnly? data, int? funcionarioId)
    {
        var dia = data ?? Relogio.Hoje();
        var consulta = ComDetalhes().Where(a => a.BarbeariaId == barbeariaId && a.Data == dia);
        if (funcionarioId != null) consulta = consulta.Where(a => a.FuncionarioId == funcionarioId);
        var lista = await consulta.OrderBy(a => a.HoraInicio).ToListAsync();
        return lista.Select(AgendamentoDto.De).ToList();
    }

    public async Task<AgendamentoDto> Obter(int barbeariaId, int id) =>
        AgendamentoDto.De(await BuscarDoAdmin(barbeariaId, id));

    // Status possíveis: Confirmado, Concluido, Cancelado, NaoCompareceu.
    public async Task<AgendamentoDto> AlterarStatus(int barbeariaId, int id, StatusAgendamento status)
    {
        var a = await BuscarDoAdmin(barbeariaId, id);
        if (a.Status == StatusAgendamento.Cancelado)
            throw new RegraException("Agendamento cancelado não pode mudar de status. Peça para o cliente agendar de novo.");

        if (status == StatusAgendamento.Cancelado)
        {
            await Cancelar(a);
        }
        else
        {
            a.Status = status;
            await _db.SaveChangesAsync();
        }
        return AgendamentoDto.De(a);
    }

    // O admin ignora antecedência e limite de dias.
    public async Task<AgendamentoDto> RemarcarPeloAdmin(int barbeariaId, int id, RemarcarAdminDto dto)
    {
        var a = await BuscarDoAdmin(barbeariaId, id);
        await Remarcar(a, dto.FuncionarioId, dto.Data, dto.Hora, ignorarPrazos: true);
        return AgendamentoDto.De(a);
    }

    // LGPD: apaga nome e e-mail, mantendo o histórico.
    public async Task<AgendamentoDto> ApagarDadosCliente(int barbeariaId, int id)
    {
        var a = await BuscarDoAdmin(barbeariaId, id);
        a.ClienteNome = "Cliente removido";
        a.ClienteEmail = null;
        await _db.SaveChangesAsync();
        return AgendamentoDto.De(a);
    }

    private async Task<Agendamento> BuscarDoAdmin(int barbeariaId, int id) =>
        await ComDetalhes().FirstOrDefaultAsync(a => a.Id == id && a.BarbeariaId == barbeariaId)
        ?? throw RegraException.NaoEncontrado("Agendamento");

    // =====================================================================
    // Regras comuns
    // =====================================================================

    private async Task Cancelar(Agendamento a)
    {
        if (a.Status != StatusAgendamento.Confirmado)
            throw new RegraException("Este agendamento não está mais confirmado.");

        a.Status = StatusAgendamento.Cancelado;
        await LiberarBlocos(a);   // o horário volta a ficar livre
        await _db.SaveChangesAsync();
        _email.EnviarCancelamento(a);
    }

    private async Task Remarcar(Agendamento a, int funcionarioId, DateOnly data, TimeOnly hora, bool ignorarPrazos)
    {
        if (a.Status != StatusAgendamento.Confirmado)
            throw new RegraException("Só é possível remarcar agendamentos confirmados.");

        var funcionario = await BuscarFuncionarioDoServico(a.BarbeariaId, funcionarioId, a.ServicoId);
        await ValidarHorarioLivre(a.Barbearia!, funcionario, a.Servico!, data, hora, a.Id, ignorarPrazos);

        // Libera os blocos antigos e ocupa os novos numa transação só.
        await using var transacao = await _db.Database.BeginTransactionAsync();
        await LiberarBlocos(a);

        a.FuncionarioId = funcionario.Id;
        a.Funcionario = funcionario;
        a.Data = data;
        a.HoraInicio = hora;
        a.HoraFim = hora.AddMinutes(a.Servico!.DuracaoMinutos);
        OcuparBlocos(a, a.Servico.DuracaoMinutos);
        PrepararLembretes(a);

        await SalvarProtegendoConflito();
        await transacao.CommitAsync();
        _email.EnviarRemarcacao(a);
    }

    // Marca como enviados os lembretes cujo prazo já passou.
    private static void PrepararLembretes(Agendamento a)
    {
        var falta = a.Data.ToDateTime(a.HoraInicio) - Relogio.Agora();
        a.Lembrete24hEnviado = falta <= TimeSpan.FromHours(24);
        a.Lembrete1hEnviado = falta <= TimeSpan.FromHours(1);
    }

    // Exige um único endereço válido (o [EmailAddress] só confere o "@").
    private static bool EmailValido(string email) =>
        MailAddress.TryCreate(email, out var endereco) && endereco.Address == email && endereco.Host.Contains('.');

    private async Task<Funcionario> BuscarFuncionarioDoServico(int barbeariaId, int funcionarioId, int servicoId) =>
        await _db.Funcionarios
            .Include(f => f.Disponibilidades)
            .FirstOrDefaultAsync(f => f.Id == funcionarioId && f.BarbeariaId == barbeariaId && f.Ativo
                                      && f.Servicos.Any(fs => fs.ServicoId == servicoId))
        ?? throw new RegraException("Esse profissional não está disponível para o serviço escolhido.", 404);

    private async Task ValidarHorarioLivre(Barbearia barbearia, Funcionario funcionario, Servico servico,
        DateOnly data, TimeOnly hora, int? ignorarAgendamentoId, bool ignorarPrazos)
    {
        var ocupados = (await _db.AgendamentoBlocos
                .Where(b => b.FuncionarioId == funcionario.Id && b.Data == data && b.AgendamentoId != ignorarAgendamentoId)
                .Select(b => b.Hora)
                .ToListAsync())
            .ToHashSet();

        var escolhido = CalcularHorarios(barbearia, funcionario, servico, data, ocupados, Relogio.Agora(), ignorarPrazos)
            .FirstOrDefault(h => h.Hora == hora);
        if (escolhido == null)
            throw new RegraException("Esse horário não está disponível para agendamento.");
        if (!escolhido.Livre)
            throw new RegraException("Esse horário acabou de ser ocupado. Escolha outro horário.", 409);
    }

    private Task LiberarBlocos(Agendamento a) =>
        _db.AgendamentoBlocos.Where(b => b.AgendamentoId == a.Id).ExecuteDeleteAsync();

    private static void OcuparBlocos(Agendamento a, int duracao) =>
        a.Blocos = Blocos(a.HoraInicio, duracao)
            .Select(h => new AgendamentoBloco { FuncionarioId = a.FuncionarioId, Data = a.Data, Hora = h })
            .ToList();

    // O índice único recusa a gravação se outro cliente pegou o bloco antes.
    private async Task SalvarProtegendoConflito()
    {
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _db.ChangeTracker.Clear();
            throw new RegraException("Esse horário acabou de ser ocupado por outra pessoa. Escolha outro horário.", 409);
        }
    }

    private async Task<string> NovoCodigo()
    {
        while (true)
        {
            var codigo = Texto.GerarCodigo();
            if (!await _db.Agendamentos.AnyAsync(a => a.Codigo == codigo)) return codigo;
        }
    }

    private IQueryable<Agendamento> ComDetalhes() =>
        _db.Agendamentos.Include(a => a.Barbearia).ThenInclude(b => b!.Horarios)
            .Include(a => a.Servico).Include(a => a.Funcionario);
}
