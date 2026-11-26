import { useMemo, useState } from "react";
import type { EsepTask, ErrorRule, ErrorType, Language, SyncAttempt, TaskVariant } from "../types";
import { SvgRenderer } from "./SvgRenderer";

type Props = {
  task: EsepTask;
  variant: TaskVariant;
  language: Language;
  onAttempt: (attempt: Omit<SyncAttempt, "attempt_id" | "timestamp" | "status">) => void;
  onNewVariant: () => void;
  onBack: () => void;
};

const errorNames: Record<ErrorType, { ru: string; kz: string }> = {
  missed_footnote: { ru: "Пропущена сноска", kz: "Сілтеме ескерілмеді" },
  distractor_trap: { ru: "Лишние данные", kz: "Артық дерек" },
  unit_mismatch: { ru: "Ошибка единиц", kz: "Өлшем бірлігі қатесі" },
  calculation_error: { ru: "Ошибка вычисления", kz: "Есептеу қатесі" }
};

function fillText(text: string, variant: TaskVariant) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => String(variant.tokens?.[key] ?? ""));
}

function sameItems(left: string[], right: string[]) {
  return left.length === right.length && left.every(value => right.includes(value));
}

function hintFor(task: EsepTask, fallback: ErrorType) {
  return task.error_map.find(rule => rule.error_type === fallback) ?? task.error_map[0];
}

function splitAtTerms(text: string, terms: Array<{ term: string; index: number }>) {
  const result: Array<{ text: string; termIndex?: number }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const searchText = text.toLocaleLowerCase();
    let earliest: { at: number; term: string; index: number } | undefined;
    for (const item of terms) {
      const at = searchText.indexOf(item.term.toLocaleLowerCase(), cursor);
      if (at >= 0 && (!earliest || at < earliest.at)) earliest = { at, term: item.term, index: item.index };
    }
    if (!earliest) {
      result.push({ text: text.slice(cursor) });
      break;
    }
    if (earliest.at > cursor) result.push({ text: text.slice(cursor, earliest.at) });
    result.push({ text: text.slice(earliest.at, earliest.at + earliest.term.length), termIndex: earliest.index });
    cursor = earliest.at + earliest.term.length;
  }
  return result;
}

