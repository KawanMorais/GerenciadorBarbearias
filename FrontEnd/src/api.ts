// Tipos do JSON e uma função por rota da API.

// Em produção o site é servido pela própria API, então o caminho é relativo.
export const URL_API: string = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:5222" : "");

// ---------- Tipos (espelham os DTOs do back-end) ----------

export type DiaSemana = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type Status = "Confirmado" | "Concluido" | "Cancelado" | "NaoCompareceu";

export interface HorarioFuncionamento { diaSemana: DiaSemana; abertura: string; fechamento: string }

export interface BarbeariaResumo {
  id: number; nome: string; logoUrl: string | null;
  endereco: string | null; bairro: string | null; cidade: string | null;
  horarios: HorarioFuncionamento[];
}

export interface Pagina<T> { itens: T[]; pagina: number; temMais: boolean }

export interface ServicoPublico { id: number; nome: string; descricao: string | null; preco: number; duracaoMinutos: number }
export interface FuncionarioPublico { id: number; nome: string; fotoUrl: string | null; servicoIds: number[] }

export interface BarbeariaDetalhe {
  id: number; nome: string; descricao: string | null; logoUrl: string | null; capaUrl: string | null;
  endereco: string | null; bairro: string | null; cidade: string | null; telefone: string | null;
  antecedenciaMinimaHoras: number; diasAgendaAberta: number;
  horarios: HorarioFuncionamento[]; servicos: ServicoPublico[]; equipe: FuncionarioPublico[];
}

export interface Dia { data: string; aberto: boolean }
export interface Horario { hora: string; livre: boolean }
export interface Profissional { id: number; nome: string; fotoUrl: string | null; livres: number; horarios: Horario[] }

export interface Agendamento {
  id: number; codigo: string; status: Status;
  barbeariaId: number; barbeariaNome: string; barbeariaEndereco: string | null;
  servicoId: number; servicoNome: string; duracaoMinutos: number; preco: number;
  funcionarioId: number; funcionarioNome: string; funcionarioFotoUrl: string | null;
  data: string; horaInicio: string; horaFim: string;
  clienteNome: string; clienteEmail: string | null;
}

export interface NovoAgendamento {
  servicoId: number; funcionarioId: number; data: string; hora: string;
  nome: string; email: string | null; aceiteDados: boolean;
}

export interface NovoHorario { funcionarioId: number; data: string; hora: string }

export interface LoginResposta { token: string; expiraEm: string; barbeariaId: number; barbeariaNome: string; adminNome: string }

export interface Cadastro {
  adminNome: string; email: string; senha: string; confirmarSenha: string;
  barbeariaNome: string; documento: string; endereco: string; bairro: string; cidade: string; telefone: string;
}

export interface MinhaBarbearia {
  id: number; nome: string; documento: string | null; descricao: string | null;
  endereco: string | null; bairro: string | null; cidade: string | null; telefone: string | null;
  logoUrl: string | null; capaUrl: string | null; ativa: boolean;
  antecedenciaMinimaHoras: number; diasAgendaAberta: number; visivelNaBusca: boolean; pendencias: string[];
}

export type DadosBarbearia = Pick<MinhaBarbearia,
  "nome" | "documento" | "descricao" | "endereco" | "bairro" | "cidade" | "telefone" | "ativa">;

export interface Horarios { dias: HorarioFuncionamento[]; antecedenciaMinimaHoras: number; diasAgendaAberta: number }

export interface ServicoAdmin { id: number; nome: string; descricao: string | null; preco: number; duracaoMinutos: number; ativo: boolean }
export type DadosServico = Omit<ServicoAdmin, "id">;

export interface Disponibilidade { diaSemana: DiaSemana; inicio: string; fim: string }
export interface FuncionarioAdmin {
  id: number; nome: string; fotoUrl: string | null; telefone: string | null; especialidades: string | null;
  ativo: boolean; servicoIds: number[]; disponibilidades: Disponibilidade[];
}
export type DadosFuncionario = Omit<FuncionarioAdmin, "id" | "fotoUrl">;

