// Avisos de erro, sucesso e carregando.

export function Erro({ texto }: { texto: string }) {
  return texto ? <p className="aviso aviso-erro" role="alert">{texto}</p> : null;
}

export function Sucesso({ texto }: { texto: string }) {
  return texto ? <p className="aviso aviso-ok" role="status">{texto}</p> : null;
}

export function Carregando() {
  return <p className="carregando" role="status">Carregando…</p>;
}
