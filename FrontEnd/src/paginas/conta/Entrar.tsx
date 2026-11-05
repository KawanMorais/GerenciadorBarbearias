import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { api, textoDoErro } from "../../api";
import { useSessao } from "../../auth";
import { Erro } from "../../componentes/Mensagem";

// Login do administrador.
export function Entrar() {
  const { sessao, entrar } = useSessao();
  const navegar = useNavigate();
  const voltarPara = (useLocation().state as { voltarPara?: string } | null)?.voltarPara ?? "/admin";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  if (sessao) return <Navigate to="/admin" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      entrar(await api.entrar(email.trim(), senha));
      navegar(voltarPara.startsWith("/admin") ? voltarPara : "/admin", { replace: true });
    } catch (falha) {
      setErro(textoDoErro(falha));
      setEnviando(false);
    }
  }

  return (
    <section className="caixa-conta">
      <h1>Área da barbearia</h1>
      <p className="suave">Entre para cuidar dos serviços, da equipe e dos horários.</p>

      <form className="cartao formulario" onSubmit={enviar}>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="senha">Senha</label>
        <input id="senha" type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />

        <Erro texto={erro} />
        <button type="submit" className="botao botao-largo" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
        <p className="centro"><Link to="/admin/esqueci-senha">Esqueci minha senha</Link></p>
      </form>

      <p className="centro">Ainda não está aqui? <Link to="/admin/cadastro">Cadastrar minha barbearia</Link></p>
    </section>
  );
}