export interface Inicio {
  data: string; agendamentosHoje: number; proximosAtendimentos: number;
  faturamentoEstimado: number; cancelamentos: number; agendamentos: Agendamento[];
}

// ---------- Token do admin ----------
// Token em memória (gerenciado pelo auth.tsx), enviado só às rotas do painel.

let token: string | null = null;
let aoPerderSessao: () => void = () => {};

export function usarToken(novo: string | null, quandoExpirar?: () => void) {
  token = novo;
  if (quandoExpirar) aoPerderSessao = quandoExpirar;
}

// ---------- Chamada genérica ----------

export class ErroApi extends Error {
  constructor(mensagem: string, public status: number) {
    super(mensagem);
  }
}

function precisaDeToken(caminho: string) {
  return caminho.startsWith("/api/admin") || caminho === "/api/auth/senha";
}

// Erros vêm como { mensagem } ou { errors: { Campo: [...] } }.
function mensagemDoErro(status: number, dados: unknown): string {
  if (status === 429) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (dados && typeof dados === "object") {
    const d = dados as { mensagem?: string; errors?: Record<string, string[]> };
    if (d.mensagem) return d.mensagem;
    const primeiro = d.errors && Object.values(d.errors)[0]?.[0];
    if (primeiro) return primeiro;
  }
  if (status === 401) return "Sua sessão expirou. Entre de novo.";
  if (status === 404) return "Não encontrado.";
  return `Algo deu errado (erro ${status}). Tente de novo.`;
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (corpo instanceof FormData) {
    body = corpo;   // o navegador define o Content-Type
  } else if (corpo !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(corpo);
  }

  const comToken = precisaDeToken(caminho) && token !== null;
  if (comToken) headers.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(URL_API + caminho, { method: metodo, headers, body });
  } catch {
    throw new ErroApi("Não foi possível falar com o servidor. Confira sua internet ou se a API está rodando.", 0);
  }

  if (resposta.status === 204) return undefined as T;
  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (resposta.status === 401 && comToken) aoPerderSessao();
    throw new ErroApi(mensagemDoErro(resposta.status, dados), resposta.status);
  }
  return dados as T;
}

const q = encodeURIComponent;

function enviarImagem(caminho: string, arquivo: File) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return chamar<{ url: string }>("POST", caminho, form);
}

// ---------- Rotas ----------

