import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api, textoDoErro, type Agendamento, type Inicio as DadosInicio, type Status } from "../../api";
import { useSessao } from "../../auth";
import { dataLonga, dinheiro, hojeIso, primeiroNome, STATUS } from "../../formatos";
import { Avatar } from "../../componentes/Avatar";
import { EscolherHorario } from "../../componentes/EscolherHorario";
import { Janela } from "../../componentes/Janela";
import { Carregando, Erro } from "../../componentes/Mensagem";

// Página que resolve cada pendência.
const ONDE_RESOLVER: [string, string][] = [
  ["horário", "/admin/horarios"],
  ["serviço", "/admin/servicos"],
  ["funcionário", "/admin/funcionarios"],
  ["desativada", "/admin/barbearia"],
];

// Resumo do dia e lista de agendamentos.
export function Inicio() {
  const { sessao } = useSessao();
  const [data, setData] = useState(hojeIso);
  const [dados, setDados] = useState<DadosInicio | null>(null);
  const [pendencias, setPendencias] = useState<string[]>([]);
  const [aberto, setAberto] = useState<Agendamento | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    setErro("");
    api.inicio(data).then(setDados).catch((e) => setErro(textoDoErro(e)));
  }, [data]);

  useEffect(carregar, [carregar]);

  useEffect(() => {
    api.minhaBarbearia().then((b) => setPendencias(b.pendencias)).catch(() => undefined);
  }, []);

  return (
    <>
      <header className="painel-titulo">
        <div>
          <h1>Olá, {primeiroNome(sessao?.adminNome ?? "")}</h1>
          <p className="suave">{dataLonga(data)}</p>
        </div>
        <label className="campo-data">
          <span>Ver o dia</span>
          <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
        </label>
      </header>

      {pendencias.length > 0 && (
        <section className="cartao pendencias" aria-labelledby="titulo-pendencias">
          <h2 id="titulo-pendencias">Falta pouco para sua barbearia aparecer na busca</h2>
          <ol>
            {pendencias.map((p) => {
              const destino = ONDE_RESOLVER.find(([palavra]) => p.includes(palavra))?.[1];
              return <li key={p}>{destino ? <Link to={destino}>{p}</Link> : p}</li>;
            })}
          </ol>
        </section>
      )}

      <Erro texto={erro} />
      {!dados ? (
        !erro && <Carregando />
      ) : (
        <>
          <dl className="numeros">
            <div><dt>Agendamentos</dt><dd>{dados.agendamentosHoje}</dd></div>
            <div><dt>Próximos atendimentos</dt><dd>{dados.proximosAtendimentos}</dd></div>
            <div><dt>Faturamento estimado</dt><dd>{dinheiro(dados.faturamentoEstimado)}</dd></div>
            <div><dt>Cancelamentos</dt><dd>{dados.cancelamentos}</dd></div>
          </dl>

          <section aria-labelledby="titulo-agenda">
            <h2 id="titulo-agenda" className="rotulo-secao">Agendamentos do dia</h2>
            {dados.agendamentos.length === 0 ? (
              <p className="vazio">Nenhum agendamento neste dia.</p>
            ) : (
              <ul className="agenda">
                {dados.agendamentos.map((a) => (
                  <li key={a.id}>
                    <button type="button" className={`agenda-item agenda-${a.status}`} onClick={() => setAberto(a)}>
                      <span className="agenda-hora">{a.horaInicio}</span>
                      <span className="agenda-texto">
                        <strong>{a.clienteNome}</strong>
                        <span className="suave">{a.servicoNome} · {primeiroNome(a.funcionarioNome)}</span>
                      </span>
                      <span className={`etiqueta etiqueta-${a.status}`}>{STATUS[a.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {aberto && (
        <DetalheAgendamento
          agendamento={aberto}
          aoFechar={() => setAberto(null)}
          aoMudar={(a) => {
            setAberto(a);
            carregar();
          }}
        />
      )}
    </>
  );
}

interface PropsDetalhe { agendamento: Agendamento; aoFechar: () => void; aoMudar: (a: Agendamento) => void }

// Detalhes do agendamento com as ações: Concluir, Não compareceu, Remarcar, Cancelar.
function DetalheAgendamento({ agendamento: a, aoFechar, aoMudar }: PropsDetalhe) {
  const [remarcando, setRemarcando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function executar(acao: () => Promise<Agendamento>) {
    setErro("");
    setSalvando(true);
    try {
      aoMudar(await acao());
      setRemarcando(false);
    } catch (e) {
      setErro(textoDoErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const status = (s: Status) => executar(() => api.mudarStatus(a.id, s));

  return (
    <Janela titulo={`${a.horaInicio} · ${a.clienteNome}`} aoFechar={aoFechar}>
      <dl className="resumo">
        <div><dt>Cliente</dt><dd>{a.clienteNome}</dd></div>
        <div><dt>E-mail</dt><dd>{a.clienteEmail ?? "Não informado"}</dd></div>
        <div><dt>Serviço</dt><dd>{a.servicoNome}</dd></div>
        <div>
          <dt>Profissional</dt>
          <dd className="resumo-profissional"><Avatar nome={a.funcionarioNome} foto={a.funcionarioFotoUrl} tamanho="p" /> {a.funcionarioNome}</dd>
        </div>
        <div><dt>Quando</dt><dd>{dataLonga(a.data)}, {a.horaInicio} às {a.horaFim}</dd></div>
        <div><dt>Valor</dt><dd>{dinheiro(a.preco)}</dd></div>
        <div><dt>Código</dt><dd>{a.codigo}</dd></div>
        <div><dt>Status</dt><dd><span className={`etiqueta etiqueta-${a.status}`}>{STATUS[a.status]}</span></dd></div>
      </dl>

      <Erro texto={erro} />

      {a.status !== "Cancelado" && !remarcando && (
        <div className="botoes">
          {a.status !== "Concluido" && <button type="button" className="botao" disabled={salvando} onClick={() => status("Concluido")}>Concluir</button>}
          {a.status !== "NaoCompareceu" && (
            <button type="button" className="botao botao-claro" disabled={salvando} onClick={() => status("NaoCompareceu")}>Não compareceu</button>
          )}
          {a.status === "Confirmado" && (
            <>
              <button type="button" className="botao botao-claro" onClick={() => setRemarcando(true)}>Remarcar</button>
              <button type="button" className="botao botao-perigo" disabled={salvando}
                onClick={() => window.confirm("Cancelar este agendamento? O horário fica livre.") && status("Cancelado")}>
                Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {remarcando && (
        <section className="remarcar" aria-label="Novo horário">
          <div className="linha-entre">
            <h3>Novo horário</h3>
            <button type="button" className="link" onClick={() => setRemarcando(false)}>Desistir</button>
          </div>
          <EscolherHorario barbeariaId={a.barbeariaId} servicoId={a.servicoId} profissionalInicial={a.funcionarioId} remarcando={a.codigo}
            aoEscolher={(e) => executar(() => api.remarcarAdmin(a.id, { funcionarioId: e.profissional.id, data: e.data, hora: e.hora }))} />
        </section>
      )}

      {a.clienteNome !== "Cliente removido" && (
        <p className="lgpd">
          <button type="button" className="link" disabled={salvando}
            onClick={() => window.confirm("Apagar o nome e o e-mail deste cliente? Isso não pode ser desfeito.")
              && executar(() => api.apagarDadosCliente(a.id))}>
            Apagar dados do cliente (LGPD)
          </button>
        </p>
      )}
    </Janela>
  );
}
