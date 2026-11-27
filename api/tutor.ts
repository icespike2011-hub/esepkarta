import { generateText } from "ai";

declare const process: { env: Record<string, string | undefined> };

// ---------------------------------------------------------------------------
// Провайдер ИИ. Выбирается автоматически по тому, какой ключ задан в Vercel:
//   ANTHROPIC_API_KEY                         -> Claude   (модель: ANTHROPIC_MODEL)
//   GEMINI_API_KEY (или GOOGLE_GENERATIVE_AI_API_KEY) -> Gemini (модель: GEMINI_MODEL)
//   AI_GATEWAY_API_KEY                        -> Vercel AI Gateway (модель: AI_GATEWAY_MODEL)
// Если ключей несколько, порядок такой же; принудительно: AI_PROVIDER=anthropic|gemini|gateway.
// Названия моделей не вшиты намертво: если модель устарела, поменяйте переменную, без правки кода.
// ---------------------------------------------------------------------------
type Provider = "anthropic" | "gemini" | "gateway";
const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-haiku-5-5",
  gemini: "gemini-2.5-flash",
  gateway: "nvidia/nemotron-3.5-lightning-free"
};

function providerKeys(): Record<Provider, string | undefined> {
  const env = process.env;
  return {
    anthropic: env.ANTHROPIC_API_KEY,
    gemini: env.GEMINI_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY,
    gateway: env.AI_GATEWAY_API_KEY
  };
}
function activeProvider(): Provider | null {
  const keys = providerKeys();
  const forced = process.env.AI_PROVIDER as Provider | undefined;
  if (forced && keys[forced]) return forced;
  return (["anthropic", "gemini", "gateway"] as Provider[]).find(name => keys[name]) ?? null;
}
function modelFor(provider: Provider) {
  const env = process.env;
  const override = provider === "anthropic" ? env.ANTHROPIC_MODEL : provider === "gemini" ? env.GEMINI_MODEL : env.AI_GATEWAY_MODEL;
  return override?.trim() || DEFAULT_MODELS[provider];
}

class UpstreamError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type CompleteOptions = { system: string; prompt: string; maxTokens: number; timeoutMs: number; json?: boolean };

async function complete(options: CompleteOptions): Promise<string> {
  const provider = activeProvider();
  if (!provider) throw new Error("AI is not configured");
  const model = modelFor(provider);
  const signal = AbortSignal.timeout(options.timeoutMs);
  const keys = providerKeys();

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-api-key": keys.anthropic as string, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: options.maxTokens, system: options.system, messages: [{ role: "user", content: options.prompt }] })
    });
    if (!response.ok) throw new UpstreamError(response.status, `Anthropic ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    return (data.content ?? []).filter(block => block.type === "text").map(block => block.text ?? "").join("");
  }

  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": keys.gemini as string },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        // Запас на внутренние «размышления» модели, иначе ответ может обрезаться.
        generationConfig: { maxOutputTokens: Math.min(options.maxTokens * 2, 16000), ...(options.json ? { responseMimeType: "application/json" } : {}) }
      })
    });
    if (!response.ok) throw new UpstreamError(response.status, `Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return (data.candidates?.[0]?.content?.parts ?? []).map(part => part.text ?? "").join("");
  }

  const result = await generateText({ model, abortSignal: signal, maxOutputTokens: options.maxTokens, system: options.system, prompt: options.prompt });
  return result.text;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const requests = new Map<string, number[]>();

