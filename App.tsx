import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addAttempt, getAttempts, getPack, getPendingAttempts, markAttemptSynced, savePack } from "./db";
import { initialPack } from "./data/initialPack";
import { TaskSolver } from "./components/TaskSolver";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { LearningLibrary } from "./components/LearningLibrary";
import { AiTutor } from "./components/AiTutor";
import type { EsepTask, Language, SyncAttempt } from "./types";
import { ui } from "./i18n/ui";

type Screen = "student" | "learning" | "tutor" | "teacher" | "simulator";
type Theme = "light" | "dark";
type AppPage = "about" | "privacy" | "notfound" | null;

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const tabCopy: Record<Language, Record<Screen, string>> = {
  ru: { student: "Задачи", learning: "Учёба", tutor: "ИИ-помощник", teacher: "Учителю", simulator: "Связь" },
  kz: { student: "Тапсырмалар", learning: "Оқу", tutor: "ЖИ көмекші", teacher: "Мұғалімге", simulator: "Байланыс" }
};

const topicCopy: Record<string, { ru: string; kz: string; blurb: { ru: string; kz: string }; symbol: string }> = {
  percentages: { ru: "Проценты и тарифы", kz: "Пайыздар мен тарифтер", blurb: { ru: "Находим нужный тариф среди лишних строк", kz: "Артық жолдардың ішінен қажетті тарифті табамыз" }, symbol: "%" },
  area: { ru: "Площадь и смета", kz: "Аудан мен шығын есебі", blurb: { ru: "Читаем план и считаем стоимость материалов", kz: "Жоспарды оқып, материал құнын есептейміз" }, symbol: "▱" },
  graphs: { ru: "Графики и расход", kz: "Графиктер мен тұтыну", blurb: { ru: "Сравниваем показатели с нормой", kz: "Көрсеткіштерді нормамен салыстырамыз" }, symbol: "⌁" }
};

const errorCopy = {
  ru: { missed_footnote: "сноска пропущена", distractor_trap: "лишние данные", unit_mismatch: "единицы измерения", calculation_error: "вычисление" },
  kz: { missed_footnote: "сілтеме ескерілмеді", distractor_trap: "артық дерек", unit_mismatch: "өлшем бірлігі", calculation_error: "есептеу" }
};

