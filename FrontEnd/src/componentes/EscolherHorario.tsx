import { useEffect, useState } from "react";
import { api, textoDoErro, type Dia, type Profissional } from "../api";
import { diaDaSemanaCurto, diaDoMes, primeiroNome } from "../formatos";
import { Avatar } from "./Avatar";
import { Carregando, Erro } from "./Mensagem";

export interface Escolha { profissional: Profissional; data: string; hora: string }

interface Props {
  barbeariaId: number;
  servicoId: number;
  aoEscolher: (escolha: Escolha) => void;
  profissionalInicial?: number;
  remarcando?: string;   // código do agendamento que está sendo remarcado
}

// Escolha de dia, profissional e horário (agendar e remarcar).
export function EscolherHorario({ barbeariaId, servicoId, aoEscolher, profissionalInicial, remarcando }: Props) {
  const [dias, setDias] = useState<Dia[]>([]);
  const [dia, setDia] = useState("");
  const [profissionais, setProfissionais] = useState<Profissional[] | null>(null);
  const [selecionado, setSelecionado] = useState<number | undefined>(profissionalInicial);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.dias(barbeariaId)
      .then((lista) => {
        setDias(lista);
        setDia(lista.find((d) => d.aberto)?.data ?? "");
      })
      .catch((e) => setErro(textoDoErro(e)));
  }, [barbeariaId]);

  useEffect(() => {
    if (!dia) return;
    let atual = true;   // ignora a resposta se o cliente já trocou de dia
    setErro("");
    setProfissionais(null);
    api.horarios(barbeariaId, servicoId, dia, remarcando)
      .then((lista) => {
        if (!atual) return;
        setProfissionais(lista);
        if (lista.length === 1) setSelecionado(lista[0].id);
      })
      .catch((e) => atual && setErro(textoDoErro(e)));
    return () => { atual = false; };
  }, [barbeariaId, servicoId, dia, remarcando]);

  const escolhido = profissionais?.find((p) => p.id === selecionado);

  // Erro nos horários aparece só na parte dos profissionais.
  if (erro && dias.length === 0) return <Erro texto={erro} />;
  if (dias.length > 0 && !dias.some((d) => d.aberto))
    return <p className="vazio">A barbearia não tem dias abertos para agendamento no momento.</p>;

  return (
    <div className="escolher-horario">
      <section aria-labelledby="titulo-dia">
        <h3 id="titulo-dia" className="rotulo-secao">Dia</h3>
        <div className="faixa-dias">
          {dias.map((d) => (
            <button
              key={d.data}
              type="button"
              className="dia"
              disabled={!d.aberto}
              aria-pressed={d.data === dia}
              aria-label={d.aberto ? undefined : `${diaDaSemanaCurto(d.data)} ${diaDoMes(d.data)}, fechado`}
              onClick={() => setDia(d.data)}
            >
              <span className="dia-semana">{diaDaSemanaCurto(d.data)}</span>
              <span className="dia-numero">{diaDoMes(d.data)}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-profissional">
        <h3 id="titulo-profissional" className="rotulo-secao">Profissional</h3>
        {erro ? (
          <Erro texto={erro} />
        ) : !profissionais ? (
          <Carregando />
        ) : profissionais.length === 0 ? (
          <p className="vazio">Nenhum profissional faz este serviço no momento.</p>
        ) : (
          <ul className="profissionais">
            {profissionais.map((p) => (
              <li key={p.id}>
                <button type="button" className="profissional" aria-pressed={p.id === selecionado} onClick={() => setSelecionado(p.id)}>
                  <Avatar nome={p.nome} foto={p.fotoUrl} tamanho="g" />
                  <span className="profissional-nome">{primeiroNome(p.nome)}</span>
                  <span className="profissional-livres">
                    {p.livres === 0 ? "sem horário" : p.livres === 1 ? "1 livre" : `${p.livres} livres`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {escolhido && (
        <section aria-labelledby="titulo-horarios" className="horarios">
          <h3 id="titulo-horarios" className="rotulo-secao">Horários de {primeiroNome(escolhido.nome)}</h3>
          {escolhido.livres === 0 ? (
            <p className="vazio">Não tem horário livre neste dia. Toque em outro profissional ou escolha outro dia.</p>
          ) : (
            <>
              <div className="grade-horarios">
                {escolhido.horarios.map((h) => (
                  <button
                    key={h.hora}
                    type="button"
                    className="horario"
                    disabled={!h.livre}
                    aria-label={h.livre ? undefined : `${h.hora}, ocupado`}
                    onClick={() => aoEscolher({ profissional: escolhido, data: dia, hora: h.hora })}
                  >
                    {h.hora}
                  </button>
                ))}
              </div>
              <p className="dica">Horários riscados já estão ocupados.</p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