export const api = {
  // Área do cliente
  buscarBarbearias: (busca: string, pagina = 1) =>
    chamar<Pagina<BarbeariaResumo>>("GET", `/api/barbearias?busca=${q(busca)}&pagina=${pagina}`),
  barbearia: (id: number) => chamar<BarbeariaDetalhe>("GET", `/api/barbearias/${id}`),
  dias: (id: number) => chamar<Dia[]>("GET", `/api/barbearias/${id}/dias`),
  // "remarcando": código cujo horário atual aparece livre.
  horarios: (id: number, servicoId: number, data: string, remarcando?: string) =>
    chamar<Profissional[]>("GET", `/api/barbearias/${id}/horarios?servicoId=${servicoId}&data=${q(data)}`
      + (remarcando ? `&remarcando=${q(remarcando)}` : "")),
  agendar: (id: number, dados: NovoAgendamento) => chamar<Agendamento>("POST", `/api/barbearias/${id}/agendamentos`, dados),
  consultar: (codigo: string, nome: string) => chamar<Agendamento>("POST", "/api/agendamentos/consultar", { codigo, nome }),
  cancelar: (codigo: string, nome: string) => chamar<Agendamento>("POST", `/api/agendamentos/${q(codigo)}/cancelar`, { nome }),
  remarcar: (codigo: string, nome: string, novo: NovoHorario) =>
    chamar<Agendamento>("POST", `/api/agendamentos/${q(codigo)}/remarcar`, { nome, ...novo }),

  // Login
  cadastrar: (dados: Cadastro) => chamar<LoginResposta>("POST", "/api/auth/cadastro", dados),
  entrar: (email: string, senha: string) => chamar<LoginResposta>("POST", "/api/auth/login", { email, senha }),
  esqueciSenha: (email: string) => chamar<{ mensagem: string }>("POST", "/api/auth/esqueci-senha", { email }),
  redefinirSenha: (tokenLink: string, novaSenha: string) =>
    chamar<{ mensagem: string }>("POST", "/api/auth/redefinir-senha", { token: tokenLink, novaSenha }),
  alterarSenha: (senhaAtual: string, novaSenha: string) =>
    chamar<{ mensagem: string }>("PUT", "/api/auth/senha", { senhaAtual, novaSenha }),

  // Painel
  inicio: (data: string) => chamar<Inicio>("GET", `/api/admin/inicio?data=${q(data)}`),
  mudarStatus: (id: number, status: Status) => chamar<Agendamento>("PATCH", `/api/admin/agendamentos/${id}/status`, { status }),
  remarcarAdmin: (id: number, novo: NovoHorario) => chamar<Agendamento>("POST", `/api/admin/agendamentos/${id}/remarcar`, novo),
  apagarDadosCliente: (id: number) => chamar<Agendamento>("DELETE", `/api/admin/agendamentos/${id}/dados-cliente`),

  servicos: () => chamar<ServicoAdmin[]>("GET", "/api/admin/servicos"),
  criarServico: (dados: DadosServico) => chamar<ServicoAdmin>("POST", "/api/admin/servicos", dados),
  editarServico: (id: number, dados: DadosServico) => chamar<ServicoAdmin>("PUT", `/api/admin/servicos/${id}`, dados),
  ativarServico: (id: number, ativo: boolean) => chamar<ServicoAdmin>("PATCH", `/api/admin/servicos/${id}/ativo`, { ativo }),
  excluirServico: (id: number) => chamar<void>("DELETE", `/api/admin/servicos/${id}`),

  funcionarios: () => chamar<FuncionarioAdmin[]>("GET", "/api/admin/funcionarios"),
  criarFuncionario: (dados: DadosFuncionario) => chamar<FuncionarioAdmin>("POST", "/api/admin/funcionarios", dados),
  editarFuncionario: (id: number, dados: DadosFuncionario) =>
    chamar<FuncionarioAdmin>("PUT", `/api/admin/funcionarios/${id}`, dados),
  ativarFuncionario: (id: number, ativo: boolean) =>
    chamar<FuncionarioAdmin>("PATCH", `/api/admin/funcionarios/${id}/ativo`, { ativo }),
  excluirFuncionario: (id: number) => chamar<void>("DELETE", `/api/admin/funcionarios/${id}`),
  fotoFuncionario: (id: number, arquivo: File) => enviarImagem(`/api/admin/funcionarios/${id}/foto`, arquivo),

  meusHorarios: () => chamar<Horarios>("GET", "/api/admin/horarios"),
  salvarHorarios: (dados: Horarios) => chamar<Horarios>("PUT", "/api/admin/horarios", dados),

  minhaBarbearia: () => chamar<MinhaBarbearia>("GET", "/api/admin/barbearia"),
  salvarBarbearia: (dados: DadosBarbearia) => chamar<MinhaBarbearia>("PUT", "/api/admin/barbearia", dados),
  enviarLogo: (arquivo: File) => enviarImagem("/api/admin/barbearia/logo", arquivo),
  enviarCapa: (arquivo: File) => enviarImagem("/api/admin/barbearia/capa", arquivo),
};

// Mensagem amigável de qualquer erro, para mostrar na tela.
export function textoDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : "Algo deu errado. Tente de novo.";
}
