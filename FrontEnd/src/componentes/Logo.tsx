import { urlDaFoto } from "../formatos";

// Logo quadrada da barbearia; sem logo, mostra a primeira letra do nome.
export function Logo({ nome, url, grande }: { nome: string; url: string | null; grande?: boolean }) {
  const src = urlDaFoto(url);
  return (
    <span className={grande ? "logo logo-g" : "logo"}>
      {src ? <img src={src} alt={`Logo da ${nome}`} /> : <span aria-hidden="true">{nome[0]?.toUpperCase()}</span>}
    </span>
  );
}