// Темы 7–9 классов. Держите в синхроне с src/data/topics.json.
// Файл самодостаточный, чтобы сборщик функций Vercel не тянул браузерный JSON.
const rawTopics: Array<[string, string, string, string, string[], string[]]> = [
  ["g7-alg-powers", "Степень с натуральным показателем", "Натурал көрсеткішті дәреже", "Записывать произведение одинаковых множителей степенью и выполнять вычисления.", ["степень", "множитель", "показатель"], ["умножение натуральных чисел"]],
  ["g7-alg-polynomials", "Одночлены и многочлены", "Бірмүшелер мен көпмүшелер", "Распознавать одночлены и многочлены, приводить подобные слагаемые.", ["одночлен", "многочлен", "подобные слагаемые"], ["переменные", "распределительное свойство"]],
  ["g7-alg-identities", "Формулы сокращённого умножения", "Қысқаша көбейту формулалары", "Распознавать и применять основные формулы преобразования выражений.", ["квадрат суммы", "разность квадратов"], ["многочлены"]],
  ["g7-alg-linear-equations", "Линейное уравнение", "Сызықтық теңдеу", "Составлять и решать линейные уравнения по условию практической задачи.", ["уравнение", "неизвестное", "баланс"], ["действия с числами", "выражения"]],
  ["g7-alg-linear-function", "Линейная функция и график", "Сызықтық функция және график", "Связывать таблицу значений, формулу и график линейной зависимости.", ["функция", "график", "зависимость", "тариф"], ["координатная плоскость", "таблица значений"]],
  ["g7-alg-systems", "Системы линейных уравнений", "Сызықтық теңдеулер жүйесі", "Решать систему двух линейных уравнений и интерпретировать решение.", ["система", "пересечение", "решение"], ["линейные уравнения"]],
  ["g7-alg-data", "Сбор и представление данных", "Деректерді жинау және ұсыну", "Читать, сравнивать и представлять данные в таблице и диаграмме.", ["таблица", "данные", "диаграмма", "сравнение"], ["натуральные числа", "дроби"]],
  ["g7-geo-measure", "Основные понятия и измерения", "Негізгі ұғымдар мен өлшеулер", "Измерять и сравнивать длины отрезков и величины углов.", ["отрезок", "угол", "длина", "градус"], ["единицы длины"]],
  ["g7-geo-angles", "Смежные и вертикальные углы", "Жанасушы және вертикаль бұрыштар", "Использовать свойства смежных и вертикальных углов.", ["смежные углы", "вертикальные углы"], ["измерение углов"]],
  ["g7-geo-parallel", "Параллельные прямые", "Параллель түзулер", "Распознавать параллельные прямые и применять свойства образованных углов.", ["параллельные прямые", "секущая"], ["виды углов"]],
  ["g7-geo-triangles", "Треугольники и признаки равенства", "Үшбұрыштар және теңдік белгілері", "Применять признаки равенства треугольников для обоснования выводов.", ["треугольник", "равенство", "сторона", "угол"], ["отрезки", "углы"]],
  ["g7-geo-side-angle", "Соотношения сторон и углов", "Қабырғалар мен бұрыштар арасындағы қатынас", "Сравнивать стороны и углы треугольника по их взаимосвязи.", ["стороны", "углы", "треугольник"], ["свойства треугольников"]],
  ["g8-alg-roots", "Квадратные корни", "Квадрат түбірлер", "Находить арифметический квадратный корень и оценивать его значение.", ["квадратный корень", "корень"], ["квадрат числа"]],
  ["g8-alg-quadratics", "Квадратные уравнения", "Квадрат теңдеулер", "Решать квадратные уравнения и проверять корни.", ["квадратное уравнение", "корни"], ["разложение на множители"]],
  ["g8-alg-inequalities", "Неравенства и системы", "Теңсіздіктер және жүйелер", "Решать неравенства и системы неравенств, отмечать решения.", ["неравенство", "система", "числовая прямая"], ["линейные уравнения"]],
  ["g8-alg-functions", "Функции y=x² и y=k/x", "y=x² және y=k/x функциялары", "Исследовать заданные функции по таблице и графику.", ["парабола", "обратная пропорциональность", "график"], ["координатная плоскость", "функции"]],
  ["g8-alg-rational", "Рациональные выражения", "Рационал өрнектер", "Преобразовывать рациональные выражения с учётом допустимых значений.", ["дробное выражение", "ОДЗ", "сокращение"], ["дроби", "разложение на множители"]],
  ["g8-alg-stat-prob", "Элементы статистики и вероятности", "Статистика және ықтималдық элементтері", "Обобщать наборы данных и оценивать вероятность простого события.", ["среднее", "вероятность", "частота"], ["дроби", "проценты"]],
  ["g8-geo-quadrilaterals", "Четырёхугольники", "Төртбұрыштар", "Распознавать виды четырёхугольников и использовать их свойства.", ["параллелограмм", "ромб", "трапеция"], ["параллельные прямые", "углы"]],
  ["g8-geo-area", "Площади фигур", "Фигуралардың ауданы", "Находить площадь плоской фигуры и применять её в практическом контексте.", ["площадь", "прямоугольник", "участок", "теплица"], ["длина", "умножение"]],
  ["g8-geo-pythagoras", "Теорема Пифагора", "Пифагор теоремасы", "Применять теорему Пифагора для нахождения стороны прямоугольного треугольника.", ["гипотенуза", "катет", "прямоугольный треугольник"], ["квадраты", "корни"]],
  ["g8-geo-similarity", "Подобие треугольников", "Үшбұрыштардың ұқсастығы", "Использовать подобие и пропорциональность сторон треугольников.", ["подобие", "масштаб", "пропорция"], ["пропорции", "углы"]],
  ["g9-alg-quadratic-function", "Квадратичная функция", "Квадраттық функция", "Читать и интерпретировать график квадратичной функции.", ["парабола", "вершина", "график"], ["квадратное уравнение", "координатная плоскость"]],
  ["g9-alg-systems", "Системы уравнений с двумя переменными", "Екі айнымалысы бар теңдеулер жүйесі", "Составлять и решать системы уравнений для практических ситуаций.", ["система", "две переменные", "модель"], ["линейные уравнения", "квадратные уравнения"]],
  ["g9-alg-inequalities", "Неравенства второй степени", "Екінші дәрежелі теңсіздіктер", "Решать квадратные неравенства и интерпретировать промежутки решений.", ["квадратное неравенство", "интервал"], ["квадратная функция", "корни"]],
  ["g9-alg-progressions", "Последовательности и прогрессии", "Тізбектер мен прогрессиялар", "Распознавать закономерность последовательности и рассчитывать её члены.", ["последовательность", "арифметическая прогрессия", "геометрическая прогрессия"], ["закономерности", "линейные выражения"]],
  ["g9-alg-comb-stat", "Комбинаторика, вероятность и статистика", "Комбинаторика, ықтималдық және статистика", "Подсчитывать простые варианты и интерпретировать данные и вероятности.", ["комбинаторика", "вероятность", "статистика"], ["таблицы", "дроби", "проценты"]],
  ["g9-geo-trigonometry", "Тригонометрия в прямоугольном треугольнике", "Тікбұрышты үшбұрыштағы тригонометрия", "Связывать стороны и острые углы прямоугольного треугольника.", ["синус", "косинус", "тангенс"], ["прямоугольный треугольник", "отношения сторон"]],
  ["g9-geo-vectors", "Векторы", "Векторлар", "Задавать вектор и выполнять простые операции с векторами.", ["вектор", "координаты", "направление"], ["координатная плоскость"]],
  ["g9-geo-circle", "Окружность и круг", "Шеңбер мен дөңгелек", "Использовать свойства и измерения окружности и круга.", ["радиус", "диаметр", "длина окружности", "площадь круга"], ["длина", "площадь"]],
  ["g9-geo-polygons", "Правильные многоугольники", "Дұрыс көпбұрыштар", "Распознавать правильные многоугольники и применять свойства их углов.", ["многоугольник", "правильный", "угол"], ["углы", "окружность"]]
];
const topicMap = new Map(rawTopics.map(([id, title_ru, title_kk, objective_ru, keywords, prerequisites]) => [id, { id, grade: Number(id.slice(1, 2)), title_ru, title_kk, objective_ru, keywords, prerequisites }]));

