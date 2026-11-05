import { useEffect, useState, type FormEvent } from "react";
import { api, textoDoErro, type DadosBarbearia, type MinhaBarbearia as Barbearia } from "../../api";
import { useSessao } from "../../auth";
import { CampoImagem } from "../../componentes/CampoImagem";
import { Carregando, Erro, Sucesso } from "../../componentes/Mensagem";

// Dados da barbearia, fotos, aparecer na busca e trocar a senha.
export function MinhaBarbearia() {
  const { renomearBarbearia } = useSessao();
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null);
  const [dados, setDados] = useState<DadosBarbearia | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [capa, setCapa] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function mostrar(b: Barbearia) {
    setBarbearia(b);
    const { nome, documento, descricao, endereco, bairro, cidade, telefone, ativa } = b;
    setDados({ nome, documento, descricao, endereco, bairro, cidade, telefone, ativa });
  }

  useEffect(() => {
    api.minhaBarbearia().then(mostrar).catch((e) => setErro(textoDoErro(e)));
  }, []);

  if (!barbearia || !dados) return erro ? <Erro texto={erro} /> : <Carregando />;

  // Campo vazio é enviado como null.
  const campo = (nome: Exclude<keyof DadosBarbearia, "ativa">) => ({
    id: `b-${nome}`,
    value: dados[nome] ?? "",
    onChange: (e: { target: { value: string } }) => setDados({ ...dados, [nome]: e.target.value || null }),
  });

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!dados) return;
    setErro("");
    setSucesso("");
    setSalvando(true);
    try {
      if (logo) await api.enviarLogo(logo);
      if (capa) await api.enviarCapa(capa);
      setLogo(null);
      setCapa(null);
      const salvo = await api.salvarBarbearia({ ...dados, nome: (dados.nome ?? "").trim() });
      mostrar(salvo);
      renomearBarbearia(salvo.nome);
      setSucesso("Dados salvos.");
    } catch (falha) {
      setErro(textoDoErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <header className="painel-titulo">
        <h1>Minha barbearia</h1>
        <span className={barbearia.visivelNaBusca ? "etiqueta etiqueta-ativo" : "etiqueta"}>
          {barbearia.visivelNaBusca ? "Aparece na busca" : "Fora da busca"}
        </span>
      </header>

      {barbearia.pendencias.length > 0 && (
        <ul className="aviso aviso-alerta lista-simples">
          {barbearia.pendencias.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      <form className="formulario" onSubmit={salvar}>
        <section className="cartao">
          <h2>Dados</h2>
          <label htmlFor="b-nome">Nome</label>
          <input required maxLength={120} {...campo("nome")} />

          <label htmlFor="b-descricao">Sobre a barbearia</label>
          <textarea rows={4} maxLength={2000} aria-describedby="dica-descricao" {...campo("descricao")} />
          <p id="dica-descricao" className="dica">Aparece na página da barbearia. Conte um pouco da história e do estilo da casa.</p>

          <div className="duas-colunas">
            <div>
              <label htmlFor="b-telefone">Telefone / WhatsApp</label>
              <input type="tel" maxLength={20} {...campo("telefone")} />
            </div>
            <div>
              <label htmlFor="b-documento">CNPJ ou CPF (opcional)</label>
              <input maxLength={20} {...campo("documento")} />
            </div>
          </div>

          <label htmlFor="b-endereco">Endereço</label>
          <input maxLength={200} {...campo("endereco")} />
          <div className="duas-colunas">
            <div>
              <label htmlFor="b-bairro">Bairro</label>
              <input maxLength={80} {...campo("bairro")} />
            </div>
            <div>
              <label htmlFor="b-cidade">Cidade</label>
              <input maxLength={80} {...campo("cidade")} />
            </div>
          </div>

          <label className="marcar">
            <input type="checkbox" checked={dados.ativa} onChange={(e) => setDados({ ...dados, ativa: e.target.checked })} />
            <span>Mostrar minha barbearia na busca dos clientes</span>
          </label>
        </section>

        <section className="cartao">
          <h2>Fotos</h2>
          <CampoImagem id="b-logo" rotulo="Logo" atual={barbearia.logoUrl} aoEscolher={setLogo} />
          <CampoImagem id="b-capa" rotulo="Foto de capa" atual={barbearia.capaUrl} aoEscolher={setCapa} formato="largo" />
        </section>

        <Erro texto={erro} />
        <Sucesso texto={sucesso} />
        <button type="submit" className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar alterações"}</button>
      </form>

      <TrocarSenha />
    </>
  );
}

function TrocarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSucesso("");
    if (nova !== repetir) return setErro("As senhas novas não conferem.");
    setErro("");
    try {
      setSucesso((await api.alterarSenha(atual, nova)).mensagem);
      setAtual("");
      setNova("");
      setRepetir("");
    } catch (falha) {
      setErro(textoDoErro(falha));
    }
  }

  return (
    <form className="cartao formulario" onSubmit={salvar}>
      <h2>Trocar senha</h2>
      <label htmlFor="s-atual">Senha atual</label>
      <input id="s-atual" type="password" required autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
      <div className="duas-colunas">
        <div>
          <label htmlFor="s-nova">Nova senha</label>
          <input id="s-nova" type="password" required minLength={6} maxLength={100} autoComplete="new-password"
            value={nova} onChange={(e) => setNova(e.target.value)} />
        </div>
        <div>
          <label htmlFor="s-repetir">Repita a nova senha</label>
          <input id="s-repetir" type="password" required minLength={6} maxLength={100} autoComplete="new-password"
            value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        </div>
      </div>
      <Erro texto={erro} />
      <Sucesso texto={sucesso} />
      <button type="submit" className="botao botao-claro">Trocar senha</button>
    </form>
  );
}
