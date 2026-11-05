import { useEffect, useState, type FormEvent } from "react";
import { api, textoDoErro, type DiaSemana } from "../../api";
import { DIAS } from "../../formatos";
import { Carregando, Erro, Sucesso } from "../../componentes/Mensagem";

type Dia = { aberto: boolean; abertura: string; fechamento: string };

// Horário de funcionamento + regras para o cliente marcar.
export function Horarios() {
  const [dias, setDias] = useState<Record<DiaSemana, Dia> | null>(null);
  const [antecedencia, setAntecedencia] = useState(1);
  const [agendaAberta, setAgendaAberta] = useState(30);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    api.meusHorarios()
      .then((h) => {
        const mapa = {} as Record<DiaSemana, Dia>;
        for (const d of DIAS) {
          const atual = h.dias.find((x) => x.diaSemana === d.valor);
          mapa[d.valor] = { aberto: !!atual, abertura: atual?.abertura ?? "09:00", fechamento: atual?.fechamento ?? "18:00" };
        }
        setDias(mapa);
        setAntecedencia(h.antecedenciaMinimaHoras);
        setAgendaAberta(h.diasAgendaAberta);
      })
      .catch((e) => setErro(textoDoErro(e)));
  }, []);

  if (!dias) return erro ? <Erro texto={erro} /> : <Carregando />;

  const mudar = (dia: DiaSemana, mudanca: Partial<Dia>) => setDias({ ...dias, [dia]: { ...dias[dia], ...mudanca } });

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!dias) return;
    setErro("");
    setSucesso("");
    setSalvando(true);
    try {
      await api.salvarHorarios({
        dias: DIAS.filter((d) => dias[d.valor].aberto)
          .map((d) => ({ diaSemana: d.valor, abertura: dias[d.valor].abertura, fechamento: dias[d.valor].fechamento })),
        antecedenciaMinimaHoras: antecedencia,
        diasAgendaAberta: agendaAberta,
      });
      setSucesso("Horários salvos.");
    } catch (falha) {
      setErro(textoDoErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <header className="painel-titulo">
        <h1>Horários</h1>
      </header>

      <form className="formulario" onSubmit={salvar}>
        <section className="cartao">
          <h2>Funcionamento</h2>
          <p className="dica">Os horários são divididos em blocos de 30 minutos, a partir da abertura.</p>
          <table className="tabela tabela-compacta">
            <tbody>
              {DIAS.map((d) => {
                const dia = dias[d.valor];
                return (
                  <tr key={d.valor}>
                    <th scope="row">
                      <label className="marcar">
                        <input type="checkbox" checked={dia.aberto} onChange={(e) => mudar(d.valor, { aberto: e.target.checked })} />
                        <span>{d.nome}</span>
                      </label>
                    </th>
                    <td>
                      {dia.aberto ? (
                        <span className="faixa-horas">
                          <input type="time" step={1800} required aria-label={`${d.nome}, abre às`}
                            value={dia.abertura} onChange={(e) => mudar(d.valor, { abertura: e.target.value })} />
                          <span>às</span>
                          <input type="time" step={1800} required aria-label={`${d.nome}, fecha às`}
                            value={dia.fechamento} onChange={(e) => mudar(d.valor, { fechamento: e.target.value })} />
                        </span>
                      ) : (
                        <span className="suave">Fechado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="cartao">
          <h2>Regras para o cliente marcar</h2>
          <p className="frase-com-campo">
            O cliente precisa marcar com pelo menos
            <input type="number" min={0} max={72} required aria-label="Horas de antecedência"
              value={antecedencia} onChange={(e) => setAntecedencia(Number(e.target.value))} />
            hora(s) de antecedência.
          </p>
          <p className="frase-com-campo">
            O cliente pode marcar horários até
            <input type="number" min={1} max={180} required aria-label="Dias de agenda aberta"
              value={agendaAberta} onChange={(e) => setAgendaAberta(Number(e.target.value))} />
            dia(s) à frente.
          </p>
          <p className="dica">O cliente pode cancelar ou remarcar a qualquer momento antes do horário.</p>
        </section>

        <Erro texto={erro} />
        <Sucesso texto={sucesso} />
        <button type="submit" className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar horários"}</button>
      </form>
    </>
  );
}