export function TaskSolver({ task, variant, language, onAttempt, onNewVariant, onBack }: Props) {
  const [step, setStep] = useState(1);
  const [selectedData, setSelectedData] = useState<string[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ rule: ErrorRule; type: ErrorType } | null>(null);
  const [complete, setComplete] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const needed = useMemo(() => task.svg_spec.items.filter(item => item.is_needed).map(item => item.element_id), [task]);
  const filledStory = fillText(task.story[language], variant);
  const correctConclusionId = variant.correct_conclusion_id;

  function logError(type: ErrorType) {
    onAttempt({ task_id: task.task_id, is_correct: false, error_type: type });
  }

  function saveReport(event: React.FormEvent) {
    event.preventDefault();
    const message = reportText.trim();
    if (!message) return;
    try {
      const key = "esepkarta-task-reports";
      const reports = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{ task_id: string; message: string; timestamp: string; status: string }>;
      reports.push({ task_id: task.task_id, message: message.slice(0, 1000), timestamp: new Date().toISOString(), status: "pending" });
      localStorage.setItem(key, JSON.stringify(reports));
      setReportText("");
      setReportNotice(language === "ru" ? "Сообщение сохранено на устройстве; онлайн-отправка пока не настроена." : "Хабарлама құрылғыда сақталды; онлайн жіберу әлі бапталмаған.");
    } catch { setReportNotice(language === "ru" ? "Не удалось сохранить сообщение в браузере." : "Хабарламаны браузерде сақтау мүмкін болмады."); }
  }

  function checkData() {
    if (sameItems(selectedData, needed)) {
      setFeedback(null);
      setStep(2);
      return;
    }
    const wrongId = selectedData.find(id => !needed.includes(id));
    const missingIds = needed.filter(id => !selectedData.includes(id));
    const rule = wrongId
      ? task.error_map.find(item => item.trigger_distractor_id === wrongId) ?? hintFor(task, "distractor_trap")
      : missingIds.includes("student_discount")
        ? hintFor(task, "missed_footnote")
        : hintFor(task, "distractor_trap");
    const type = wrongId ? rule.error_type : missingIds.includes("student_discount") ? "missed_footnote" : "distractor_trap";
    setFeedback({ rule, type });
    logError(type);
  }

  function checkFormula() {
    const correct = task.step2_formula_chips.correct_sequence.map(chip => fillText(chip, variant));
    if (selectedChips.length === correct.length && selectedChips.every((chip, index) => chip === correct[index])) {
      setFeedback(null);
      setStep(3);
      return;
    }
    const distractorIndex = task.step2_formula_chips.distractor_chips.map(chip => fillText(chip, variant)).findIndex(chip => selectedChips.includes(chip));
    const distractorId = distractorIndex >= 0 ? task.formula_distractor_ids?.[distractorIndex] : undefined;
    const rule = distractorId
      ? task.error_map.find(item => item.trigger_distractor_id === distractorId) ?? hintFor(task, "distractor_trap")
      : hintFor(task, "calculation_error");
    setFeedback({ rule, type: distractorId ? "distractor_trap" : "calculation_error" });
    logError(distractorId ? "distractor_trap" : "calculation_error");
  }

  function findAnswerRule(value: number) {
    return task.error_map.find(rule => {
      const keyed = rule.mistake_key ? variant.wrong_values[rule.mistake_key] : undefined;
      const typed = variant.wrong_values[rule.error_type];
      return keyed === value || typed === value || rule.wrong_value === value;
    });
  }

  function checkAnswer() {
    const normalized = Number(answer.trim().replace(",", "."));
    const correctNumber = normalized === variant.answer_value;
    const correctConclusion = conclusion === correctConclusionId;
    if (correctNumber && correctConclusion) {
      onAttempt({ task_id: task.task_id, is_correct: true, error_type: null });
      setFeedback(null);
      setComplete(true);
      return;
    }
    const rule = findAnswerRule(normalized) ?? hintFor(task, "calculation_error");
    const type = !correctConclusion && correctNumber ? "calculation_error" : rule.error_type;
    setFeedback({ rule, type });
    logError(type);
  }

  function toggleData(id: string) {
    setFeedback(null);
    setSelectedData(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function toggleChip(chip: string) {
    setFeedback(null);
    setSelectedChips(current => current.includes(chip) ? current.filter(item => item !== chip) : [...current, chip]);
  }

  function renderStory() {
    const terms = task.glossary.map((entry, index) => ({ term: entry.term[language], index })).sort((a, b) => b.term.length - a.term.length);
    return splitAtTerms(filledStory, terms).map((part, index) => {
      if (part.termIndex === undefined) return <span key={index}>{part.text}</span>;
      const entry = task.glossary[part.termIndex];
      const active = activeTerm === entry.term[language];
      return <button className="term-button" key={index} onClick={() => setActiveTerm(active ? null : entry.term[language])}>{part.text}</button>;
    });
  }

  const allChips = [
    ...task.step2_formula_chips.correct_sequence.map(chip => fillText(chip, variant)),
    ...task.step2_formula_chips.distractor_chips.map(chip => fillText(chip, variant))
  ];

  return (
    <section className="solver-view">
      <button className="back-link" onClick={onBack}>← {language === "ru" ? "К списку тем" : "Тақырыптар тізіміне"}</button>
      <div className="task-heading">
        <div>
          <span className="eyebrow">{language === "ru" ? "ЗАДАЧА • " + task.grade + " КЛАСС" : "ТАПСЫРМА • " + task.grade + " СЫНЫП"}</span>
          <h1>{task.title[language]}</h1>
        </div>
        <button className="button button-quiet variant-button" onClick={onNewVariant}>↻ {language === "ru" ? "Новый вариант чисел" : "Жаңа сандар нұсқасы"}</button>
      </div>
      <div className="step-progress" aria-label={language === "ru" ? "Этап решения" : "Шешу кезеңі"}>
        {[1, 2, 3].map(number => <div className={"step-dot " + (step === number ? "current" : step > number || complete ? "done" : "")} key={number}><span>{number}</span><b>{[language === "ru" ? "Отсей лишнее" : "Артық деректі алып таста", language === "ru" ? "Собери модель" : "Модель құрастыр", language === "ru" ? "Расчёт и вывод" : "Есеп пен қорытынды"][number - 1]}</b></div>)}
      </div>
      <div className="solver-grid">
        <div className="task-context">
          <article className="panel story-panel">
            <div className="panel-kicker">{language === "ru" ? "СИТУАЦИЯ" : "ЖАҒДАЙ"}</div>
            <p>{renderStory()}</p>
            {activeTerm && (() => {
              const entry = task.glossary.find(item => item.term[language] === activeTerm);
              return entry ? <div className="glossary-popover"><button className="popover-close" onClick={() => setActiveTerm(null)}>×</button><strong>{entry.term[language]}</strong><p>{entry.simple_explanation[language]}</p></div> : null;
            })()}
          </article>
          <article className="panel visual-panel">
            <div className="visual-header"><span className="panel-kicker">{language === "ru" ? "ДАННЫЕ ЗАДАЧИ" : "ТАПСЫРМА ДЕРЕКТЕРІ"}</span><span className="visual-badge">SVG • {task.svg_type === "table" ? (language === "ru" ? "таблица" : "кесте") : task.svg_type === "floor_plan" ? (language === "ru" ? "план" : "жоспар") : (language === "ru" ? "график" : "график")}</span></div>
            <div className="svg-scroll">
              <SvgRenderer task={task} variant={variant} language={language} selectedIds={selectedData} highlightIds={feedback ? [feedback.rule.highlight_element_id] : []} onSelect={toggleData} />
            </div>
          </article>
        </div>
        <aside className="panel step-panel">
          {step === 1 && !complete && <>
            <span className="step-number">{language === "ru" ? "ШАГ 1 ИЗ 3" : "3 ҚАДАМНЫҢ 1-І"}</span>
            <h2>{language === "ru" ? "Отсей лишнее" : "Артық деректі алып таста"}</h2>
            <p className="step-instruction">{language === "ru" ? "Нажми на строки схемы, которые нужны, чтобы ответить на вопрос." : "Сұраққа жауап беру үшін сызбадағы қажет жолдарды бас."}</p>
            <p className="question-box">{task.question[language]}</p>
            <div className="selection-count">{selectedData.length} {language === "ru" ? "выбрано" : "таңдалды"} · {needed.length} {language === "ru" ? "нужно" : "қажет"}</div>
            <button className="button button-primary full-button" onClick={checkData}>{language === "ru" ? "Проверить данные" : "Деректерді тексеру"} <span>→</span></button>
          </>}
          {step === 2 && !complete && <>
            <span className="step-number">{language === "ru" ? "ШАГ 2 ИЗ 3" : "3 ҚАДАМНЫҢ 2-І"}</span>
            <h2>{language === "ru" ? "Собери модель" : "Модель құрастыр"}</h2>
            <p className="step-instruction">{language === "ru" ? "Составь последовательность действий из блоков — не угадывай число." : "Блоктардан амалдардың ретін құрастыр — санды болжама."}</p>
            <div className="formula-workspace">
              {selectedChips.length === 0 && <span className="placeholder">{language === "ru" ? "Выбери блоки по порядку…" : "Блоктарды ретімен таңда…"}</span>}
              {selectedChips.map((chip, index) => <button key={chip} className="formula-selected" onClick={() => toggleChip(chip)}><span>{index + 1}</span>{chip}<b>×</b></button>)}
            </div>
            <div className="chip-bank">
              {allChips.map(chip => <button key={chip} disabled={selectedChips.includes(chip)} className={"formula-chip " + (task.step2_formula_chips.distractor_chips.map(value => fillText(value, variant)).includes(chip) ? "chip-distractor" : "")} onClick={() => toggleChip(chip)}>{chip}</button>)}
            </div>
            <button className="button button-primary full-button" onClick={checkFormula}>{language === "ru" ? "Проверить модель" : "Модельді тексеру"} <span>→</span></button>
          </>}
          {step === 3 && !complete && <>
            <span className="step-number">{language === "ru" ? "ШАГ 3 ИЗ 3" : "3 ҚАДАМНЫҢ 3-І"}</span>
            <h2>{language === "ru" ? "Расчёт и вывод" : "Есеп пен қорытынды"}</h2>
            <p className="question-box">{task.question[language]}</p>
            <label className="answer-label" htmlFor="answer">{language === "ru" ? "Твой ответ" : "Сенің жауабың"}</label>
            <div className="answer-input-wrap"><input id="answer" value={answer} onChange={event => setAnswer(event.target.value)} inputMode="decimal" placeholder="0" /><span>{task.correct_answer.unit}</span></div>
            <span className="answer-hint">{language === "ru" ? "Можно использовать запятую или точку" : "Үтірді не нүктені қолдануға болады"}</span>
            <label className="answer-label conclusion-label">{language === "ru" ? "Практический вывод" : "Өмірлік қорытынды"}</label>
            <div className="conclusion-options">
              {task.correct_answer.life_conclusion_options.map(option => <button key={option.id} className={"conclusion-option " + (conclusion === option.id ? "chosen" : "")} onClick={() => { setConclusion(option.id); setFeedback(null); }}>{option.text[language]}</button>)}
            </div>
            <button className="button button-primary full-button" onClick={checkAnswer}>{language === "ru" ? "Проверить ответ" : "Жауапты тексеру"}</button>
          </>}
          {complete && <div className="completion-state"><span className="completion-mark">✓</span><span className="step-number">{language === "ru" ? "ЗАДАЧА РЕШЕНА" : "ТАПСЫРМА ШЕШІЛДІ"}</span><h2>{language === "ru" ? "Отличная работа!" : "Жарайсың!"}</h2><p>{language === "ru" ? "Ты отобрал нужные данные, построил модель и проверил вывод." : "Қажетті деректерді іріктеп, модель құрып, қорытындыны тексердің."}</p><button className="button button-primary full-button" onClick={onBack}>{language === "ru" ? "К следующей задаче" : "Келесі тапсырмаға"}</button></div>}
          {feedback && <div className="feedback-card"><strong><span>↗</span> {errorNames[feedback.type][language]}</strong><p>{feedback.rule.hint[language]}</p></div>}
          <details className="task-report"><summary>{language === "ru" ? "Сообщить об ошибке в задаче" : "Тапсырмадағы қате туралы хабарлау"}</summary><form onSubmit={saveReport}><textarea value={reportText} maxLength={1000} onChange={event => setReportText(event.target.value)} placeholder={language === "ru" ? "Что стоит проверить?" : "Нені тексеру керек?"} /><button className="button button-outline" disabled={!reportText.trim()}>{language === "ru" ? "Сохранить сообщение" : "Хабарламаны сақтау"}</button></form>{reportNotice && <small role="status">{reportNotice}</small>}</details>
        </aside>
      </div>
    </section>
  );
}
