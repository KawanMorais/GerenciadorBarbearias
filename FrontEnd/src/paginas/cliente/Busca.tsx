import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, textoDoErro, type BarbeariaResumo } from "../../api";
import { enderecoCompleto, resumoDosHorarios } from "../../formatos";
import { lembradosFuturos } from "../../lembrados";
import { Logo } from "../../componentes/Logo";
import { Carregando, Erro } from "../../componentes/Mensagem";

// Busca e lista de barbearias.
export function Busca() {
  const [termo, setTermo] = useState("");
  const [barbearias, setBarbearias] = useState<BarbeariaResumo[] | null>(null);
  // "Ver mais" carrega a próxima página.
  const [busca, setBusca] = useState({ texto: "", pagina: 1, temMais: false });
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");
  const temHorario = lembradosFuturos().length > 0;

  function buscar(texto: string) {
    setErro("");
    setBarbearias(null);
    api.buscarBarbearias(texto)
      .then((p) => {
        setBarbearias(p.itens);
        setBusca({ texto, pagina: 1, temMais: p.temMais });
      })
      .catch((e) => {
        setErro(textoDoErro(e));
        setBarbearias([]);
      });
  }

  function verMais() {
    setErro("");
    setCarregandoMais(true);
    api.buscarBarbearias(busca.texto, busca.pagina + 1)
      .then((p) => {
        setBarbearias((atuais) => [...(atuais ?? []), ...p.itens]);
        setBusca({ ...busca, pagina: p.pagina, temMais: p.temMais });
      })
      .catch((e) => setErro(textoDoErro(e)))
      .finally(() => setCarregandoMais(false));
  }

  useEffect(() => {
    buscar("");
  }, []);

  function enviar(e: FormEvent) {
    e.preventDefault();
    buscar(termo.trim());
  }

  return (
    <>
      {temHorario && (
        <aside className="faixa-lembrete">
          <p>Você tem um horário marcado.</p>
          <Link to="/meu-agendamento" className="botao botao-pequeno">Ver</Link>
        </aside>
      )}

      <section className="capa-inicio">
        <h1>Marque seu corte em poucos toques.</h1>
        <p>Escolha a barbearia, o serviço e o horário. Sem cadastro e sem senha.</p>

        <form className="busca" role="search" onSubmit={enviar}>
          <label htmlFor="termo" className="so-leitor">Buscar barbearia</label>
          <input
            id="termo"
            type="search"
            placeholder="Nome, bairro ou cidade"
            maxLength={100}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
          <button type="submit" className="botao">Buscar</button>
        </form>
      </section>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="rotulo-secao">Barbearias</h2>
        <Erro texto={erro} />
        {!barbearias ? (
          <Carregando />
        ) : barbearias.length === 0 ? (
          !erro && <p className="vazio">Nenhuma barbearia encontrada. Tente outro nome, bairro ou cidade.</p>
        ) : (
          <ul className="lista-barbearias">
            {barbearias.map((b) => (
              <li key={b.id} className="cartao cartao-barbearia">
                <Logo nome={b.nome} url={b.logoUrl} />
                <div className="cartao-barbearia-texto">
                  <h3>{b.nome}</h3>
                  {enderecoCompleto(b) && <p className="suave">{enderecoCompleto(b)}</p>}
                  {resumoDosHorarios(b.horarios).map((linha) => <p key={linha} className="suave pequeno">{linha}</p>)}
                </div>
                <Link to={`/barbearias/${b.id}`} className="botao">Agendar</Link>
              </li>
            ))}
          </ul>
        )}
        {busca.temMais && barbearias && (
          <p className="centro">
            <button type="button" className="botao botao-claro" disabled={carregandoMais} onClick={verMais}>
              {carregandoMais ? "Carregando…" : "Ver mais barbearias"}
            </button>
          </p>
        )}
      </section>
    </>
  );
}
