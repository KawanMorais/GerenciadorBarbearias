import { useEffect, useState, type FormEvent } from "react";
import { api, textoDoErro, type DadosServico, type ServicoAdmin } from "../../api";
import { dinheiro, duracao } from "../../formatos";
import { Janela } from "../../componentes/Janela";
import { Carregando, Erro } from "../../componentes/Mensagem";

const DURACOES = [30, 60, 90, 120, 150, 180, 240];
const NOVO: DadosServico = { nome: "", descricao: "", preco: 0, duracaoMinutos: 30, ativo: true };

// Cadastro dos serviços da barbearia.
export function Servicos() {
  const [servicos, setServicos] = useState<ServicoAdmin[] | null>(null);
  const [editando, setEditando] = useState<ServicoAdmin | "novo" | null>(null);
  const [erro, setErro] = useState("");

  const carregar = () => api.servicos().then(setServicos).catch((e) => setErro(textoDoErro(e)));
  useEffect(() => { carregar(); }, []);

  async function executar(acao: () => Promise<unknown>) {
    setErro("");
    try {
      await acao();
      await carregar();
    } catch (e) {
      setErro(textoDoErro(e));
    }
  }

  return (
    <>
      <header className="painel-titulo">
        <h1>Serviços</h1>
        <button type="button" className="botao botao-destaque" onClick={() => setEditando("novo")}>Adicionar serviço</button>
      </header>

      <Erro texto={erro} />
      {!servicos ? (
        !erro && <Carregando />
      ) : servicos.length === 0 ? (
        <p className="vazio">Nenhum serviço ainda. Comece pelo corte mais pedido.</p>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th scope="col">Serviço</th><th scope="col">Duração</th><th scope="col">Preço</th><th scope="col">Status</th><th scope="col"><span className="so-leitor">Ações</span></th></tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id} className={s.ativo ? undefined : "inativo"}>
                  <td>
                    <strong>{s.nome}</strong>
                    {s.descricao && <span className="suave pequeno bloco">{s.descricao}</span>}
                  </td>
                  <td>{duracao(s.duracaoMinutos)}</td>
                  <td>{dinheiro(s.preco)}</td>
                  <td><span className={s.ativo ? "etiqueta etiqueta-ativo" : "etiqueta"}>{s.ativo ? "Ativo" : "Inativo"}</span></td>
                  <td className="acoes">
                    <button type="button" className="botao botao-claro botao-pequeno" onClick={() => setEditando(s)}>Editar</button>
                    <button type="button" className="botao botao-claro botao-pequeno" onClick={() => executar(() => api.ativarServico(s.id, !s.ativo))}>
                      {s.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button type="button" className="botao botao-claro botao-pequeno botao-texto-perigo"
                      onClick={() => window.confirm(`Excluir "${s.nome}"?`) && executar(() => api.excluirServico(s.id))}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="dica">Serviço que já teve agendamento não pode ser excluído, só desativado. Assim o histórico fica certo.</p>

      {editando && (
        <FormServico
          servico={editando === "novo" ? null : editando}
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

interface PropsForm { servico: ServicoAdmin | null; aoFechar: () => void; aoSalvar: () => void }

function FormServico({ servico, aoFechar, aoSalvar }: PropsForm) {
  const [dados, setDados] = useState<DadosServico>(servico ?? NOVO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const corpo = { ...dados, nome: dados.nome.trim(), descricao: dados.descricao?.trim() || null };
      await (servico ? api.editarServico(servico.id, corpo) : api.criarServico(corpo));
      aoSalvar();
    } catch (falha) {
      setErro(textoDoErro(falha));
      setSalvando(false);
    }
  }

  return (
    <Janela titulo={servico ? "Editar serviço" : "Novo serviço"} aoFechar={aoFechar}>
      <form className="formulario" onSubmit={salvar}>
        <label htmlFor="s-nome">Nome</label>
        <input id="s-nome" required maxLength={100} value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />

        <label htmlFor="s-descricao">Descrição (opcional)</label>
        <textarea id="s-descricao" maxLength={500} rows={2} value={dados.descricao ?? ""}
          onChange={(e) => setDados({ ...dados, descricao: e.target.value })} />

        <div className="duas-colunas">
          <div>
            <label htmlFor="s-preco">Preço (R$)</label>
            <input id="s-preco" type="number" required min={0} max={100000} step={0.01} inputMode="decimal"
              value={dados.preco} onChange={(e) => setDados({ ...dados, preco: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="s-duracao">Duração</label>
            <select id="s-duracao" value={dados.duracaoMinutos}
              onChange={(e) => setDados({ ...dados, duracaoMinutos: Number(e.target.value) })}>
              {DURACOES.map((d) => <option key={d} value={d}>{duracao(d)}</option>)}
            </select>
          </div>
        </div>

        <label className="marcar">
          <input type="checkbox" checked={dados.ativo} onChange={(e) => setDados({ ...dados, ativo: e.target.checked })} />
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
