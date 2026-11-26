import type { EsepTask, ErrorType, Language, SyncAttempt, TaskVariant } from "../types";
import { SvgRenderer } from "./SvgRenderer";

type Props = {
  language: Language;
  attempts: SyncAttempt[];
  tasks: EsepTask[];
};

const categories: Array<{ type: ErrorType; ru: string; kz: string; icon: string }> = [
  { type: "missed_footnote", ru: "Пропуск сноски", kz: "Сілтемені ескермеу", icon: "✳" },
  { type: "distractor_trap", ru: "Лишние данные", kz: "Артық деректер", icon: "⌁" },
  { type: "unit_mismatch", ru: "Оси и единицы", kz: "Осьтер мен өлшемдер", icon: "↗" },
  { type: "calculation_error", ru: "Вычисления", kz: "Есептеу", icon: "÷" }
];

function fillText(text: string, variant: TaskVariant) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => String(variant.tokens?.[key] ?? ""));
}

export function TeacherDashboard({ language, attempts, tasks }: Props) {
  const errorCount = (type: ErrorType) => attempts.filter(attempt => attempt.error_type === type).length;
  const totalErrors = attempts.filter(attempt => !attempt.is_correct).length;
  const syncedCount = attempts.filter(attempt => attempt.status === "synced").length;

  return (
    <>
      <section className="dashboard-view screen-only">
        <div className="dashboard-heading">
          <div><span className="eyebrow">{language === "ru" ? "КАБИНЕТ УЧИТЕЛЯ" : "МҰҒАЛІМ КАБИНЕТІ"}</span><h1>{language === "ru" ? "Как мыслит класс" : "Сынып қалай ойлайды"}</h1><p>{language === "ru" ? "Смотрите на ход рассуждений, а не только на итоговый ответ." : "Тек соңғы жауапқа емес, ойлау жолына назар аударыңыз."}</p></div>
          <button className="button button-primary print-button" onClick={() => window.print()}><span>▤</span>{language === "ru" ? "Лист А4 для печати" : "А4 баспа парағы"}</button>
        </div>
        <div className="teacher-overview">
          <article className="panel overview-card"><span className="overview-icon mint">⌁</span><div><b>{attempts.length}</b><span>{language === "ru" ? "попыток сохранено" : "әрекет сақталды"}</span></div></article>
          <article className="panel overview-card"><span className="overview-icon peach">↗</span><div><b>{totalErrors}</b><span>{language === "ru" ? "точек для разбора" : "талқылайтын жағдай"}</span></div></article>
          <article className="panel overview-card"><span className="overview-icon blue">☁</span><div><b>{syncedCount}/{attempts.length}</b><span>{language === "ru" ? "синхронизировано" : "синхрондалды"}</span></div></article>
        </div>
        <div className="panel error-dashboard">
          <div className="section-heading"><div><span className="panel-kicker">{language === "ru" ? "КАРТА ОШИБОК" : "ҚАТЕЛЕР КАРТАСЫ"}</span><h2>{language === "ru" ? "Какие шаги даются труднее" : "Қай қадамдар қиынырақ"}</h2></div><span className="class-tag">{language === "ru" ? "Класс · офлайн-данные" : "Сынып · офлайн деректер"}</span></div>
          <div className="error-bars">
            {categories.map((category, index) => {
              const count = errorCount(category.type);
              const max = Math.max(1, ...categories.map(item => errorCount(item.type)));
              return <div className="error-bar-row" key={category.type}><span className={"error-bar-icon icon-" + index}>{category.icon}</span><span className="error-bar-name">{category[language]}</span><div className="bar-track"><div className={"bar-fill fill-" + index} style={{ width: ((count / max) * 100) + "%" }} /></div><b>{count}</b></div>;
            })}
          </div>
          {totalErrors === 0 && <p className="empty-note">{language === "ru" ? "Пока нет ошибок для разбора. Попытки появятся здесь после решения задач." : "Әзірге талдайтын қате жоқ. Тапсырмалар шешілген соң әрекеттер осында көрсетіледі."}</p>}
        </div>
        <div className="panel print-note">
          <div className="print-note-icon">▤</div><div><b>{language === "ru" ? "Печатные варианты готовы офлайн" : "Баспа нұсқалары офлайн әзір"}</b><p>{language === "ru" ? "Для каждой темы сформированы три комплекта с разными числами. Печать откроет системное окно сохранения в PDF." : "Әр тақырыпқа сандары әртүрлі үш нұсқа дайын. Басып шығару PDF ретінде сақтауға арналған жүйелік терезені ашады."}</p></div><button className="button button-outline" onClick={() => window.print()}>{language === "ru" ? "Сформировать" : "Дайындау"} →</button>
        </div>
      </section>
      <section className="print-area" aria-hidden="true">
        {tasks.flatMap(task => task.variants.map((variant, index) => (
          <article className="worksheet" key={task.task_id + variant.id}>
            <div className="worksheet-topline"><span>EsepKarta · {language === "ru" ? "математика в жизни" : "математика өмірде"}</span><span>{language === "ru" ? "Класс: " : "Сынып: "}{task.grade}</span></div>
            <h1>{task.title[language]} <small>· {language === "ru" ? "Вариант " : "Нұсқа "}{index + 1}</small></h1>
            <p>{fillText(task.story[language], variant)}</p>
            <div className="worksheet-graphic"><SvgRenderer task={task} variant={variant} language={language} /></div>
            <h2>{task.question[language]}</h2>
            <div className="worksheet-answer-line">{language === "ru" ? "Ответ:" : "Жауабы:"} ________________________________________________</div>
            <div className="worksheet-answer-line">{language === "ru" ? "Моя модель:" : "Менің моделім:"} ___________________________________________</div>
            <div className="worksheet-answer-line">{language === "ru" ? "Вывод:" : "Қорытынды:"} _________________________________________________</div>
            <footer>{language === "ru" ? "Имя ученика: ______________________________" : "Оқушының аты-жөні: _________________________"} <span>esepkarta · {task.task_id}</span></footer>
          </article>
        )))}
      </section>
    </>
  );
}
