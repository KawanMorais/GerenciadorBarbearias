import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { NOME_SITE } from "../formatos";

// Moldura das páginas públicas: cabeçalho, conteúdo e rodapé.
export function LayoutSite() {
  const { pathname } = useLocation();

  // Ao trocar de página, volta para o topo.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header className="topo">
        <div className="topo-dentro">
          <Link to="/" className="marca">
            <span className="marca-simbolo" aria-hidden="true" />
            {NOME_SITE}
          </Link>
          <nav aria-label="Principal">
            <NavLink to="/" end>Barbearias</NavLink>
            <NavLink to="/meu-agendamento">Meu agendamento</NavLink>
            <NavLink to="/admin/entrar">Sou barbearia</NavLink>
          </nav>
        </div>
      </header>

      <main className="conteudo">
        <Outlet />
      </main>

      <footer className="rodape">
        <p>{NOME_SITE} · agendamento online sem precisar criar conta. O pagamento é feito na barbearia.</p>
        <p><Link to="/admin/entrar">Sou barbearia · Área do administrador</Link></p>
      </footer>
    </>
  );
}
