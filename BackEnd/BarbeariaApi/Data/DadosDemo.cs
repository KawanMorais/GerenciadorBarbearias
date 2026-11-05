using BarbeariaApi.Models;
using BarbeariaApi.Services;
using Microsoft.EntityFrameworkCore;

namespace BarbeariaApi.Data;

// Barbearia de exemplo para testes ("CriarDadosDemo": true). Criada se a conta demo não existir.
// Login: demo@barbearia.com / demo1234
public static class DadosDemo
{
    public const string Email = "demo@barbearia.com";

    public static async Task CriarSeNaoExistir(AppDbContext db)
    {
        if (await db.Administradores.AnyAsync(a => a.Email == Email)) return;

        var barbearia = new Barbearia
        {
            Nome = "Gêmeos Barbearia",
            Descricao = "Barbearia de bairro com atendimento no fim do dia. Corte, barba e sobrancelha.",
            Endereco = "Rua Exemplo, 100",
            Bairro = "Miguel Badra",
            Cidade = "Suzano",
            Telefone = "(11) 90000-0000",
            AntecedenciaMinimaHoras = 1,
            DiasAgendaAberta = 30,
        };

        // Segunda a sábado, das 18h às 21h.
        foreach (var dia in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                                    DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday })
        {
            barbearia.Horarios.Add(new HorarioFuncionamento
            {
                DiaSemana = dia, Abertura = new TimeOnly(18, 0), Fechamento = new TimeOnly(21, 0),
            });
        }

        var completo = new Servico { Nome = "Corte completo (cabelo + barba)", Preco = 60, DuracaoMinutos = 60 };
        var corte = new Servico { Nome = "Corte de cabelo", Preco = 35, DuracaoMinutos = 30 };
        var barba = new Servico { Nome = "Barba", Preco = 30, DuracaoMinutos = 30 };
        var sobrancelha = new Servico { Nome = "Sobrancelha", Preco = 15, DuracaoMinutos = 30 };
        var pintura = new Servico { Nome = "Pintura / coloração", Preco = 70, DuracaoMinutos = 60 };
        barbearia.Servicos.AddRange(new[] { completo, corte, barba, sobrancelha, pintura });

        barbearia.Funcionarios.Add(ComServicos(new Funcionario { Nome = "Lucas" }, completo, corte, barba, sobrancelha));
        barbearia.Funcionarios.Add(ComServicos(new Funcionario { Nome = "Mateus" }, completo, corte, barba, pintura));
        barbearia.Funcionarios.Add(ComServicos(new Funcionario { Nome = "Rafael" }, corte, sobrancelha));

        barbearia.Administradores.Add(new Administrador
        {
            Nome = "Administrador Demo",
            Email = Email,
            SenhaHash = Senha.Hash("demo1234"),
        });

        db.Barbearias.Add(barbearia);
        await db.SaveChangesAsync();
    }

    private static Funcionario ComServicos(Funcionario f, params Servico[] servicos)
    {
        f.Servicos = servicos.Select(s => new FuncionarioServico { Servico = s }).ToList();
        return f;
    }
}

