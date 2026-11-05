import type { Agendamento } from "./api";

// Agendamentos lembrados neste navegador (código, nome e resumo), no localStorage.

export interface Lembrado { codigo: string; nome: string; barbearia: string; servico: string; data: string; hora: string }

const CHAVE = "agendamentos-lembrados";

export function listarLembrados(): Lembrado[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvar(lista: Lembrado[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // sem armazenamento: o cliente usa código + nome
  }
}

export function lembrar(a: Agendamento, nome: string) {
  const item = {
    codigo: a.codigo, nome, barbearia: a.barbeariaNome, servico: a.servicoNome, data: a.data, hora: a.horaInicio,
  };
  salvar([item, ...listarLembrados().filter((x) => x.codigo !== a.codigo)]);
}

export function esquecer(codigo: string) {
  salvar(listarLembrados().filter((x) => x.codigo !== codigo));
}

export const estaLembrado = (codigo: string) => listarLembrados().some((x) => x.codigo === codigo);

// Atualiza data/hora depois de remarcar; tira da lista se foi cancelado.
export function atualizarLembrado(a: Agendamento) {
  if (!estaLembrado(a.codigo)) return;
  if (a.status === "Cancelado") return esquecer(a.codigo);
  salvar(listarLembrados().map((x) => (x.codigo === a.codigo ? { ...x, data: a.data, hora: a.horaInicio } : x)));
}

export function lembradosFuturos() {
  const agora = new Date();
  return listarLembrados().filter((x) => new Date(`${x.data}T${x.hora}`) > agora);
}
