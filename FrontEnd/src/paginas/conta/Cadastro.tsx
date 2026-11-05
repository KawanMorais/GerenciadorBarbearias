import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api, textoDoErro, type Cadastro as DadosCadastro } from "../../api";
import { useSessao } from "../../auth";
import { Erro } from "../../componentes/Mensagem";
import { CampoImagem } from "../../componentes/CampoImagem";

const VAZIO: DadosCadastro = {
  adminNome: "", email: "", senha: "", confirmarSenha: "",
  barbeariaNome: "", documento: "", endereco: "", bairro: "", cidade: "", telefone: "",
};

// Cadastro da barbearia e do administrador.
export function Cadastro() {
  const { entrar } = useSessao();
  const navegar = useNavigate();
  const [dados, setDados] = useState(VAZIO);
  const [logo, setLogo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // Props de cada campo do formulário.
  const campo = (nome: keyof DadosCadastro) => ({
    id: nome,
    value: dados[nome],
    onChange: (e: { target: { value: string } }) => setDados({ ...dados, [nome]: e.target.value }),
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (dados.senha !== dados.confirmarSenha) return setErro("As senhas não conferem.");
    setErro("");
    setEnviando(true);
    try {
      entrar(await api.cadastrar(dados));
      // A logo precisa do token, então vai depois do cadastro.
      if (logo) await api.enviarLogo(logo).catch(() => undefined);
      navegar("/admin", { replace: true });
    } catch (falha) {
      setErro(textoDoErro(falha));
      setEnviando(false);
    }
  }

  return (
    <section className="caixa-conta caixa-larga">
      <h1>Cadastrar minha barbearia</h1>
      <p className="suave">Leva uns dois minutos. Depois você cadastra o horário, os serviços e a equipe.</p>

      <form className="cartao formulario" onSubmit={enviar}>
        <fieldset>
          <legend>Seus dados</legend>
          <label htmlFor="adminNome">Seu nome</label>
          <input required maxLength={120} autoComplete="name" {...campo("adminNome")} />

          <label htmlFor="email">E-mail</label>
          <input type="email" required maxLength={160} autoComplete="email" {...campo("email")} />

          <div className="duas-colunas">
            <div>
              <label htmlFor="senha">Senha</label>
              <input type="password" required minLength={6} maxLength={100} autoComplete="new-password"
                aria-describedby="dica-senha" {...campo("senha")} />
            </div>
            <div>
              <label htmlFor="confirmarSenha">Repita a senha</label>
              <input type="password" required minLength={6} maxLength={100} autoComplete="new-password" {...campo("confirmarSenha")} />
            </div>
          </div>
          <p id="dica-senha" className="dica">Pelo menos 6 caracteres.</p>
        </fieldset>

        <fieldset>
          <legend>Dados da barbearia</legend>
          <label htmlFor="barbeariaNome">Nome da barbearia</label>
          <input required maxLength={120} {...campo("barbeariaNome")} />

          <div className="duas-colunas">
            <div>
              <label htmlFor="documento">CNPJ ou CPF (opcional)</label>
              <input maxLength={20} inputMode="numeric" {...campo("documento")} />
            </div>
            <div>
              <label htmlFor="telefone">Telefone / WhatsApp</label>
              <input type="tel" maxLength={20} autoComplete="tel" {...campo("telefone")} />
            </div>
          </div>

          <label htmlFor="endereco">Endereço</label>
          <input maxLength={200} autoComplete="street-address" placeholder="Rua e número" {...campo("endereco")} />

          <div className="duas-colunas">
            <div>
              <label htmlFor="bairro">Bairro</label>
              <input maxLength={80} {...campo("bairro")} />
            </div>
            <div>
              <label htmlFor="cidade">Cidade</label>
              <input maxLength={80} {...campo("cidade")} />
            </div>
          </div>

          <CampoImagem id="logo" rotulo="Logo (opcional)" atual={null} aoEscolher={setLogo} />
        </fieldset>

        <Erro texto={erro} />
        <button type="submit" className="botao botao-destaque botao-largo" disabled={enviando}>
          {enviando ? "Cadastrando…" : "Criar conta"}
        </button>
      </form>

      <p className="centro">Já tem conta? <Link to="/admin/entrar">Entrar</Link></p>
    </section>
  );
}
