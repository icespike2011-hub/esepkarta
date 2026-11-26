import { useState } from "react";
import { formulas, lessons, notes } from "../data/learningContent";
import type { Language } from "../types";

type Props = { language: Language };
const textOf = (value: { ru: string; kz: string } | string, language: Language) => typeof value === "string" ? value : value[language];

export function LearningLibrary({ language }: Props) {
  const [section, setSection] = useState<"formulas" | "lessons" | "notes" | "diagnostic">("formulas");
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [score, setScore] = useState<number | null>(() => { try { const value = localStorage.getItem("esepkarta-pretest-score"); return value === null ? null : Number(value); } catch { return null; } });
  const isRu = language === "ru";
  const tabs = [{ id: "formulas", label: isRu ? "Формулы" : "Формулалар" }, { id: "lessons", label: isRu ? "Уроки" : "Сабақтар" }, { id: "notes", label: isRu ? "Конспекты" : "Қысқаша жазбалар" }, { id: "diagnostic", label: isRu ? "Диагностика" : "Диагностика" }] as const;
  const diagnostic = isRu ? [
    { topic: "Проценты", q: "Найди 15% от 6 000 ₸.", a: "900" },
    { topic: "Площадь", q: "Площадь прямоугольника 8 м × 4 м?", a: "32" },
    { topic: "Уравнения", q: "x + 1 250 = 2 500. Чему равен x?", a: "1250" },
    { topic: "Расход", q: "При мощности 2 кВт за 3 часа израсходовано сколько кВт·ч?", a: "6" },
    { topic: "Данные", q: "Из 6 равновероятных исходов подходят 3. Какова вероятность в процентах?", a: "50" }
  ] : [
    { topic: "Пайыздар", q: "6 000 ₸-нің 15%-ын тап.", a: "900" },
    { topic: "Аудан", q: "Өлшемі 8 м × 4 м тік төртбұрыштың ауданы қанша?", a: "32" },
    { topic: "Теңдеу", q: "x + 1 250 = 2 500. x неге тең?", a: "1250" },
    { topic: "Тұтыну", q: "Қуаты 2 кВт құрылғы 3 сағатта қанша кВт·сағ жұмсайды?", a: "6" },
    { topic: "Деректер", q: "6 тең мүмкіндіктің 3-еуі қолайлы. Ықтималдықты пайызбен көрсет.", a: "50" }
  ];
  function finishDiagnostic() {
    const points = diagnostic.reduce((sum, item, i) => sum + (Number(answers[i].replace(",", ".")) === Number(item.a) ? 1 : 0), 0);
    setScore(points);
    try { localStorage.setItem("esepkarta-pretest-score", String(points)); localStorage.setItem("esepkarta-pretest-date", new Date().toISOString().slice(0, 10)); } catch { /* The score stays visible for this session. */ }
  }
  return <section className="learning-view"><div className="dashboard-heading"><div><span className="eyebrow">{isRu ? "УЧЕБНАЯ БИБЛИОТЕКА" : "ОҚУ КІТАПХАНАСЫ"}</span><h1>{isRu ? "Понимай, откуда берётся ответ" : "Жауаптың қалай шығатынын түсін"}</h1><p>{isRu ? "Формулы с объяснениями, короткие уроки и конспекты доступны без сети." : "Формулалар, қысқа сабақтар мен жазбалар интернетсіз қолжетімді."}</p></div><span className="simulator-orbit">∑</span></div>
    <div className="library-tabs">{tabs.map(tab => <button key={tab.id} onClick={() => setSection(tab.id)} className={section === tab.id ? "active" : ""}>{tab.label}</button>)}</div>
    {section === "diagnostic" ? <article className="learning-card diagnostic-card"><h2>{isRu ? "Короткая входная проверка" : "Қысқа бастапқы тексеру"}</h2><p>{isRu ? "Пять вопросов помогут выбрать, что повторить. Результат хранится только на этом устройстве." : "Бес сұрақ нені қайталау керегін анықтауға көмектеседі. Нәтиже тек осы құрылғыда сақталады."}</p>{diagnostic.map((item, i) => <label className="diagnostic-question" key={item.topic}><span><b>{i + 1}. {item.topic}</b> · {item.q}</span><input inputMode="decimal" value={answers[i]} onChange={e => setAnswers(current => current.map((value, index) => index === i ? e.target.value : value))} aria-label={item.q} /></label>)}<button className="button button-primary" onClick={finishDiagnostic}>{isRu ? "Проверить" : "Тексеру"}</button>{score !== null && <div className="learning-example"><b>{isRu ? `Результат: ${score} из 5` : `Нәтиже: 5-тен ${score}`}</b><span>{isRu ? "Выбери тему, где хотелось бы чувствовать себя увереннее, и повтори материал выше." : "Өзіңе сенімді болғың келетін тақырыпты таңдап, жоғарыдағы материалды қайтала."}</span></div>}</article>
      : section === "formulas" ? <div className="learning-grid">{formulas.map(card => <article className="learning-card formula-card" key={card.id}><span className="panel-kicker">{card.topic}</span><h2>{card.title[language]}</h2><div className="formula-expression">{textOf(card.formula, language)}</div><p>{card.symbols[language]}</p><div className="learning-example"><b>{isRu ? "Разберём" : "Талдап көрейік"}</b><span>{card.example[language]}</span></div><small className="learning-mistake">↗ {card.mistake[language]}</small></article>)}</div>
      : <div className="learning-grid">{(section === "lessons" ? lessons : notes).map(card => <article className="learning-card" key={card.id}><span className="panel-kicker">{section === "lessons" ? (isRu ? "МИНИ-УРОК" : "ҚЫСҚА САБАҚ") : (isRu ? "КОНСПЕКТ" : "ЖАЗБА")}</span><h2>{card.title[language]}</h2><p>{card.summary[language]}</p><ol>{card.steps.map((step, index) => <li key={index}>{step[language]}</li>)}</ol><div className="learning-example"><b>{isRu ? "Пример" : "Мысал"}</b><span>{card.example[language]}</span></div></article>)}</div>}
  </section>;
}
