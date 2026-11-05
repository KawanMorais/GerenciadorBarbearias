import { primeiroNome, urlDaFoto } from "../formatos";

interface Props { nome: string; foto: string | null; tamanho?: "p" | "m" | "g" }

// Foto em círculo; sem foto, mostra as iniciais.
export function Avatar({ nome, foto, tamanho = "m" }: Props) {
  const url = urlDaFoto(foto);
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  return (
    <span className={`avatar avatar-${tamanho}`}>
      {url ? <img src={url} alt={`Foto de ${primeiroNome(nome)}`} /> : <span aria-hidden="true">{iniciais}</span>}
    </span>
  );
}
