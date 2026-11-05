import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { usarToken, type LoginResposta } from "./api";

// Sessão do admin no sessionStorage. Sai quando o token vence ou a API responde 401.

interface Sessao { token: string; expiraEm: string; barbeariaNome: string; adminNome: string }

interface ContextoSessao {
  sessao: Sessao | null;
  entrar: (resposta: LoginResposta) => void;
  sair: () => void;
  renomearBarbearia: (nome: string) => void;
}

const CHAVE = "sessao-admin";
const Contexto = createContext<ContextoSessao | null>(null);

function lerSessaoGuardada(): Sessao | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null") as Sessao | null;
    return s && new Date(s.expiraEm) > new Date() ? s : null;
  } catch {
    return null;
  }
}

function guardar(s: Sessao | null) {
  try {
    if (s) sessionStorage.setItem(CHAVE, JSON.stringify(s));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento: a sessão dura só enquanto a página está aberta
  }
}

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessaoGuardada);

  function sair() {
    guardar(null);
    setSessao(null);
  }

  // Informa ao api.ts o token atual.
  usarToken(sessao?.token ?? null, sair);

  useEffect(() => {
    if (!sessao) return;
    const falta = new Date(sessao.expiraEm).getTime() - Date.now();
    const timer = setTimeout(sair, Math.max(falta, 0));
    return () => clearTimeout(timer);
  }, [sessao]);

  function entrar(r: LoginResposta) {
    const nova = { token: r.token, expiraEm: r.expiraEm, barbeariaNome: r.barbeariaNome, adminNome: r.adminNome };
    usarToken(nova.token);   // vale já para as próximas chamadas
    guardar(nova);
    setSessao(nova);
  }

  function renomearBarbearia(nome: string) {
    if (!sessao) return;
    const nova = { ...sessao, barbeariaNome: nome };
    guardar(nova);
    setSessao(nova);
  }

  return <Contexto.Provider value={{ sessao, entrar, sair, renomearBarbearia }}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useSessao precisa estar dentro do ProvedorSessao");
  return ctx;
}

// Sem login, redireciona para a tela de entrar.
export function SoAdmin({ children }: { children: ReactNode }) {
  const { sessao } = useSessao();
  const local = useLocation();
  if (!sessao) return <Navigate to="/admin/entrar" replace state={{ voltarPara: local.pathname }} />;
  return children;
}