function formatKb(bytes: number) {
  if (!bytes) return "0";
  return (bytes / 1024).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function Icon({ kind }: { kind: Screen }) {
  if (kind === "learning") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c3-1 5.7-.3 8 1.5v13c-2.3-1.8-5-2.5-8-1.5zM20 5.5c-3-1-5.7-.3-8 1.5v13c2.3-1.8 5-2.5 8-1.5z" /></svg>;
  if (kind === "tutor") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 4zM8 9h8M8 13h5" /></svg>;
  if (kind === "teacher") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7" /><circle cx="7" cy="15" r="1" /><circle cx="11" cy="11" r="1" /><circle cx="14" cy="13" r="1" /><circle cx="19" cy="6" r="1" /></svg>;
  if (kind === "simulator") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0M11 15a2 2 0 0 1 2 0M12 19h.01" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 9h8M8 12h5M8 15h7" /><path d="m15 15 1.5 1.5L20 13" /></svg>;
}

export default function App() {
  const [language, setLanguage] = useState<Language>("ru");
  const [screen, setScreen] = useState<Screen>("student");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<EsepTask[]>(initialPack.tasks);
  const [attempts, setAttempts] = useState<SyncAttempt[]>([]);
  const [streakDays, setStreakDays] = useState(() => { try { return Number(localStorage.getItem("esepkarta-streak") ?? 0); } catch { return 0; } });
  const [packBytes, setPackBytes] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState("");
  const [realOnline, setRealOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [variantIndexes, setVariantIndexes] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem("esepkarta-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const [lowPower, setLowPower] = useState(() => { try { return localStorage.getItem("esepkarta-low-power") === "true"; } catch { return false; } });
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [page, setPage] = useState<AppPage>(() => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/about" ? "about" : path === "/privacy" ? "privacy" : path === "/" ? null : "notfound";
  });
  const simulatedOfflineRef = useRef(false);
  const syncLock = useRef(false);
  const effectiveOnline = realOnline && !simulatedOffline;
  const pendingCount = attempts.filter(attempt => attempt.status === "pending").length;
  const selectedTask = tasks.find(task => task.task_id === selectedTaskId) ?? null;
  const selectedVariantIndex = selectedTask ? (variantIndexes[selectedTask.task_id] ?? 0) % selectedTask.variants.length : 0;
  const selectedVariant = selectedTask?.variants[selectedVariantIndex];

  const refreshAttempts = useCallback(async () => {
    const all = await getAttempts();
    setAttempts(all.reverse());
  }, []);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || simulatedOfflineRef.current || syncLock.current) return;
    syncLock.current = true;
    setIsSyncing(true);
    setSyncNotice("");
    try {
      const pending = await getPendingAttempts();
      const endpoint = import.meta.env.VITE_SYNC_ENDPOINT;
      for (const attempt of pending) {
        if (endpoint) {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attempt)
          });
          if (!response.ok) throw new Error("HTTP " + response.status);
        } else {
          await new Promise(resolve => window.setTimeout(resolve, 220));
        }
        await markAttemptSynced(attempt.attempt_id);
      }
      await refreshAttempts();
      if (pending.length) setSyncNotice(endpoint ? (language === "ru" ? "Очередь отправлена." : "Кезек жіберілді.") : (language === "ru" ? "Демо-синхронизация завершена." : "Демо-синхрондау аяқталды."));
    } catch {
      setSyncNotice(language === "ru" ? "Не удалось отправить очередь. Попытки сохранены на устройстве." : "Кезекті жіберу мүмкін болмады. Әрекеттер құрылғыда сақталды.");
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
      await refreshAttempts();
    }
  }, [language, refreshAttempts]);

  useEffect(() => {
    let alive = true;
    async function loadOfflineData() {
      try {
        const existing = await getPack(initialPack.pack_id);
        let stored = existing;
        const bytes = new TextEncoder().encode(JSON.stringify(initialPack)).byteLength;
        if (!existing || existing.version !== initialPack.version) {
          stored = { ...initialPack, size_bytes: bytes, saved_at: new Date().toISOString() };
          await savePack(stored);
        }
        const savedTasks = stored?.tasks ?? initialPack.tasks;
        await refreshAttempts();
        if (alive) {
          setTasks(savedTasks);
          setPackBytes(stored?.size_bytes ?? bytes);
          setDbReady(true);
          setDbError("");
        }
      } catch {
        if (alive) {
          setDbReady(false);
          setDbError(language === "ru" ? "Хранилище IndexedDB недоступно в этом браузере." : "Бұл браузерде IndexedDB қолжетімсіз.");
        }
      }
    }
    void loadOfflineData();
    return () => { alive = false; };
  }, [language, refreshAttempts]);

  useEffect(() => {
    simulatedOfflineRef.current = simulatedOffline;
    if (!simulatedOffline && realOnline) void syncPending();
  }, [simulatedOffline, realOnline, syncPending]);

  useEffect(() => {
    const handleOnline = () => {
      setRealOnline(true);
      if (!simulatedOfflineRef.current) void syncPending();
    };
    const handleOffline = () => setRealOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPending]);

  const onAttempt = useCallback(async (data: Omit<SyncAttempt, "attempt_id" | "timestamp" | "status">) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const previous = localStorage.getItem("esepkarta-active-day");
      const days = previous === today ? Number(localStorage.getItem("esepkarta-streak") ?? 1) : previous && Date.parse(today) - Date.parse(previous) === 86_400_000 ? Number(localStorage.getItem("esepkarta-streak") ?? 0) + 1 : 1;
      localStorage.setItem("esepkarta-active-day", today); localStorage.setItem("esepkarta-streak", String(days)); setStreakDays(days);
    } catch { /* Activity is still stored in IndexedDB below. */ }
    const attempt: SyncAttempt = {
      ...data,
      attempt_id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      timestamp: new Date().toISOString(),
      status: "pending"
    };
    try {
      await addAttempt(attempt);
      await refreshAttempts();
      if (navigator.onLine && !simulatedOfflineRef.current) void syncPending();
    } catch {
      setSyncNotice(language === "ru" ? "Попытка не записалась в IndexedDB." : "Әрекет IndexedDB-ге жазылмады.");
    }
  }, [language, refreshAttempts, syncPending]);

  function startTask(task: EsepTask) {
    setSelectedTaskId(task.task_id);
    setScreen("student");
  }

  function nextVariant() {
    if (!selectedTask) return;
    setVariantIndexes(current => ({ ...current, [selectedTask.task_id]: ((current[selectedTask.task_id] ?? 0) + 1) % selectedTask.variants.length }));
  }

  function manualSync() {
    if (!effectiveOnline) {
      setSyncNotice(language === "ru" ? "Связи нет: очередь останется на устройстве." : "Байланыс жоқ: кезек құрылғыда қалады.");
      return;
    }
    void syncPending();
  }

  const solvedCount = useMemo(() => new Set(attempts.filter(attempt => attempt.is_correct).map(attempt => attempt.task_id)).size, [attempts]);

  useEffect(() => {
    document.documentElement.lang = language === "ru" ? "ru" : "kk";
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("esepkarta-theme", theme); } catch { /* Theme still works for this session. */ }
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.lowPower = String(lowPower);
    try { localStorage.setItem("esepkarta-low-power", String(lowPower)); } catch { /* Applies until this page closes. */ }
  }, [lowPower]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) { setShowInstallHelp(true); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function openPage(next: Exclude<AppPage, null>) {
    window.history.pushState({}, "", next === "notfound" ? "/404" : `/${next}`);
    setPage(next);
  }

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      setPage(path === "/about" ? "about" : path === "/privacy" ? "privacy" : path === "/" ? null : "notfound");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => { window.history.pushState({}, "", "/"); setPage(null); setScreen("student"); setSelectedTaskId(null); }} aria-label="EsepKarta">
          <span className="brand-mark"><span></span><span></span><span></span></span><span className="brand-name">Esep<span>Karta</span><small>{language === "ru" ? "МАТЕМАТИКА В ЖИЗНИ" : "МАТЕМАТИКА ӨМІРДЕ"}</small></span>
        </button>
        <nav className="main-nav" aria-label={language === "ru" ? "Основная навигация" : "Негізгі навигация"}>
          {(["student", "learning", "tutor", "teacher", "simulator"] as Screen[]).map(tab => <button key={tab} onClick={() => { setScreen(tab); setSelectedTaskId(null); }} className={"nav-tab " + (screen === tab ? "active" : "")}><Icon kind={tab} /><span>{tabCopy[language][tab]}</span></button>)}
        </nav>
        <div className="top-actions">
          <button className="language-toggle" onClick={() => setLanguage(language === "ru" ? "kz" : "ru")} aria-label={language === "ru" ? "Қазақшаға ауысу" : "Переключить на русский"}><span className={language === "ru" ? "active" : ""}>RU</span><span className="toggle-divider"></span><span className={language === "kz" ? "active" : ""}>KZ</span></button>
          <button className="utility-button theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={ui[theme === "light" ? "darkOn" : "lightOn"][language]}>{theme === "light" ? "◐" : "☼"}</button>
          <button className="utility-button power-toggle" aria-pressed={lowPower} title={language === "ru" ? "Режим экономии анимаций" : "Анимацияны үнемдеу режимі"} onClick={() => setLowPower(value => !value)}>◴</button>
          {!window.matchMedia("(display-mode: standalone)").matches && <button className="utility-button install-button" onClick={() => void installApp()}>{ui.install[language]}</button>}
          <div className={"connection-pill " + (effectiveOnline ? "online" : "offline")}><span className="connection-dot"></span><span>{effectiveOnline ? (language === "ru" ? "Онлайн" : "Онлайн") : (language === "ru" ? "Оффлайн-режим (в очереди: " + pendingCount + ")" : "Офлайн режим (кезекте: " + pendingCount + ")")}</span></div>
          <button className="sync-top-button" onClick={manualSync} aria-label={language === "ru" ? "Синхронизировать" : "Синхрондау"} disabled={isSyncing}><span className={isSyncing ? "spin" : ""}>↻</span></button>
        </div>
      </header>
      <div className="traffic-line"><span>⌁</span>{language === "ru" ? "Офлайн-пакет сохранён" : "Офлайн пакет сақталды"} <b>{formatKb(packBytes)} КБ</b><i>·</i>{language === "ru" ? "трафика сэкономлено" : "трафик үнемделді"}</div>

      <main className="main-content">
        {showInstallHelp && <div className="modal-backdrop" role="presentation" onClick={() => setShowInstallHelp(false)}><section className="install-help panel" role="dialog" aria-modal="true" aria-labelledby="install-help-title" onClick={event => event.stopPropagation()}><h2 id="install-help-title">{ui.installHelpTitle[language]}</h2><p>{ui.installHelp[language]}</p><button className="button button-primary" onClick={() => setShowInstallHelp(false)}>{ui.close[language]}</button></section></div>}
        {page && <section className="static-page panel"><span className="eyebrow">ESEPKARTA</span>
          {page === "about" ? <><h1>{ui.about[language]}</h1><p>{language === "ru" ? "EsepKarta — учебная площадка для развития функциональной математической грамотности школьников 7–9 классов Казахстана. Жизненные задачи и учебные материалы доступны офлайн после загрузки приложения." : "EsepKarta — Қазақстанның 7–9 сынып оқушыларына арналған математикалық сауаттылықты дамыту платформасы. Қолданба жүктелгеннен кейін өмірлік тапсырмалар мен оқу материалдары офлайн қолжетімді."}</p></>
            : page === "privacy" ? <><h1>{language === "ru" ? "Конфиденциальность" : "Құпиялылық"}</h1><p>{language === "ru" ? "Локальный прогресс и попытки хранятся на устройстве в IndexedDB. Для ответа онлайн-помощника текст вопроса отправляется серверной функции приложения и AI Gateway; не вводите личные данные. В автономном режиме доступны сохранённые задания и учебные материалы." : "Жергілікті үлгерім мен әрекеттер IndexedDB арқылы құрылғыда сақталады. Онлайн көмекші жауап беруі үшін сұрақ мәтіні қолданбаның серверлік функциясы мен AI Gateway-ге жіберіледі; жеке деректерді енгізбеңіз. Офлайн режимде сақталған тапсырмалар мен оқу материалдары қолжетімді."}</p></>
              : <><h1>404</h1><p>{language === "ru" ? "Эта страница не найдена." : "Бұл бет табылмады."}</p></>}
          <button className="button button-primary" onClick={() => { window.history.pushState({}, "", "/"); setPage(null); setScreen("student"); }}>{ui.home[language]}</button>
        </section>}
        {!page && <>
        {screen === "student" && selectedTask && selectedVariant && (
          <TaskSolver key={selectedTask.task_id + selectedVariant.id} task={selectedTask} variant={selectedVariant} language={language} onAttempt={onAttempt} onNewVariant={nextVariant} onBack={() => setSelectedTaskId(null)} />
        )}
        {screen === "student" && !selectedTask && (
          <section className="student-home">
            <div className="welcome-copy"><div><span className="eyebrow">{language === "ru" ? "ТВОЙ ОФЛАЙН-ТРЕНАЖЁР" : "СЕНІҢ ОФЛАЙН ЖАТТЫҚТЫРҒЫШЫҢ"}</span><h1>{language === "ru" ? <>Математика<br /><em>вокруг тебя.</em></> : <>Математика<br /><em>өмірде керек.</em></>}</h1><p>{language === "ru" ? "Три шага от жизненной ситуации к математическому решению." : "Өмірлік жағдайдан математикалық шешімге дейінгі үш қадам."}</p></div><div className="welcome-art" aria-hidden="true"><div className="art-sun"></div><div className="art-circle art-circle-one"></div><div className="art-circle art-circle-two"></div><div className="art-equation">a × b<br /><span>+ %</span></div><div className="art-doodle">✳</div><div className="art-leaf"></div></div></div>
            <div className="student-meta"><div><span className="progress-icon">↗</span><span>{language === "ru" ? "Твой прогресс" : "Сенің жетістігің"} <b>{solvedCount}/{tasks.length}</b></span><div className="progress-track"><div style={{ width: ((solvedCount / Math.max(1, tasks.length)) * 100) + "%" }} /></div></div><span className="offline-ready"><span>✓</span>{language === "ru" ? "Задачи готовы без интернета" : "Тапсырмалар интернетсіз дайын"}</span></div>
            <div className="motivation-strip"><span>✦ {language === "ru" ? `${attempts.filter(item => item.is_correct).length} баллов` : `${attempts.filter(item => item.is_correct).length} ұпай`}</span><span>🔥 {language === "ru" ? `Серия: ${streakDays} дн.` : `Қатарынан: ${streakDays} күн`}</span><span>{solvedCount >= 3 ? "🏅" : "🌱"} {language === "ru" ? (solvedCount >= 3 ? "Исследователь задач" : "Начинающий исследователь") : (solvedCount >= 3 ? "Тапсырма зерттеушісі" : "Жас зерттеуші")}</span></div>
            {attempts.find(item => !item.is_correct) && (() => { const retry = tasks.find(item => item.task_id === attempts.find(a => !a.is_correct)?.task_id); return retry ? <button className="review-card" onClick={() => startTask(retry)}><span>↻</span><b>{language === "ru" ? "Повтори задачу, где возникла ошибка" : "Қате кеткен тапсырманы қайтала"}</b><span>→</span></button> : null; })()}
            <div className="topic-heading"><div><span className="eyebrow">{language === "ru" ? "ВЫБЕРИ ТЕМУ" : "ТАҚЫРЫПТЫ ТАҢДА"}</span><h2>{language === "ru" ? "С чего начнём?" : "Неден бастаймыз?"}</h2></div><span className="topic-count">{tasks.length} {language === "ru" ? "короткие задачи" : "қысқа тапсырма"}</span></div>
            <div className="topic-grid">
              {tasks.map((task, index) => {
                const topic = topicCopy[task.topic] ?? { ru: task.topic, kz: task.topic, blurb: { ru: "", kz: "" }, symbol: "•" };
                const count = attempts.filter(attempt => attempt.task_id === task.task_id && attempt.is_correct).length;
                return <button className={"topic-card topic-card-" + index} key={task.task_id} onClick={() => startTask(task)}><span className="topic-card-top"><span className="topic-symbol">{topic.symbol}</span><span className="topic-grade">{task.grade} {language === "ru" ? "класс" : "сынып"}</span></span><span className="topic-title">{topic[language]}</span><span className="topic-blurb">{topic.blurb[language]}</span><span className="topic-card-bottom"><span>{task.title[language]}</span><span className="topic-arrow">↗</span></span>{count > 0 && <span className="solved-tag">✓ {language === "ru" ? "решено" : "шешілді"}</span>}</button>;
              })}
            </div>
            <div className="home-tip"><span className="tip-icon">✳</span><p><b>{language === "ru" ? "Математика — это больше, чем ответ." : "Математика — жауаптан да кең."}</b><br />{language === "ru" ? "Замечай, какие данные действительно помогают решить задачу." : "Есеп шығаруға шынымен көмектесетін деректерді байқа."}</p><span className="tip-decoration">∿</span></div>
          </section>
        )}
        {screen === "teacher" && <TeacherDashboard language={language} attempts={attempts} tasks={tasks} />}
        {screen === "learning" && <LearningLibrary language={language} />}
        {screen === "tutor" && <AiTutor language={language} tasks={tasks} onOpenTask={startTask} />}
        {screen === "simulator" && <section className="simulator-view">
          <div className="dashboard-heading"><div><span className="eyebrow">{language === "ru" ? "ДЕМО-РЕЖИМ" : "ДЕМО РЕЖИМІ"}</span><h1>{language === "ru" ? "Симулятор связи" : "Байланыс симуляторы"}</h1><p>{language === "ru" ? "Проверь, как EsepKarta ведёт себя при слабом интернете." : "Интернет әлсіз болғанда EsepKarta қалай жұмыс істейтінін тексер."}</p></div><span className="simulator-orbit">⌁</span></div>
          <div className="simulator-grid">
            <article className="panel connection-card"><div className="sim-card-heading"><span className={"big-connection-icon " + (effectiveOnline ? "is-online" : "is-offline")}>{effectiveOnline ? "⌁" : "⊘"}</span><span className={"status-label " + (effectiveOnline ? "text-online" : "text-offline")}>{effectiveOnline ? (language === "ru" ? "Связь доступна" : "Байланыс бар") : (language === "ru" ? "Оффлайн-режим" : "Офлайн режимі")}</span></div><h2>{language === "ru" ? "Имитировать слабую сеть" : "Әлсіз желіні модельдеу"}</h2><p>{language === "ru" ? "Включи режим самолёта для приложения. Задачи и новые попытки останутся на этом устройстве." : "Қолданба үшін ұшақ режимін қос. Тапсырмалар мен жаңа әрекеттер осы құрылғыда қалады."}</p><label className="switch-row"><span>{language === "ru" ? "Включить офлайн-режим" : "Офлайн режимін қосу"}</span><button className={"switch " + (simulatedOffline ? "on" : "")} role="switch" aria-checked={simulatedOffline} onClick={() => setSimulatedOffline(value => !value)}><span /></button></label><div className="real-network-note"><span className={realOnline ? "real-dot" : "real-dot down"}></span>{language === "ru" ? "Реальная сеть: " + (realOnline ? "доступна" : "недоступна") : "Нақты желі: " + (realOnline ? "қолжетімді" : "қолжетімсіз")}</div></article>
            <article className="panel storage-card"><span className="panel-kicker">{language === "ru" ? "ЛОКАЛЬНОЕ ХРАНИЛИЩЕ" : "ЖЕРГІЛІКТІ ЖАД"}</span><h2>{language === "ru" ? "Данные на устройстве" : "Құрылғыдағы деректер"}</h2><div className="storage-row"><span>IndexedDB</span><b className={dbReady ? "storage-ready" : "storage-pending"}>{dbReady ? (language === "ru" ? "● готова" : "● дайын") : (language === "ru" ? "● загрузка" : "● жүктелуде")}</b></div><div className="storage-row"><span>task_packs</span><b>{tasks.length} {language === "ru" ? "задачи" : "тапсырма"}</b></div><div className="storage-row"><span>sync_queue</span><b>{pendingCount} {language === "ru" ? "ожидают" : "күтуде"}</b></div><div className="storage-row"><span>{language === "ru" ? "Вес пакета" : "Пакет көлемі"}</span><b className="pack-weight">{formatKb(packBytes)} КБ</b></div><div className="saved-traffic"><span>↓</span><div><b>{formatKb(packBytes)} КБ</b><small>{language === "ru" ? "трафика не пришлось скачивать повторно" : "қайта жүктеуге трафик жұмсалмады"}</small></div></div></article>
          </div>
          <article className="panel sync-card"><div className="section-heading"><div><span className="panel-kicker">{language === "ru" ? "ОЧЕРЕДЬ ПОПЫТОК" : "ӘРЕКЕТТЕР КЕЗЕГІ"}</span><h2>{language === "ru" ? "Синхронизация" : "Синхрондау"}</h2></div><button className="button button-primary" onClick={manualSync} disabled={isSyncing}><span className={isSyncing ? "spin" : ""}>↻</span>{isSyncing ? (language === "ru" ? "Отправляем…" : "Жіберілуде…") : (language === "ru" ? "Синхронизировать" : "Синхрондау")}</button></div><p className="sync-explainer">{import.meta.env.VITE_SYNC_ENDPOINT ? (language === "ru" ? "При доступной сети очередь отправляется на настроенный endpoint." : "Желі қолжетімді болса, кезек бапталған endpoint-ке жіберіледі.") : (language === "ru" ? "Демо без сервера: при возврате связи попытки помечаются переданными локально." : "Серверсіз демо: байланыс қалпына келгенде әрекеттер жергілікті түрде жіберілді деп белгіленеді.")}</p>{syncNotice && <p className="sync-notice">{syncNotice}</p>}{dbError && <p className="error-note">{dbError}</p>}<div className="attempt-list">{attempts.length === 0 ? <div className="empty-queue"><span>⌁</span><b>{language === "ru" ? "Очередь пока пуста" : "Кезек әзірге бос"}</b><small>{language === "ru" ? "Попытки появятся после решения задачи." : "Тапсырма шешілген соң әрекеттер көрінеді."}</small></div> : attempts.slice(0, 8).map(attempt => { const task = tasks.find(item => item.task_id === attempt.task_id); return <div className="attempt-row" key={attempt.attempt_id}><span className={"attempt-result " + (attempt.is_correct ? "correct" : "incorrect")}>{attempt.is_correct ? "✓" : "↗"}</span><div className="attempt-info"><b>{task?.title[language] ?? attempt.task_id}</b><small>{new Date(attempt.timestamp).toLocaleString(language === "ru" ? "ru-RU" : "kk-KZ", { dateStyle: "short", timeStyle: "short" })}{attempt.error_type ? " · " + errorCopy[language][attempt.error_type] : ""}</small></div><span className={"attempt-status " + attempt.status}>{attempt.status === "pending" ? (language === "ru" ? "в очереди" : "кезекте") : (language === "ru" ? "синхронизировано" : "синхрондалды")}</span></div>; })}</div></article>
        </section>}
        </>}
      </main>
      <footer className="app-footer"><span>© EsepKarta · {language === "ru" ? "Учимся замечать главное" : "Маңыздысын байқауды үйренеміз"}</span><span className="footer-links"><button onClick={() => openPage("about")}>{ui.about[language]}</button><button onClick={() => openPage("privacy")}>{ui.privacy[language]}</button><span>{language === "ru" ? "Сделано для обучения без границ связи" : "Байланыс шектеуінсіз оқу үшін жасалған"}</span></span></footer>
    </div>
  );
}
