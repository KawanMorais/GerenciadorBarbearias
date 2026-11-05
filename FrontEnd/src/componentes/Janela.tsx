import { useEffect, useRef, type ReactNode } from "react";

interface Props { titulo: string; aoFechar: () => void; children: ReactNode }

// Janela modal com <dialog> (foco e Esc já tratados pelo navegador).
export function Janela({ titulo, aoFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  return (
    <dialog ref={ref} className="janela" aria-label={titulo} onClose={aoFechar}>
      <header className="janela-topo">
        <h2>{titulo}</h2>
        <button type="button" className="botao-icone" onClick={() => ref.current?.close()} aria-label="Fechar">×</button>
      </header>
      {children}
    </dialog>
  );
}