function withinLimit(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (requests.get(ip) ?? []).filter(time => now - time < 60_000);
  if (recent.length >= 30) return false;
  recent.push(now); requests.set(ip, recent); return true;
}
function validCalculation(task: any) {
  if (!task || !Number.isFinite(task.answer) || !task.check || !Number.isFinite(task.check.a) || !Number.isFinite(task.check.b)) return false;
  const { a, b, operator } = task.check;
  const computed = operator === "+" ? a + b : operator === "-" ? a - b : operator === "*" ? a * b : operator === "/" && b !== 0 ? a / b : NaN;
  return Number.isFinite(computed) && Math.abs(computed - task.answer) < 1e-8;
}
function validPack(pack: any) {
  const distribution = Array.isArray(pack?.tasks) ? ["basic", "medium", "advanced"].every(level => pack.tasks.filter((task: any) => task.level === level).length >= 2) : false;
  return typeof pack?.theory === "string" && pack.theory.length < 4000 && typeof pack.formula === "string" && pack.formula.length < 300 &&
    Array.isArray(pack.examples) && pack.examples.length === 2 && pack.examples.every((item: any) => typeof item.question === "string" && typeof item.solution === "string") &&
    Array.isArray(pack.tasks) && pack.tasks.length >= 8 && distribution && pack.tasks.every((task: any) => ["basic", "medium", "advanced"].includes(task.level) && ["city", "village", "universal"].includes(task.context) && ["+", "-", "*", "/"].includes(task.check?.operator) && ["question", "hint", "solution", "common_mistake", "unit"].every(key => typeof task[key] === "string" && task[key].length < 1200) && validCalculation(task)) &&
    Array.isArray(pack.mini_test) && pack.mini_test.length === 5 && pack.mini_test.every((item: any) => typeof item.question === "string" && typeof item.answer === "string") && typeof pack.cheat_sheet === "string";
}
function extractJson(text: string) {
  const match = text.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export function GET(): Response {
  return json({ available: activeProvider() !== null });
}

export async function POST(request: Request): Promise<Response> {
  if (!activeProvider()) return json({ error: "AI is not configured" }, 503);
  if (!withinLimit(request)) return json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  try {
    const body = await request.json() as { mode?: string; language?: string; message?: string; history?: Array<{ role: string; text: string }>; topic_id?: string; action?: string };
    const language = body.language === "kz" ? "Kazakh" : "Russian";
    if (body.mode === "study_pack") {
      // Тема берётся только из списка выше; свободный текст ученика в промпт не попадает.
      const topic = topicMap.get(String(body.topic_id ?? ""));
      if (!topic) return json({ error: "Choose a topic from grades 7–9." }, 400);
      const instructions = body.action === "simpler" ? "Use simpler words and shorter steps." : body.action === "different" ? "Explain the same topic in a different way." : body.action === "more" ? "Create a fresh set of practice questions." : "Create the complete study pack.";
      const text = await complete({ maxTokens: 6000, timeoutMs: 22_000, json: true,
        system: `You are a careful mathematics teacher for grade ${topic.grade} in Kazakhstan. Only teach the supplied topic; politely decline unrelated requests. Write all student-facing text in ${language}. ${instructions} Return ONLY JSON with shape {theory:string,formula:string,examples:[{question:string,solution:string},{question:string,solution:string}],tasks:[{level:"basic"|"medium"|"advanced",context:"city"|"village"|"universal",question:string,answer:number,unit:string,hint:string,solution:string,common_mistake:string,check:{a:number,b:number,operator:"+"|"-"|"*"|"/"}}] (8 tasks, at least 2 per level),mini_test:[{question:string,answer:string}] (5 items),cheat_sheet:string}. Every task answer MUST equal the result of its check operands/operator. All arithmetic must be exact and appropriate for grade ${topic.grade}.`,
        prompt: `Allowed topic only: ${topic.title_ru} / ${topic.title_kk}. Objective: ${topic.objective_ru}. Keywords: ${topic.keywords.join(", ")}. Prerequisites: ${topic.prerequisites.join(", ")}. Include real life contexts from both city and village.` });
      const raw = extractJson(text);
      if (!raw) return json({ error: "Could not create a valid study pack. Try again." }, 502);
      let pack: unknown;
      try { pack = JSON.parse(raw); } catch { return json({ error: "Could not create valid JSON. Try again." }, 502); }
      if (!validPack(pack)) return json({ error: "Generated pack failed the answer check. Please retry." }, 502);
      return json({ topic_id: topic.id, lang: body.language === "kz" ? "kz" : "ru", content_json: pack, validated: true, saved_at: new Date().toISOString() });
    }
    if (body.mode === "chat") {
      const message = String(body.message ?? "").slice(0, 1800);
      if (!message.trim()) return json({ error: "Message is required" }, 400);
      const history = Array.isArray(body.history) ? body.history.slice(-8).map(item => `${item.role === "assistant" ? "Tutor" : "Student"}: ${String(item.text).slice(0, 500)}`).join("\n") : "";
      const text = await complete({ maxTokens: 500, timeoutMs: 18_000, system: `You are a patient math tutor for grades 7-9 in Kazakhstan. Reply in ${language}. Only help with mathematics and learning; politely decline unrelated requests. Use simple language, explain where values come from and ask guiding questions before revealing a full solution. Use tenge when relevant. Keep the answer under 160 words.`, prompt: `${history}\nStudent: ${message}` });
      return json({ text });
    }
    if (body.mode === "exercise") {
      const text = await complete({ maxTokens: 900, timeoutMs: 18_000, json: true, system: `Create one original PISA level 2-3 practical math task for a grade 7-9 student in Kazakhstan. Write every field in ${language}. Include 2 plausible distractor values in story. Return ONLY valid JSON with keys title, story, question, answer (number), unit, formula, explanation, conclusion, check:{a:number,b:number,operator:"+"|"-"|"*"|"/"}. Set answer exactly to the check result. Keep arithmetic correct; conclusion must match answer. Use tenge if appropriate.`, prompt: "Create a new practical task about household budget, transport, greenhouse, utilities, mobile data, shopping or ecology. Avoid ambiguous wording." });
      const raw = extractJson(text);
      if (!raw) return json({ error: "Model returned invalid task" }, 502);
      let exercise: any;
      try { exercise = JSON.parse(raw); } catch { return json({ error: "Model returned invalid task" }, 502); }
      if (typeof exercise.title !== "string" || typeof exercise.story !== "string" || typeof exercise.question !== "string" || typeof exercise.answer !== "number" || typeof exercise.formula !== "string" || !validCalculation(exercise)) return json({ error: "Generated task failed answer validation" }, 502);
      return json({ exercise });
    }
    return json({ error: "Unknown mode" }, 400);
  } catch (error) {
    console.error("Tutor API error", error);
    if (error instanceof UpstreamError && error.status === 429) return json({ error: "AI is busy right now. Try again in a minute." }, 429);
    return json({ error: "AI request failed" }, 502);
  }
}
