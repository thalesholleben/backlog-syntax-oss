"use client";

import { OwnerAvatar } from "@/components/backlog/owner-avatar";
import {
  AGE_BANDS,
  type AgedTask,
  COLUMNS,
  percentile,
  pluralDays,
  STALE_LIMIT_DAYS,
} from "@/lib/backlog/view-model";

/* Sistema de coordenadas do gráfico. O SVG escala junto com o container. */
const W = 720;
const H = 250;
const M = { top: 16, right: 14, bottom: 36, left: 32 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const ownerFill: Record<string, string> = {
  human: "var(--owner-human)",
  agent: "var(--owner-agent)",
  free: "var(--owner-free)",
};

/**
 * Envelhecimento do trabalho em aberto. Uma linha por tarefa não responde "onde
 * está o problema": com 60 tarefas vira uma parede. Aqui cada tarefa é um ponto,
 * a altura é o tempo parada e a coluna é o status em que ela travou, que é o
 * gráfico de aging WIP usado em kanban.
 */
export function BacklogAging({ items }: { items: AgedTask[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-card bg-surface p-5 shadow-card sm:px-6 sm:py-[22px]">
        <AgingHead scale="nada parado" />
        <p className="grid min-h-16 place-items-center rounded-control border-[1.5px] border-dashed border-line px-2.5 py-4 text-center font-mono text-[10px] font-semibold text-faint">
          nenhuma tarefa aberta neste filtro
        </p>
      </section>
    );
  }

  const sortedByAge = [...items].sort((a, b) => b.days - a.days);
  const days = items.map((item) => item.days).sort((a, b) => a - b);
  const median = percentile(days, 0.5);
  const oldest = sortedByAge[0]?.days ?? 0;

  const bands = AGE_BANDS.map((band) => ({
    ...band,
    count: items.filter((item) => item.days >= band.min && item.days <= band.max).length,
  }));

  const lanes = COLUMNS.filter((column) => column.key !== "done");
  /* O domínio nunca encolhe abaixo do limite: ele é a régua, precisa estar sempre à vista. */
  const domainMax = Math.max(STALE_LIMIT_DAYS + 1, ...items.map((item) => item.days));
  const y = (value: number) => M.top + PH - (value / domainMax) * PH;
  const laneWidth = PW / lanes.length;
  const tickStep = Math.max(1, Math.ceil(domainMax / 5));
  const ticks: number[] = [];
  for (let value = 0; value <= domainMax; value += tickStep) ticks.push(value);

  return (
    <section className="rounded-card bg-surface p-5 shadow-card sm:px-6 sm:py-[22px]">
      <AgingHead scale={`mediana ${pluralDays(median)} · mais antiga ${pluralDays(oldest)}`} />

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {bands.map((band) => (
          <div
            key={band.label}
            style={{ borderLeftColor: band.count ? band.color : "var(--line-strong)" }}
            className={`rounded-panel border-l-[3px] bg-panel px-3 py-[11px] ${band.count ? "" : "opacity-50"}`}
          >
            <b
              style={{ color: band.count ? band.color : "var(--faint)" }}
              className="block text-[22px] font-extrabold leading-none tracking-[-0.04em]"
            >
              {band.count}
            </b>
            <span className="mt-1.5 block font-mono text-[9px] font-semibold uppercase leading-[1.4] tracking-[0.1em] text-faint">
              {band.label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_296px]">
        <div className="min-w-0 rounded-panel bg-panel px-1 py-1.5">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full"
            role="img"
            aria-label={`Dispersão de ${items.length} tarefas abertas: a altura é há quantos dias cada uma está parada e a coluna é o status em que ela travou. Mediana de ${pluralDays(median)}.`}
          >
            <title>Envelhecimento das tarefas abertas por status</title>

            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={M.left}
                  y1={y(tick)}
                  x2={W - M.right}
                  y2={y(tick)}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
                <text
                  x={M.left - 7}
                  y={y(tick) + 3.4}
                  textAnchor="end"
                  fill="var(--faint)"
                  className="font-mono text-[9px] font-semibold"
                >
                  {tick}
                </text>
              </g>
            ))}

            {lanes.map((lane, index) => {
              const center = M.left + laneWidth * index + laneWidth / 2;
              const inLane = items.filter((item) => item.task.status === lane.key);
              return (
                <g key={lane.key}>
                  {index ? (
                    <line
                      x1={M.left + laneWidth * index}
                      y1={M.top}
                      x2={M.left + laneWidth * index}
                      y2={M.top + PH}
                      stroke="var(--line)"
                      strokeWidth={1}
                    />
                  ) : null}
                  <text
                    x={center}
                    y={H - 20}
                    textAnchor="middle"
                    fill="var(--muted)"
                    className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em]"
                  >
                    {lane.label}
                  </text>
                  <text
                    x={center}
                    y={H - 7}
                    textAnchor="middle"
                    fill="var(--faint)"
                    className="font-mono text-[8.5px]"
                  >
                    {inLane.length} {inLane.length === 1 ? "tarefa" : "tarefas"}
                  </text>
                  {swarm(inLane, center, laneWidth).map(({ item, cx, cy, r }) => (
                    <circle
                      key={item.task.id}
                      cx={cx}
                      cy={y(cy)}
                      r={r}
                      fill={ownerFill[item.owner]}
                      opacity={0.85}
                    >
                      <title>{`${item.task.title} · parada há ${pluralDays(item.days)}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}

            <line
              x1={M.left}
              y1={y(STALE_LIMIT_DAYS)}
              x2={W - M.right}
              y2={y(STALE_LIMIT_DAYS)}
              stroke="var(--status-blocked)"
              strokeWidth={1.2}
              strokeDasharray="6 4"
            />
            <text
              x={W - M.right}
              y={y(STALE_LIMIT_DAYS) - 5}
              textAnchor="end"
              fill="var(--stale-ink)"
              className="font-mono text-[8.5px] font-bold tracking-[0.06em]"
            >
              {STALE_LIMIT_DAYS}d
            </text>

            <line
              x1={M.left}
              y1={y(median)}
              x2={W - M.right}
              y2={y(median)}
              stroke="var(--faint)"
              strokeWidth={1.2}
              strokeDasharray="2 4"
            />
            <text
              x={W - M.right}
              y={y(median) - 5}
              textAnchor="end"
              fill="var(--faint)"
              className="font-mono text-[8.5px] font-bold tracking-[0.06em]"
            >
              mediana {median}d
            </text>
          </svg>
        </div>

        <div className="rounded-panel bg-panel px-3.5 py-3">
          <p className="mb-2.5 font-mono text-[9px] font-bold uppercase leading-none tracking-[0.12em] text-faint">
            As mais paradas
          </p>
          {sortedByAge.slice(0, 7).map((item) => (
            <div
              key={item.task.id}
              className="flex min-w-0 items-center gap-2.5 border-t border-line-soft py-1.5 first:border-t-0"
            >
              <OwnerAvatar owner={item.owner} className="size-5 text-[8.5px]" />
              <span
                className={`min-w-6 shrink-0 font-mono text-[10.5px] font-extrabold ${
                  item.days > STALE_LIMIT_DAYS ? "text-stale-ink" : "text-muted"
                }`}
              >
                {item.days}d
              </span>
              <span title={item.task.title} className="truncate text-[11.8px] text-muted">
                {item.task.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft pt-3 font-mono text-[10px] font-semibold tracking-[0.04em] text-faint">
        <span className="inline-flex items-center gap-[7px]">
          <i className="block size-2 rounded-full bg-owner-human" />
          Pessoas
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="block size-2 rounded-full bg-owner-agent" />
          Agentes
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="block size-2 rounded-full bg-owner-free" />
          Livres
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="block w-4 border-t-[1.5px] border-dashed border-faint" />
          mediana
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <i className="block w-4 border-t-[1.5px] border-dashed border-status-blocked" />
          limite de {STALE_LIMIT_DAYS} dias
        </span>
        <span className="ml-auto hidden opacity-75 sm:inline">
          passe o mouse num ponto para ver a tarefa
        </span>
      </div>
    </section>
  );
}

function AgingHead({ scale }: { scale: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h2 className="text-[15px] font-extrabold tracking-[-0.03em]">
          Há quanto tempo cada uma está parada
        </h2>
        <p className="mt-1.5 max-w-[660px] text-[11.5px] leading-[1.55] text-muted">
          Só as que não estão concluídas. Cada ponto é uma tarefa: quanto mais alto, há mais tempo
          ela está parada; a coluna mostra em que status ela travou. Acima de {STALE_LIMIT_DAYS}{" "}
          dias a etiqueta do card fica vermelha.
        </p>
      </div>
      <p className="shrink-0 rounded-full bg-panel px-3.5 py-[7px] font-mono text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em] text-faint">
        {scale}
      </p>
    </div>
  );
}

/**
 * Enxame: tarefas com a mesma idade se espalham na horizontal em vez de empilhar
 * no mesmo pixel, que é o que esconde a concentração real de trabalho parado.
 */
function swarm(items: AgedTask[], center: number, laneWidth: number) {
  const byDay = new Map<number, AgedTask[]>();
  for (const item of items) {
    const group = byDay.get(item.days);
    if (group) group.push(item);
    else byDay.set(item.days, [item]);
  }

  const points: { item: AgedTask; cx: number; cy: number; r: number }[] = [];
  for (const [day, group] of byDay) {
    const step = Math.min(12, (laneWidth - 20) / Math.max(1, group.length));
    const radius = Math.max(2.8, Math.min(4.8, step / 2.1));
    const start = center - ((group.length - 1) * step) / 2;
    group.forEach((item, index) => {
      points.push({ item, cx: start + index * step, cy: day, r: radius });
    });
  }
  return points;
}
