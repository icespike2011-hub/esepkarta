import type { KeyboardEvent, ReactNode } from "react";
import type { EsepTask, Language, SvgItem, TaskVariant } from "../types";

type Props = {
  task: EsepTask;
  variant: TaskVariant;
  language: Language;
  selectedIds?: string[];
  highlightIds?: string[];
  onSelect?: (id: string) => void;
};

function valueOf(item: SvgItem, variant: TaskVariant) {
  return variant.item_values[item.element_id] ?? item.value;
}

function rowState(id: string, selected: string[], highlighted: string[]) {
  return [selected.includes(id) ? "selected" : "", highlighted.includes(id) ? "highlighted" : ""].filter(Boolean).join(" ");
}

export function SvgRenderer({ task, variant, language, selectedIds = [], highlightIds = [], onSelect }: Props) {
  const items = task.svg_spec.items;
  const title = task.svg_spec.title[language];
  const actionable = Boolean(onSelect);
  const activate = (id: string) => onSelect?.(id);
  const keyActivate = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(id);
    }
  };
  const target = (item: SvgItem, body: (item: SvgItem) => ReactNode) => (
    <g
      key={item.element_id}
      className={"svg-target " + rowState(item.element_id, selectedIds, highlightIds) + (actionable ? " actionable" : "")}
      role={actionable ? "button" : undefined}
      tabIndex={actionable ? 0 : undefined}
      aria-label={item.label[language] + ": " + valueOf(item, variant) + " " + item.unit}
      aria-pressed={actionable ? selectedIds.includes(item.element_id) : undefined}
      onClick={() => activate(item.element_id)}
      onKeyDown={event => keyActivate(event, item.element_id)}
    >
      {body(item)}
    </g>
  );
  const table = () => (
    <svg className="task-svg" viewBox={"0 0 700 " + Math.max(430, 118 + items.length * 43)} role="img" aria-label={title}>
      <text className="svg-title" x="24" y="34">{title}</text>
      <text className="svg-subtitle" x="24" y="57">{language === "ru" ? "Выберите строки, нужные для ответа" : "Жауапқа қажет жолдарды таңдаңыз"}</text>
      <g className="svg-table-head">
        <rect x="20" y="75" width="660" height="34" rx="8" />
        <text x="34" y="97">{language === "ru" ? "Данные" : "Деректер"}</text>
        <text x="542" y="97">{language === "ru" ? "Значение" : "Мәні"}</text>
      </g>
      {items.map(item => target(item, () => {
        const y = 115 + items.indexOf(item) * 43;
        return <>
          <rect className="svg-row-bg" x="20" y={y} width="660" height="38" rx="8" />
          <text className="svg-row-label" x="35" y={y + 24}>{item.label[language]}</text>
          <text className="svg-row-value" x="545" y={y + 24}>{String(valueOf(item, variant))} {item.unit}</text>
          {selectedIds.includes(item.element_id) && <text className="svg-check" x="657" y={y + 24}>✓</text>}
        </>;
      }))}
      <text className="svg-footnote" x="24" y={128 + items.length * 43}>{task.svg_spec.footnote[language]}</text>
    </svg>
  );

  const floorPlan = () => {
    const length = items.find(item => item.element_id === task.svg_spec.floor_plan?.length_id);
    const width = items.find(item => item.element_id === task.svg_spec.floor_plan?.width_id);
    const remainder = items.filter(item => item !== length && item !== width);
    return (
      <svg className="task-svg" viewBox="0 0 700 440" role="img" aria-label={title}>
        <text className="svg-title" x="24" y="34">{title}</text>
        <text className="svg-subtitle" x="24" y="57">{language === "ru" ? "Нажмите на размер или подпись, чтобы выбрать данные" : "Деректі таңдау үшін өлшемді не жазуды басыңыз"}</text>
        <path className="plan-outline" d="M190 101 L468 101 L468 235 L190 235 Z" />
        <path className="plan-grid" d="M260 101V235M329 101V235M398 101V235M190 168H468" />
        <text className="plan-center" x="329" y="160" textAnchor="middle">{task.svg_spec.floor_plan?.label[language]}</text>
        {length && target(length, item => <>
          <path className="dimension-line" d="M190 82H468 M190 74V91 M468 74V91" />
          <rect className="dimension-tag" x="284" y="65" width="90" height="31" rx="10" />
          <text className="dimension-text" x="329" y="86" textAnchor="middle">{String(valueOf(item, variant))} {item.unit}</text>
        </>)}
        {width && target(width, item => <>
          <path className="dimension-line" d="M169 101V235 M161 101H178 M161 235H178" />
          <rect className="dimension-tag" x="103" y="150" width="66" height="34" rx="10" />
          <text className="dimension-text" x="136" y="172" textAnchor="middle">{String(valueOf(item, variant))} {item.unit}</text>
        </>)}
        <text className="svg-caption" x="190" y="263">{language === "ru" ? "Схема не в масштабе" : "Сызба масштабпен берілмеген"}</text>
        <text className="svg-footnote" x="24" y="294">{task.svg_spec.footnote[language]}</text>
        {remainder.map((item, index) => target(item, () => {
          const x = 24 + (index % 2) * 330;
          const y = 315 + Math.floor(index / 2) * 47;
          return <>
            <rect className="svg-row-bg" x={x} y={y} width="310" height="39" rx="10" />
            <text className="svg-row-label" x={x + 12} y={y + 17}>{item.label[language]}</text>
            <text className="svg-row-value small" x={x + 12} y={y + 33}>{String(valueOf(item, variant))} {item.unit}</text>
          </>;
        }))}
      </svg>
    );
  };

  const chart = () => {
    const chartSpec = task.svg_spec.chart;
    if (!chartSpec) return table();
    const left = 74;
    const top = 70;
    const plotWidth = 570;
    const plotHeight = 190;
    const max = chartSpec.max_value;
    const yFor = (value: number) => top + plotHeight - (value / max) * plotHeight;
    const points = chartSpec.points.map((id, index) => {
      const item = items.find(candidate => candidate.element_id === id);
      return item ? { item, x: left + index * (plotWidth / Math.max(1, chartSpec.points.length - 1)), y: yFor(Number(valueOf(item, variant))) } : null;
    }).filter((point): point is { item: SvgItem; x: number; y: number } => Boolean(point));
    const limit = items.find(item => item.element_id === "limit");
    const otherItems = items.filter(item => !chartSpec.points.includes(item.element_id));
    const chartPath = points.map((point, index) => (index ? "L" : "M") + point.x + " " + point.y).join(" ");
    return (
      <svg className="task-svg" viewBox="0 0 700 460" role="img" aria-label={title}>
        <text className="svg-title" x="24" y="34">{title}</text>
        {[0, 1, 2, 3].map(index => {
          const y = top + (plotHeight / 3) * index;
          const value = Math.round(max * (1 - index / 3));
          return <g key={index}><path className="chart-grid" d={"M" + left + " " + y + "H" + (left + plotWidth)} /><text className="chart-tick" x="28" y={y + 4}>{value}</text></g>;
        })}
        <text className="chart-axis-label" x="24" y="62">{chartSpec.y_label[language]}</text>
        {limit && <>
          <path className={"limit-line " + rowState(limit.element_id, selectedIds, highlightIds)} d={"M" + left + " " + yFor(Number(valueOf(limit, variant))) + "H" + (left + plotWidth)} />
          <text className="limit-label" x={left + plotWidth - 4} y={yFor(Number(valueOf(limit, variant))) - 7} textAnchor="end">{language === "ru" ? "норма" : "норма"} {valueOf(limit, variant)}</text>
        </>}
        <path className="chart-line" d={chartPath} />
        {points.map(point => target(point.item, item => <>
          <circle className="chart-point" cx={point.x} cy={point.y} r={selectedIds.includes(item.element_id) ? 9 : 7} />
          <text className="chart-value" x={point.x} y={point.y - 14} textAnchor="middle">{valueOf(item, variant)}</text>
          <text className="chart-month" x={point.x} y={top + plotHeight + 24} textAnchor="middle">{item.label[language]}</text>
        </>))}
        <text className="chart-axis-label" x={left + plotWidth / 2} y={top + plotHeight + 48} textAnchor="middle">{chartSpec.x_label[language]}</text>
        <text className="svg-footnote" x="24" y="326">{task.svg_spec.footnote[language]}</text>
        {otherItems.map((item, index) => target(item, () => {
          const x = 24 + (index % 2) * 330;
          const y = 344 + Math.floor(index / 2) * 42;
          return <>
            <rect className="svg-row-bg" x={x} y={y} width="310" height="35" rx="9" />
            <text className="svg-row-label small" x={x + 12} y={y + 14}>{item.label[language]}</text>
            <text className="svg-row-value small" x={x + 12} y={y + 30}>{String(valueOf(item, variant))} {item.unit}</text>
          </>;
        }))}
      </svg>
    );
  };

  if (task.svg_type === "floor_plan") return floorPlan();
  if (task.svg_type === "line_chart") return chart();
  return table();
}
