import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { api, textoDoErro } from "../../api";
import { Erro, Sucesso } from "../../componentes/Mensagem";

// Recuperação de senha: a API manda um link por e-mail.
export function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      setSucesso((await api.esqueciSenha(email.trim())).mensagem);
    } catch (falha) {
      setErro(textoDoErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="caixa-conta">
      <h1>Esqueci minha senha</h1>
      <p className="suave">Informe o e-mail da conta. Vamos mandar um link para você criar uma senha nova.</p>

      <form className="cartao formulario" onSubmit={enviar}>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Erro texto={erro} />
        <Sucesso texto={sucesso} />
        <button type="submit" className="botao botao-largo" disabled={enviando}>{enviando ? "Enviando…" : "Enviar link"}</button>
      </form>

      <p className="centro"><Link to="/admin/entrar">Voltar para o login</Link></p>
    </section>
  );
}
