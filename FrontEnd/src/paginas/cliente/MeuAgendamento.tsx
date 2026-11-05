import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, textoDoErro, type Agendamento } from "../../api";
import { dataLonga, STATUS } from "../../formatos";
import { atualizarLembrado, esquecer, estaLembrado, lembrar, listarLembrados } from "../../lembrados";
import { EscolherHorario, type Escolha } from "../../componentes/EscolherHorario";
import { Erro, Sucesso } from "../../componentes/Mensagem";
import { Resumo } from "../../componentes/Resumo";

type Modo = "ver" | "cancelar" | "remarcar";

// Consultar, cancelar ou remarcar com código + nome.
export function MeuAgendamento() {
  const [lembrados, setLembrados] = useState(listarLembrados);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [nomeUsado, setNomeUsado] = useState("");
  const [modo, setModo] = useState<Modo>("ver");
  const [novo, setNovo] = useState<Escolha | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const detalhe = useRef<HTMLElement>(null);

  // Rola até o agendamento encontrado.
  useEffect(() => {
    detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [agendamento?.codigo]);

  async function consultar(cod: string, nomeCliente: string) {
    setErro("");
    setSucesso("");
    setBuscando(true);
    try {
      const a = await api.consultar(cod.trim(), nomeCliente.trim());
      setAgendamento(a);
      setNomeUsado(nomeCliente.trim());
      setModo("ver");
      atualizarLembrado(a);
      setLembrados(listarLembrados());
    } catch (e) {
      setAgendamento(null);
      setErro(textoDoErro(e));
    } finally {
      setBuscando(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    consultar(codigo, nome);
  }

  // Executa a ação e atualiza a tela e a lista lembrada.
  async function executar(acao: () => Promise<Agendamento>, mensagem: string) {
    setErro("");
    setSalvando(true);
    try {
      const a = await acao();
      setAgendamento(a);
      atualizarLembrado(a);
      setLembrados(listarLembrados());
      setModo("ver");
      setNovo(null);
      setSucesso(mensagem);
    } catch (e) {
      setErro(textoDoErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const a = agendamento;
  const podeMexer = a !== null && a.status === "Confirmado" && new Date(`${a.data}T${a.horaInicio}`) > new Date();

  return (
    <section className="estreito">
      <h1>Meu agendamento</h1>

      {lembrados.length > 0 && (
        <section aria-labelledby="titulo-lembrados">
          <h2 id="titulo-lembrados" className="rotulo-secao">Seus agendamentos neste navegador</h2>
          <ul className="lista-lembrados">
            {lembrados.map((l) => (
              <li key={l.codigo} className="cartao">
                <div>
                  <strong>{l.servico}</strong> · {l.barbearia}
                  <p className="suave pequeno">{dataLonga(l.data)}, às {l.hora} · código {l.codigo}</p>
                </div>
                <div className="botoes">
                  <button type="button" className="botao botao-pequeno" onClick={() => consultar(l.codigo, l.nome)}>Ver</button>
                  <button type="button" className="botao botao-claro botao-pequeno" onClick={() => {
                    esquecer(l.codigo);
                    setLembrados(listarLembrados());
                  }}>
                    Esquecer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className="cartao formulario" onSubmit={enviar}>
        <h2>Buscar pelo código</h2>
        <div className="duas-colunas">
          <div>
            <label htmlFor="codigo">Código do agendamento</label>
            <input id="codigo" required maxLength={12} autoComplete="off" className="maiusculas"
              value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nome-cliente">Seu nome</label>
            <input id="nome-cliente" required maxLength={120} autoComplete="name"
              value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
        </div>
        <p className="dica">Pode ser só o primeiro nome, do jeito que você informou ao agendar.</p>
        <button type="submit" className="botao" disabled={buscando}>{buscando ? "Buscando…" : "Buscar"}</button>
      </form>

      {!a && <Erro texto={erro} />}

      {a && (
        <article ref={detalhe} className="cartao detalhe-agendamento" aria-labelledby="titulo-detalhe">
          <header className="linha-entre">
            <h2 id="titulo-detalhe">Código {a.codigo}</h2>
            <span className={`etiqueta etiqueta-${a.status}`}>{STATUS[a.status]}</span>
          </header>
          <Erro texto={erro} />
          <Sucesso texto={sucesso} />

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
          {a.barbeariaEndereco && <p className="suave">{a.barbeariaEndereco}</p>}

          {podeMexer && modo === "ver" && (
            <div className="botoes">
              <button type="button" className="botao" onClick={() => setModo("remarcar")}>Remarcar</button>
              <button type="button" className="botao botao-claro" onClick={() => setModo("cancelar")}>Cancelar</button>
              {!estaLembrado(a.codigo) && (
                <button type="button" className="link" onClick={() => {
                  lembrar(a, nomeUsado);
                  setLembrados(listarLembrados());
                }}>
                  Lembrar neste navegador
                </button>
              )}
            </div>
          )}

          {modo === "cancelar" && (
            <div className="confirmacao" role="group" aria-label="Confirmar cancelamento">
              <p>Tem certeza que quer cancelar? O horário fica livre para outra pessoa.</p>
              <div className="botoes">
                <button type="button" className="botao botao-perigo" disabled={salvando}
                  onClick={() => executar(() => api.cancelar(a.codigo, nomeUsado), "Agendamento cancelado.")}>
                  Sim, cancelar
                </button>
                <button type="button" className="botao botao-claro" onClick={() => setModo("ver")}>Voltar</button>
              </div>
            </div>
          )}

          {modo === "remarcar" && (
            <section className="remarcar" aria-label="Escolher novo horário">
              <div className="linha-entre">
                <h3>Escolha o novo horário</h3>
                <button type="button" className="link" onClick={() => { setModo("ver"); setNovo(null); }}>Desistir</button>
              </div>

              {novo ? (
                <div className="confirmacao">
                  <p>
                    Trocar para <strong>{dataLonga(novo.data)}, às {novo.hora}</strong> com {novo.profissional.nome}?
                  </p>
                  <div className="botoes">
                    <button type="button" className="botao" disabled={salvando}
                      onClick={() => executar(() => api.remarcar(a.codigo, nomeUsado, {
                        funcionarioId: novo.profissional.id, data: novo.data, hora: novo.hora,
                      }), "Pronto! Seu horário foi remarcado.")}>
                      Confirmar troca
                    </button>
                    <button type="button" className="botao botao-claro" onClick={() => setNovo(null)}>Escolher outro</button>
                  </div>
                </div>
              ) : (
                <EscolherHorario barbeariaId={a.barbeariaId} servicoId={a.servicoId}
                  profissionalInicial={a.funcionarioId} remarcando={a.codigo} aoEscolher={setNovo} />
              )}
            </section>
          )}
        </article>
      )}
    </section>
  );
}
