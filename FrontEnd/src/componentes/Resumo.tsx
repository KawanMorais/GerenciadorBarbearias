import { dataLonga, dinheiro, duracao } from "../formatos";
import { Avatar } from "./Avatar";

interface Props {
  barbearia: string;
  servico: string;
  duracaoMinutos: number;
  preco: number;
  profissional: string;
  fotoProfissional: string | null;
  data: string;
  hora: string;
}

// Resumo do agendamento.
export function Resumo(p: Props) {
  return (
    <dl className="resumo">
      <div><dt>Barbearia</dt><dd>{p.barbearia}</dd></div>
      <div><dt>Serviço</dt><dd>{p.servico} <span className="suave">({duracao(p.duracaoMinutos)})</span></dd></div>
      <div>
        <dt>Profissional</dt>
        <dd className="resumo-profissional"><Avatar nome={p.profissional} foto={p.fotoProfissional} tamanho="p" /> {p.profissional}</dd>
      </div>
      <div><dt>Quando</dt><dd>{dataLonga(p.data)}, às {p.hora}</dd></div>
      <div><dt>Valor</dt><dd>{dinheiro(p.preco)} <span className="suave">(pago na barbearia)</span></dd></div>
    </dl>
  );
}
