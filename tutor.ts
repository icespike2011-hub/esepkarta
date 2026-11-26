import { generateText } from "ai";

declare const process: { env: Record<string, string | undefined> };

// Vercel's currently free-tier model, so the tutor can work without prepaid credits.
const MODEL = "nvidia/nemotron-3.5-lightning-free";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const requests = new Map<string, number[]>();
// Keep the serverless route self-contained: Vercel's function bundler should not need
// to load the full browser curriculum JSON just to answer the health check.
const allowedTopicIds = [
  "g7-alg-powers","g7-alg-polynomials","g7-alg-identities","g7-alg-linear-equations","g7-alg-linear-function","g7-alg-systems","g7-alg-data",
  "g7-geo-measure","g7-geo-angles","g7-geo-parallel","g7-geo-triangles","g7-geo-side-angle",
  "g8-alg-roots","g8-alg-quadratics","g8-alg-inequalities","g8-alg-functions","g8-alg-rational","g8-alg-stat-prob",
  "g8-geo-quadrilaterals","g8-geo-area","g8-geo-pythagoras","g8-geo-similarity",
  "g9-alg-quadratic-function","g9-alg-systems","g9-alg-inequalities","g9-alg-progressions","g9-alg-comb-stat",
  "g9-geo-trigonometry","g9-geo-vectors","g9-geo-circle","g9-geo-polygons"
];
const topicMap = new Map(allowedTopicIds.map(id => [id, {
  id, grade: Number(id.slice(1, 2)), title_ru: id, title_kk: id,
  keywords: [] as string[], objective_ru: `Practice mathematics topic ${id}.`, prerequisites: [] as string[]
}]));
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

export function GET(): Response {
  return json({ available: Boolean(process.env.AI_GATEWAY_API_KEY) });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.AI_GATEWAY_API_KEY) return json({ error: "AI is not configured" }, 503);
  if (!withinLimit(request)) return json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  try {
    const body = await request.json() as { mode?: string; language?: string; message?: string; history?: Array<{ role: string; text: string }>; topic_id?: string; action?: string; subject_text?: string };
    const language = body.language === "kz" ? "Kazakh" : "Russian";
    if (body.mode === "study_pack") {
      const topic = topicMap.get(String(body.topic_id ?? ""));
      if (!topic) return json({ error: "Choose a topic from grades 7–9." }, 400);
      const searchText = String(body.subject_text ?? "").trim().slice(0, 300);
      if (searchText && ![topic.title_ru, topic.title_kk, ...topic.keywords].some(word => searchText.toLocaleLowerCase().includes(word.toLocaleLowerCase()))) return json({ error: "The request does not match the selected math topic." }, 400);
      const instructions = body.action === "simpler" ? "Use simpler words and shorter steps." : body.action === "different" ? "Explain the same topic in a different way." : body.action === "more" ? "Create a fresh set of practice questions." : "Create the complete study pack.";
      const result = await generateText({ model: MODEL, abortSignal: AbortSignal.timeout(22_000), maxOutputTokens: 5000,
        system: `You are a careful mathematics teacher for grade ${topic.grade} in Kazakhstan. Only teach the supplied topic; politely decline unrelated requests. Write all student-facing text in ${language}. ${instructions} Return ONLY JSON with shape {theory:string,formula:string,examples:[{question:string,solution:string},{question:string,solution:string}],tasks:[{level:"basic"|"medium"|"advanced",context:"city"|"village"|"universal",question:string,answer:number,unit:string,hint:string,solution:string,common_mistake:string,check:{a:number,b:number,operator:"+"|"-"|"*"|"/"}}] (8 tasks, at least 2 per level),mini_test:[{question:string,answer:string}] (5 items),cheat_sheet:string}. Every task answer MUST equal the result of its check operands/operator. All arithmetic must be exact and appropriate for grade ${topic.grade}.`,
        prompt: `Allowed topic only: ${topic.title_ru} / ${topic.title_kk}. Objective: ${topic.objective_ru}. Keywords: ${topic.keywords.join(", ")}. Prerequisites: ${topic.prerequisites.join(", ")}. Include real life contexts from both city and village.` });
      const match = result.text.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "Could not create a valid study pack. Try again." }, 502);
      let pack: unknown;
      try { pack = JSON.parse(match[0]); } catch { return json({ error: "Could not create valid JSON. Try again." }, 502); }
      if (!validPack(pack)) return json({ error: "Generated pack failed the answer check. Please retry." }, 502);
      return json({ topic_id: topic.id, lang: body.language === "kz" ? "kz" : "ru", content_json: pack, validated: true, saved_at: new Date().toISOString() });
    }
    if (body.mode === "chat") {
      const message = String(body.message ?? "").slice(0, 1800);
      if (!message.trim()) return json({ error: "Message is required" }, 400);
      const history = Array.isArray(body.history) ? body.history.slice(-8).map(item => `${item.role === "assistant" ? "Tutor" : "Student"}: ${String(item.text).slice(0, 500)}`).join("\n") : "";
      const result = await generateText({ model: MODEL, abortSignal: AbortSignal.timeout(18_000), maxOutputTokens: 500, system: `You are a patient math tutor for grades 7-9 in Kazakhstan. Reply in ${language}. Only help with mathematics and learning; politely decline unrelated requests. Use simple language, explain where values come from and ask guiding questions before revealing a full solution. Use tenge when relevant. Keep the answer under 160 words.`, prompt: `${history}\nStudent: ${message}` });
      return json({ text: result.text });
    }
    if (body.mode === "exercise") {
      const result = await generateText({ model: MODEL, abortSignal: AbortSignal.timeout(18_000), maxOutputTokens: 900, system: `Create one original PISA level 2-3 practical math task for a grade 7-9 student in Kazakhstan. Write every field in ${language}. Include 2 plausible distractor values in story. Return ONLY valid JSON with keys title, story, question, answer (number), unit, formula, explanation, conclusion, check:{a:number,b:number,operator:"+"|"-"|"*"|"/"}. Set answer exactly to the check result. Keep arithmetic correct; conclusion must match answer. Use tenge if appropriate.`, prompt: "Create a new practical task about household budget, transport, greenhouse, utilities, mobile data, shopping or ecology. Avoid ambiguous wording." });
      const match = result.text.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "Model returned invalid task" }, 502);
      const exercise = JSON.parse(match[0]);
      if (typeof exercise.title !== "string" || typeof exercise.story !== "string" || typeof exercise.question !== "string" || typeof exercise.answer !== "number" || typeof exercise.formula !== "string" || !validCalculation(exercise)) return json({ error: "Generated task failed answer validation" }, 502);
      return json({ exercise });
    }
    return json({ error: "Unknown mode" }, 400);
  } catch (error) {
    console.error("Tutor API error", error);
    return json({ error: "AI request failed" }, 502);
  }
}
