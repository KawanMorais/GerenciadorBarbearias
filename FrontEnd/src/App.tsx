import { BrowserRouter, Link, Route, Routes } from "react-router";
import { ProvedorSessao, SoAdmin } from "./auth";
import { LayoutSite } from "./paginas/LayoutSite";
import { Busca } from "./paginas/cliente/Busca";
import { PaginaBarbearia } from "./paginas/cliente/PaginaBarbearia";
import { Agendar } from "./paginas/cliente/Agendar";
import { MeuAgendamento } from "./paginas/cliente/MeuAgendamento";
import { Entrar } from "./paginas/conta/Entrar";
import { Cadastro } from "./paginas/conta/Cadastro";
import { EsqueciSenha } from "./paginas/conta/EsqueciSenha";
import { RedefinirSenha } from "./paginas/conta/RedefinirSenha";
import { LayoutPainel } from "./paginas/painel/LayoutPainel";
import { Inicio } from "./paginas/painel/Inicio";
import { Servicos } from "./paginas/painel/Servicos";
import { Funcionarios } from "./paginas/painel/Funcionarios";
import { Horarios } from "./paginas/painel/Horarios";
import { MinhaBarbearia } from "./paginas/painel/MinhaBarbearia";

// Mapa de endereços do site: qual página aparece em cada URL.
export function App() {
  return (
    <ProvedorSessao>
      <BrowserRouter>
        <Routes>
          <Route element={<LayoutSite />}>
            <Route index element={<Busca />} />
            <Route path="barbearias/:id" element={<PaginaBarbearia />} />
            <Route path="barbearias/:id/agendar" element={<Agendar />} />
            <Route path="meu-agendamento" element={<MeuAgendamento />} />
            <Route path="admin/entrar" element={<Entrar />} />
            <Route path="admin/cadastro" element={<Cadastro />} />
            <Route path="admin/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="redefinir-senha" element={<RedefinirSenha />} />
            <Route path="*" element={<NaoEncontrada />} />
          </Route>

          <Route path="admin" element={<SoAdmin><LayoutPainel /></SoAdmin>}>
            <Route index element={<Inicio />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="funcionarios" element={<Funcionarios />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="barbearia" element={<MinhaBarbearia />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProvedorSessao>
  );
}

function NaoEncontrada() {
  return (
    <section className="estreito">
      <h1>Página não encontrada</h1>
      <p>O endereço pode ter mudado. <Link to="/">Voltar ao início</Link></p>
    </section>
  );
}
