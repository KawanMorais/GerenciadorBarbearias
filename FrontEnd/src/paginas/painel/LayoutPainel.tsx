import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useSessao } from "../../auth";
import { NOME_SITE } from "../../formatos";

const MENU = [
  { para: "/admin", nome: "Início" },
  { para: "/admin/servicos", nome: "Serviços" },
  { para: "/admin/funcionarios", nome: "Funcionários" },
  { para: "/admin/horarios", nome: "Horários" },
  { para: "/admin/barbearia", nome: "Minha barbearia" },
];

// Moldura do painel: menu lateral (no celular vira o botão "Menu").
export function LayoutPainel() {
  const { sessao, sair } = useSessao();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  function encerrar() {
    sair();
    navegar("/admin/entrar", { replace: true });
  }

  return (
    <div className="painel">
      <header className="painel-lateral">
        <div className="painel-marca">
          <Link to="/" className="marca">
            <span className="marca-simbolo" aria-hidden="true" />
            {NOME_SITE}
          </Link>
          <button type="button" className="botao-menu" aria-expanded={aberto} aria-controls="menu-painel"
            onClick={() => setAberto(!aberto)}>
            Menu
          </button>
        </div>

        <nav id="menu-painel" aria-label="Painel" className={aberto ? "aberto" : undefined}>
          <p className="painel-barbearia">{sessao?.barbeariaNome}</p>
          <ul>
            {MENU.map((m) => (
              <li key={m.para}>
                <NavLink to={m.para} end onClick={() => setAberto(false)}>{m.nome}</NavLink>
              </li>
            ))}
          </ul>
          <button type="button" className="painel-sair" onClick={encerrar}>Sair</button>
        </nav>
      </header>

      <main className="painel-conteudo">
        <Outlet />
      </main>
    </div>
  );
}
