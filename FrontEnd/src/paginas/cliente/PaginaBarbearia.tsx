import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api, textoDoErro, type BarbeariaDetalhe } from "../../api";
import { DIAS, dinheiro, duracao, enderecoCompleto, primeiroNome, urlDaFoto } from "../../formatos";
import { Avatar } from "../../componentes/Avatar";
import { Logo } from "../../componentes/Logo";
import { Carregando, Erro } from "../../componentes/Mensagem";

// Página pública da barbearia.
export function PaginaBarbearia() {
  const id = Number(useParams().id);
  const [b, setB] = useState<BarbeariaDetalhe | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.barbearia(id).then(setB).catch((e) => setErro(textoDoErro(e)));
  }, [id]);

  if (erro) return <Erro texto={erro} />;
  if (!b) return <Carregando />;

  const capa = urlDaFoto(b.capaUrl);
  const agendar = `/barbearias/${b.id}/agendar`;

  return (
    <article className="pagina-barbearia">
      <header className="barbearia-topo">
        {capa && <img className="barbearia-capa" src={capa} alt={`Foto da ${b.nome}`} />}
        <div className="barbearia-titulo">
          <Logo nome={b.nome} url={b.logoUrl} grande />
          <div>
            <h1>{b.nome}</h1>
            {enderecoCompleto(b) && <p className="suave">{enderecoCompleto(b)}</p>}
          </div>
          <Link to={agendar} className="botao botao-destaque">Agendar horário</Link>
        </div>
      </header>

      <div className="barbearia-colunas">
        <div>
          {b.descricao && (
            <section>
              <h2>Sobre a barbearia</h2>
              <p className="texto-longo">{b.descricao}</p>
            </section>
          )}

          <section>
            <h2>Serviços e preços</h2>
            <ul className="lista-servicos">
              {b.servicos.map((s) => (
                <li key={s.id}>
                  <Link to={`${agendar}?servico=${s.id}`}>
                    <span className="servico-nome">{s.nome}</span>
                    <span className="servico-duracao">{duracao(s.duracaoMinutos)}</span>
                    <span className="servico-preco">{dinheiro(s.preco)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Nossa equipe</h2>
            <ul className="equipe">
              {b.equipe.map((f) => (
                <li key={f.id}>
                  <Avatar nome={f.nome} foto={f.fotoUrl} tamanho="g" />
                  <span>{primeiroNome(f.nome)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="cartao barbearia-info">
          <h2>Horário de funcionamento</h2>
          <table className="tabela-horarios">
            <tbody>
              {DIAS.map((d) => {
                const h = b.horarios.find((x) => x.diaSemana === d.valor);
                return (
                  <tr key={d.valor}>
                    <th scope="row">{d.nome}</th>
                    <td>{h ? `${h.abertura} às ${h.fechamento}` : "Fechado"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(b.endereco || b.telefone) && (
            <>
              <h2>Onde fica</h2>
              <address>
                {enderecoCompleto(b) && <p>{enderecoCompleto(b)}</p>}
                {b.telefone && <p>Telefone: <a href={`tel:${b.telefone.replace(/[^\d+]/g, "")}`}>{b.telefone}</a></p>}
              </address>
            </>
          )}
        </aside>
      </div>

      <p className="centro">
        <Link to={agendar} className="botao botao-destaque">Agendar horário</Link>
      </p>
    </article>
  );
}
