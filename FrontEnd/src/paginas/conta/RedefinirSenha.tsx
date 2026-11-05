import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, textoDoErro } from "../../api";
import { Erro, Sucesso } from "../../componentes/Mensagem";

// Página aberta pelo link do e-mail de "esqueci minha senha".
export function RedefinirSenha() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");

  // Tira o token da URL para não ficar no histórico.
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (senha !== repetir) return setErro("As senhas não conferem.");
    setErro("");
    setEnviando(true);
    try {
      setSucesso((await api.redefinirSenha(token, senha)).mensagem);
    } catch (falha) {
      setErro(textoDoErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  if (!token)
    return (
      <section className="caixa-conta">
        <h1>Link inválido</h1>
        <p>Abra o link que chegou no seu e-mail ou <Link to="/admin/esqueci-senha">peça um novo</Link>.</p>
      </section>
    );

  return (
    <section className="caixa-conta">
      <h1>Criar nova senha</h1>
      {sucesso ? (
        <>
          <Sucesso texto={sucesso} />
          <p className="centro"><Link to="/admin/entrar" className="botao">Ir para o login</Link></p>
        </>
      ) : (
        <form className="cartao formulario" onSubmit={enviar}>
          <label htmlFor="senha">Nova senha</label>
          <input id="senha" type="password" required minLength={6} maxLength={100} autoComplete="new-password"
            value={senha} onChange={(e) => setSenha(e.target.value)} />
          <label htmlFor="repetir">Repita a nova senha</label>
          <input id="repetir" type="password" required minLength={6} maxLength={100} autoComplete="new-password"
            value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          <Erro texto={erro} />
          <button type="submit" className="botao botao-largo" disabled={enviando}>{enviando ? "Salvando…" : "Salvar senha"}</button>
        </form>
      )}
    </section>
  );
}
