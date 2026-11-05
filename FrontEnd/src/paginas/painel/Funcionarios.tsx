import { useEffect, useState, type FormEvent } from "react";
import { api, textoDoErro, type DiaSemana, type FuncionarioAdmin, type HorarioFuncionamento, type ServicoAdmin } from "../../api";
import { DIAS } from "../../formatos";
import { Avatar } from "../../componentes/Avatar";
import { CampoImagem } from "../../componentes/CampoImagem";
import { Janela } from "../../componentes/Janela";
import { Carregando, Erro } from "../../componentes/Mensagem";

// Cadastro dos funcionários.
export function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioAdmin[] | null>(null);
  const [servicos, setServicos] = useState<ServicoAdmin[]>([]);
  const [expediente, setExpediente] = useState<HorarioFuncionamento[]>([]);
  const [editando, setEditando] = useState<FuncionarioAdmin | "novo" | null>(null);
  const [erro, setErro] = useState("");

  const carregar = () => api.funcionarios().then(setFuncionarios).catch((e) => setErro(textoDoErro(e)));

  useEffect(() => {
    carregar();
    api.servicos().then(setServicos).catch(() => undefined);
    api.meusHorarios().then((h) => setExpediente(h.dias)).catch(() => undefined);
  }, []);

  async function executar(acao: () => Promise<unknown>) {
    setErro("");
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(textoDoErro(e));
    }
  }

  const nomeDoServico = (id: number) => servicos.find((s) => s.id === id)?.nome;

  return (
    <>
      <header className="painel-titulo">
        <h1>Funcionários</h1>
        <button type="button" className="botao botao-destaque" onClick={() => setEditando("novo")}>Adicionar funcionário</button>
      </header>

      <Erro texto={erro} />
      {!funcionarios ? (
        !erro && <Carregando />
      ) : funcionarios.length === 0 ? (
        <p className="vazio">Nenhum funcionário ainda. Cadastre quem atende na barbearia.</p>
      ) : (
        <ul className="lista-equipe">
          {funcionarios.map((f) => (
            <li key={f.id} className={f.ativo ? "cartao" : "cartao inativo"}>
              <Avatar nome={f.nome} foto={f.fotoUrl} tamanho="g" />
              <div className="lista-equipe-texto">
                <h2>{f.nome}</h2>
                <p className="suave pequeno">
                  {f.servicoIds.map(nomeDoServico).filter(Boolean).join(", ") || "Nenhum serviço escolhido"}
                </p>
                <span className={f.ativo ? "etiqueta etiqueta-ativo" : "etiqueta"}>{f.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <div className="acoes">
                <button type="button" className="botao botao-claro botao-pequeno" onClick={() => setEditando(f)}>Editar</button>
                <button type="button" className="botao botao-claro botao-pequeno" onClick={() => executar(() => api.ativarFuncionario(f.id, !f.ativo))}>
                  {f.ativo ? "Desativar" : "Ativar"}
                </button>
                <button type="button" className="botao botao-claro botao-pequeno botao-texto-perigo"
                  onClick={() => window.confirm(`Excluir ${f.nome}?`) && executar(() => api.excluirFuncionario(f.id))}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <FormFuncionario
          funcionario={editando === "novo" ? null : editando}
          servicos={servicos}
          expediente={expediente}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </>
  );
}

type Faixa = { trabalha: boolean; inicio: string; fim: string };

interface PropsForm {
  funcionario: FuncionarioAdmin | null;
  servicos: ServicoAdmin[];
  expediente: HorarioFuncionamento[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

// Um horário por dia, começando pelo da barbearia.
function faixasIniciais(f: FuncionarioAdmin | null, expediente: HorarioFuncionamento[]) {
  const faixas = {} as Record<DiaSemana, Faixa>;
  for (const d of DIAS) {
    const proprio = f?.disponibilidades.find((x) => x.diaSemana === d.valor);
    const barbearia = expediente.find((x) => x.diaSemana === d.valor);
    faixas[d.valor] = {
      trabalha: proprio ? true : !!barbearia,
      inicio: proprio?.inicio ?? barbearia?.abertura ?? "09:00",
      fim: proprio?.fim ?? barbearia?.fechamento ?? "18:00",
    };
  }
  return faixas;
}

function FormFuncionario({ funcionario: f, servicos, expediente, aoFechar, aoSalvar }: PropsForm) {
  const [nome, setNome] = useState(f?.nome ?? "");
  const [telefone, setTelefone] = useState(f?.telefone ?? "");
  const [especialidades, setEspecialidades] = useState(f?.especialidades ?? "");
  const [ativo, setAtivo] = useState(f?.ativo ?? true);
  const [servicoIds, setServicoIds] = useState<number[]>(f?.servicoIds ?? []);
  // Sem horário próprio = horário todo da barbearia (lista vazia).
  const [horarioProprio, setHorarioProprio] = useState((f?.disponibilidades.length ?? 0) > 0);
  const [faixas, setFaixas] = useState(() => faixasIniciais(f, expediente));
  const [foto, setFoto] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const alternarServico = (id: number) =>
    setServicoIds(servicoIds.includes(id) ? servicoIds.filter((x) => x !== id) : [...servicoIds, id]);

  const mudarFaixa = (dia: DiaSemana, mudanca: Partial<Faixa>) =>
    setFaixas({ ...faixas, [dia]: { ...faixas[dia], ...mudanca } });

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const dados = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      especialidades: especialidades.trim() || null,
      ativo,
      servicoIds,
      disponibilidades: horarioProprio
        ? DIAS.filter((d) => faixas[d.valor].trabalha)
            .map((d) => ({ diaSemana: d.valor, inicio: faixas[d.valor].inicio, fim: faixas[d.valor].fim }))
        : [],
    };
    try {
      const salvo = await (f ? api.editarFuncionario(f.id, dados) : api.criarFuncionario(dados));
      if (foto) await api.fotoFuncionario(salvo.id, foto);
      aoSalvar();
    } catch (falha) {
      setErro(textoDoErro(falha));
      setSalvando(false);
    }
  }

  return (
    <Janela titulo={f ? `Editar ${f.nome}` : "Novo funcionário"} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <CampoImagem id="f-foto" rotulo="Foto" atual={f?.fotoUrl ?? null} aoEscolher={setFoto} formato="redondo" />

        <label htmlFor="f-nome">Nome</label>
        <input id="f-nome" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />

        <div className="duas-colunas">
          <div>
            <label htmlFor="f-telefone">Telefone (opcional)</label>
            <input id="f-telefone" type="tel" maxLength={20} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-especialidades">Especialidades (opcional)</label>
            <input id="f-especialidades" maxLength={300} placeholder="Ex.: degradê, barba"
              value={especialidades} onChange={(e) => setEspecialidades(e.target.value)} />
          </div>
        </div>

        <fieldset>
          <legend>Serviços que realiza</legend>
          {servicos.length === 0 ? (
            <p className="dica">Cadastre os serviços primeiro, na página Serviços.</p>
          ) : (
            <div className="fichas">
              {servicos.map((s) => (
                <label key={s.id} className="ficha">
                  <input type="checkbox" checked={servicoIds.includes(s.id)} onChange={() => alternarServico(s.id)} />
                  <span>{s.nome}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Dias e horários de trabalho</legend>
          <label className="marcar">
            <input type="checkbox" checked={!horarioProprio} onChange={(e) => setHorarioProprio(!e.target.checked)} />
            <span>Trabalha em todo o horário da barbearia</span>
          </label>

          {horarioProprio && (
            <table className="tabela tabela-compacta">
              <tbody>
                {DIAS.map((d) => {
                  const faixa = faixas[d.valor];
                  return (
                    <tr key={d.valor}>
                      <th scope="row">
                        <label className="marcar">
                          <input type="checkbox" checked={faixa.trabalha} onChange={(e) => mudarFaixa(d.valor, { trabalha: e.target.checked })} />
                          <span>{d.nome}</span>
                        </label>
                      </th>
                      <td>
                        {faixa.trabalha ? (
                          <span className="faixa-horas">
                            <input type="time" step={1800} required aria-label={`${d.nome}, início`}
                              value={faixa.inicio} onChange={(e) => mudarFaixa(d.valor, { inicio: e.target.value })} />
                            <span>às</span>
                            <input type="time" step={1800} required aria-label={`${d.nome}, fim`}
                              value={faixa.fim} onChange={(e) => mudarFaixa(d.valor, { fim: e.target.value })} />
                          </span>
                        ) : (
                          <span className="suave">Folga</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </fieldset>

        <label className="marcar">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span>Ativo (aparece para o cliente)</span>
        </label>

        <Erro texto={erro} />
        <div className="botoes">
          <button type="submit" className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          <button type="button" className="botao botao-claro" onClick={aoFechar}>Cancelar</button>
        </div>
      </form>
    </Janela>
  );
}
