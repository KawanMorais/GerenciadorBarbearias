import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { api, ErroApi, textoDoErro, type Agendamento, type BarbeariaDetalhe, type ServicoPublico } from "../../api";
import { dinheiro, duracao } from "../../formatos";
import { lembrar } from "../../lembrados";
import { EscolherHorario, type Escolha } from "../../componentes/EscolherHorario";
import { Logo } from "../../componentes/Logo";
import { Carregando, Erro } from "../../componentes/Mensagem";
import { Resumo } from "../../componentes/Resumo";

type Etapa = "servico" | "horario" | "confirmar" | "pronto";
const ETAPAS = [
  { etapa: "servico", nome: "Serviço" },
  { etapa: "horario", nome: "Profissional e horário" },
  { etapa: "confirmar", nome: "Confirmação" },
] as const;

// O fluxo do agendamento numa página só, uma etapa de cada vez.
export function Agendar() {
  const id = Number(useParams().id);
  const [parametros] = useSearchParams();
  const [barbearia, setBarbearia] = useState<BarbeariaDetalhe | null>(null);
  const [erro, setErro] = useState("");

  const [etapa, setEtapa] = useState<Etapa>("servico");
  const [servico, setServico] = useState<ServicoPublico | null>(null);
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [feito, setFeito] = useState<{ agendamento: Agendamento; lembrado: boolean } | null>(null);

  useEffect(() => {
    api.barbearia(id)
      .then((b) => {
        setBarbearia(b);
        // Serviço já escolhido na página da barbearia.
        const s = b.servicos.find((x) => x.id === Number(parametros.get("servico")));
        if (s) {
          setServico(s);
          setEtapa("horario");
        }
      })
      .catch((e) => setErro(textoDoErro(e)));
  }, [id, parametros]);

  // Cada etapa começa do topo da página.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [etapa]);

  if (!barbearia) return erro ? <Erro texto={erro} /> : <Carregando />;

  function escolherServico(s: ServicoPublico) {
    setServico(s);
    setErro("");
    setEtapa("horario");
  }

  function escolherHorario(e: Escolha) {
    setEscolha(e);
    setErro("");
    setEtapa("confirmar");
  }

  // Horário ocupado por outra pessoa: volta para a escolha.
  function horarioOcupado(mensagem: string) {
    setErro(mensagem);
    setEscolha(null);
    setEtapa("horario");
  }

  return (
    <section className="agendar">
      <header className="agendar-topo">
        <Logo nome={barbearia.nome} url={barbearia.logoUrl} />
        <div>
          <p className="suave pequeno">Agendando em</p>
          <h1>{barbearia.nome}</h1>
        </div>
        <Link to={`/barbearias/${barbearia.id}`} className="botao botao-claro botao-pequeno">Voltar</Link>
      </header>

      {etapa !== "pronto" && (
        <ol className="etapas">
          {ETAPAS.map((e, i) => (
            <li key={e.etapa} aria-current={e.etapa === etapa ? "step" : undefined}>
              <span className="etapa-numero">{i + 1}</span> {e.nome}
            </li>
          ))}
        </ol>
      )}

      <Erro texto={erro} />

      {etapa === "servico" && (
        <>
          <h2>Qual serviço você quer?</h2>
          <ul className="opcoes-servico">
            {barbearia.servicos.map((s) => (
              <li key={s.id}>
                <button type="button" className="cartao opcao-servico" onClick={() => escolherServico(s)}>
                  <span className="opcao-servico-nome">{s.nome}</span>
                  {s.descricao && <span className="suave">{s.descricao}</span>}
                  <span className="opcao-servico-rodape">
                    <span>{duracao(s.duracaoMinutos)}</span>
                    <strong>{dinheiro(s.preco)}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {etapa === "horario" && servico && (
        <>
          <div className="servico-escolhido">
            <p><strong>{servico.nome}</strong> · {duracao(servico.duracaoMinutos)} · {dinheiro(servico.preco)}</p>
            <button type="button" className="link" onClick={() => setEtapa("servico")}>Trocar serviço</button>
          </div>
          <EscolherHorario barbeariaId={barbearia.id} servicoId={servico.id} aoEscolher={escolherHorario} />
        </>
      )}

      {etapa === "confirmar" && servico && escolha && (
        <Confirmar
          barbearia={barbearia}
          servico={servico}
          escolha={escolha}
          aoVoltar={() => setEtapa("horario")}
          aoOcupado={horarioOcupado}
          aoConfirmar={(agendamento, lembrado) => {
            setFeito({ agendamento, lembrado });
            setEtapa("pronto");
          }}
        />
      )}

      {etapa === "pronto" && feito && <Comprovante {...feito} />}
    </section>
  );
}

interface PropsConfirmar {
  barbearia: BarbeariaDetalhe;
  servico: ServicoPublico;
  escolha: Escolha;
  aoVoltar: () => void;
  aoOcupado: (mensagem: string) => void;
  aoConfirmar: (a: Agendamento, lembrado: boolean) => void;
}

// Confirmação: resumo + nome (obrigatório) + e-mail (opcional).
function Confirmar({ barbearia, servico, escolha, aoVoltar, aoOcupado, aoConfirmar }: PropsConfirmar) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [aceite, setAceite] = useState(false);
  const [lembrarAqui, setLembrarAqui] = useState(false);   // desmarcado por padrão
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const a = await api.agendar(barbearia.id, {
        servicoId: servico.id,
        funcionarioId: escolha.profissional.id,
        data: escolha.data,
        hora: escolha.hora,
        nome: nome.trim(),
        email: email.trim() || null,
        aceiteDados: aceite,
      });
      if (lembrarAqui) lembrar(a, nome.trim());
      aoConfirmar(a, lembrarAqui);
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 409) aoOcupado(falha.message);
      else setErro(textoDoErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="confirmar">
      <section>
        <h2>Confira seu horário</h2>
        <Resumo
          barbearia={barbearia.nome}
          servico={servico.nome}
          duracaoMinutos={servico.duracaoMinutos}
          preco={servico.preco}
          profissional={escolha.profissional.nome}
          fotoProfissional={escolha.profissional.fotoUrl}
          data={escolha.data}
          hora={escolha.hora}
        />
        <button type="button" className="link" onClick={aoVoltar}>Trocar profissional ou horário</button>
      </section>

      <form className="cartao formulario" onSubmit={confirmar}>
        <h2>Seus dados</h2>

        <label htmlFor="nome">Nome <span className="obrigatorio" aria-hidden="true">*</span></label>
        <input id="nome" required minLength={2} maxLength={120} autoComplete="name"
          value={nome} onChange={(e) => setNome(e.target.value)} />

        <label htmlFor="email">E-mail (opcional)</label>
        <input id="email" type="email" maxLength={160} autoComplete="email" aria-describedby="dica-email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <p id="dica-email" className="dica">
          Preencha só se quiser receber a confirmação e os lembretes do horário por e-mail.
          Se deixar em branco, é só anotar o código.
        </p>

        <label className="marcar">
          <input type="checkbox" required checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            Autorizo o uso do meu nome{email.trim() && " e e-mail"} só para este agendamento.
            A barbearia pode apagar esses dados quando eu pedir.
          </span>
        </label>

        <label className="marcar">
          <input type="checkbox" checked={lembrarAqui} onChange={(e) => setLembrarAqui(e.target.checked)} />
          <span>Lembrar este agendamento neste navegador</span>
        </label>

        <p className="dica"><span aria-hidden="true">*</span> Campo obrigatório</p>
        <Erro texto={erro} />
        <button type="submit" className="botao botao-destaque botao-largo" disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar agendamento"}
        </button>
      </form>
    </div>
  );
}

// Comprovante com o código.
function Comprovante({ agendamento: a, lembrado }: { agendamento: Agendamento; lembrado: boolean }) {
  return (
    <div className="comprovante cartao">
      <p className="comprovante-selo">Agendamento confirmado</p>
      <p className="suave">Seu código</p>
      <p className="codigo">{a.codigo}</p>
      <p>
        {lembrado
          ? "Este navegador vai lembrar seu agendamento."
          : "Anote o código. Com ele e seu nome você consulta, remarca ou cancela depois."}
        {a.clienteEmail && " Também mandamos a confirmação para o seu e-mail."}
      </p>

      <Resumo
        barbearia={a.barbeariaNome}
        servico={a.servicoNome}
        duracaoMinutos={a.duracaoMinutos}
        preco={a.preco}
        profissional={a.funcionarioNome}
        fotoProfissional={a.funcionarioFotoUrl}
        data={a.data}
        hora={a.horaInicio}
      />

      <div className="botoes">
        <Link to="/" className="botao">Voltar ao início</Link>
      </div>
    </div>
  );
}
