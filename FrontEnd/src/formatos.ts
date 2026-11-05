import { URL_API, type DiaSemana, type HorarioFuncionamento, type Status } from "./api";

export const NOME_SITE = "Na Régua";

// Dias na ordem em que aparecem na tela (segunda primeiro).
export const DIAS: { valor: DiaSemana; nome: string; curto: string }[] = [
  { valor: "Monday", nome: "Segunda", curto: "Seg" },
  { valor: "Tuesday", nome: "Terça", curto: "Ter" },
  { valor: "Wednesday", nome: "Quarta", curto: "Qua" },
  { valor: "Thursday", nome: "Quinta", curto: "Qui" },
  { valor: "Friday", nome: "Sexta", curto: "Sex" },
  { valor: "Saturday", nome: "Sábado", curto: "Sáb" },
  { valor: "Sunday", nome: "Domingo", curto: "Dom" },
];

export const STATUS: Record<Status, string> = {
  Confirmado: "Confirmado",
  Concluido: "Concluído",
  Cancelado: "Cancelado",
  NaoCompareceu: "Não compareceu",
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const dinheiro = (valor: number) => moeda.format(valor);

// "2026-11-03" vira uma data local (sem o fuso mudar o dia).
function paraData(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export const dataLonga = (iso: string) =>
  paraData(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export const diaDaSemanaCurto = (iso: string) =>
  paraData(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

export const diaDoMes = (iso: string) => paraData(iso).getDate();

export function hojeIso() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

export function duracao(minutos: number) {
  const h = Math.floor(minutos / 60), m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

// As fotos vêm como "/uploads/abc.jpg"; o endereço completo é o da API.
export function urlDaFoto(caminho: string | null) {
  return caminho && caminho.startsWith("/uploads/") ? URL_API + caminho : undefined;
}

export function enderecoCompleto(b: { endereco: string | null; bairro: string | null; cidade: string | null }) {
  return [b.endereco, b.bairro, b.cidade].filter(Boolean).join(" · ");
}

// Junta dias seguidos com o mesmo horário: "Seg a Sáb, 18:00 às 21:00".
export function resumoDosHorarios(horarios: HorarioFuncionamento[]) {
  const grupos: { dias: string[]; faixa: string }[] = [];
  let anterior = -2;
  for (const [i, dia] of DIAS.entries()) {
    const h = horarios.find((x) => x.diaSemana === dia.valor);
    if (!h) continue;
    const faixa = `${h.abertura} às ${h.fechamento}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.faixa === faixa && anterior === i - 1) ultimo.dias.push(dia.curto);
    else grupos.push({ dias: [dia.curto], faixa });
    anterior = i;
  }
  return grupos.map((g) => {
    const dias = g.dias.length > 2 ? `${g.dias[0]} a ${g.dias[g.dias.length - 1]}` : g.dias.join(" e ");
    return `${dias}, ${g.faixa}`;
  });
}
