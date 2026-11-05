import { useEffect, useState, type ChangeEvent } from "react";
import { urlDaFoto } from "../formatos";

interface Props {
  id: string;
  rotulo: string;
  atual: string | null;          // caminho da imagem que já existe (ex.: "/uploads/abc.jpg")
  aoEscolher: (arquivo: File | null) => void;
  formato?: "redondo" | "quadrado" | "largo";
}

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAXIMO = 2 * 1024 * 1024;   // 2 MB, o mesmo limite da API

// Campo de imagem com prévia (a validação de verdade é na API).
export function CampoImagem({ id, rotulo, atual, aoEscolher, formato = "quadrado" }: Props) {
  const [previa, setPrevia] = useState<string | undefined>(undefined);
  const [erro, setErro] = useState("");

  // Libera a memória da prévia quando ela troca ou o campo some.
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);

  function escolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setErro("");
    if (arquivo && !TIPOS.includes(arquivo.type)) {
      setErro("Use uma imagem JPG, PNG ou WEBP.");
      e.target.value = "";
      return aoEscolher(null);
    }
    if (arquivo && arquivo.size > MAXIMO) {
      setErro("A imagem pode ter no máximo 2 MB.");
      e.target.value = "";
      return aoEscolher(null);
    }
    setPrevia(arquivo ? URL.createObjectURL(arquivo) : undefined);
    aoEscolher(arquivo);
  }

  const mostrar = previa ?? urlDaFoto(atual);

  return (
    <div className="campo-imagem">
      <span className={`previa previa-${formato}`}>
        {mostrar ? <img src={mostrar} alt="" /> : <span aria-hidden="true">sem imagem</span>}
      </span>
      <div>
        <label htmlFor={id}>{rotulo}</label>
        <input id={id} type="file" accept={TIPOS.join(",")} onChange={escolher} aria-describedby={`${id}-dica`} />
        <p id={`${id}-dica`} className={erro ? "dica dica-erro" : "dica"} role={erro ? "alert" : undefined}>
          {erro || "JPG, PNG ou WEBP, até 2 MB."}
        </p>
      </div>
    </div>
  );
}
