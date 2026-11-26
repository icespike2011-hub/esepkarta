import type { Bilingual, EsepTask, TaskVariant, SvgItem } from "../types";

type ExtraSpec = {
  id: string;
  grade: "7" | "8" | "9";
  topic: string;
  title: Bilingual;
  story: Bilingual;
  question: Bilingual;
  svgTitle: Bilingual;
  note: Bilingual;
  items: Array<{ id: string; label: Bilingual; unit: string; needed: boolean }>;
  formula: string[];
  distractors: string[];
  distractorIds: string[];
  unit: string;
  conclusions: Array<{ id: string; text: Bilingual }>;
  correctConclusion: string;
  variants: TaskVariant[];
  distractorHint: Bilingual;
  calculationHint: Bilingual;
};

function makeTask(spec: ExtraSpec): EsepTask {
  const first = spec.variants[0];
  const items: SvgItem[] = spec.items.map(item => ({
    element_id: item.id,
    label: item.label,
    value: first.item_values[item.id] ?? 0,
    unit: item.unit,
    is_needed: item.needed
  }));
  const distractor = spec.distractorIds[0];
  return {
    task_id: spec.id,
    grade: spec.grade,
    topic: spec.topic,
    title: spec.title,
    story: spec.story,
    question: spec.question,
    glossary: [],
    svg_type: "table",
    svg_spec: { title: spec.svgTitle, footnote: spec.note, items },
    step2_formula_chips: { correct_sequence: spec.formula, distractor_chips: spec.distractors },
    formula_distractor_ids: spec.distractorIds,
    correct_answer: {
      value: first.answer_value,
      unit: spec.unit,
      life_conclusion_options: spec.conclusions.map(option => ({
        ...option,
        is_correct: option.id === spec.correctConclusion
      }))
    },
    error_map: [
      { trigger_distractor_id: distractor, error_type: "distractor_trap", highlight_element_id: distractor, hint: spec.distractorHint },
      { wrong_value: first.wrong_values.calculation_error, mistake_key: "calculation_error", error_type: "calculation_error", highlight_element_id: spec.items.find(item => item.needed)?.id ?? distractor, hint: spec.calculationHint }
    ],
    variants: spec.variants
  };
}

export const extraTasks: EsepTask[] = [
  makeTask({
    id: "market-discount", grade: "7", topic: "percentages",
    title: { ru: "Скидка на школьный рюкзак", kz: "Мектеп сөмкесіне жеңілдік" },
    story: { ru: "Перед учебным годом Дана выбирает рюкзак. В магазине действует скидка {{percent}}% от указанной цены. Сколько тенге составит скидка?", kz: "Оқу жылы алдында Дана сөмке таңдап жүр. Дүкенде көрсетілген бағадан {{percent}}% жеңілдік бар. Жеңілдік қанша теңге болады?" },
    question: { ru: "Найди сумму скидки и выбери, сколько останется заплатить.", kz: "Жеңілдік сомасын тауып, төленетін ақшаны таңда." },
    svgTitle: { ru: "Ценник и предложение магазина", kz: "Баға белгісі мен дүкен ұсынысы" },
    note: { ru: "Скидка считается от текущей цены на ценнике.", kz: "Жеңілдік баға белгісіндегі қазіргі бағадан есептеледі." },
    items: [
      { id: "tag_price", label: { ru: "Цена рюкзака", kz: "Сөмкенің бағасы" }, unit: "₸", needed: true },
      { id: "discount_percent", label: { ru: "Скидка", kz: "Жеңілдік" }, unit: "%", needed: true },
      { id: "old_price", label: { ru: "Цена прошлой коллекции", kz: "Өткен топтаманың бағасы" }, unit: "₸", needed: false },
      { id: "loyalty_points", label: { ru: "Баллы на карте магазина", kz: "Дүкен картасындағы ұпай" }, unit: "балл", needed: false }
    ],
    formula: ["[Цена: {{price}} ₸]", "[Умножить на {{percent}}%]", "[Разделить на 100]"],
    distractors: ["[Прошлая цена: {{old}} ₸]"], distractorIds: ["old_price"],
    unit: "₸",
    conclusions: [
      { id: "discount", text: { ru: "Это сумма скидки, рассчитанная от цены на ценнике.", kz: "Бұл — баға белгісіндегі құннан есептелген жеңілдік сомасы." } },
      { id: "old_price", text: { ru: "Считать скидку от старой цены прошлой коллекции.", kz: "Жеңілдікті өткен топтаманың ескі бағасынан есептеу." } }
    ],
    correctConclusion: "discount",
    variants: [
      { id: "market-a", item_values: { tag_price: 6000, discount_percent: 15, old_price: 7200, loyalty_points: 300 }, tokens: { price: 6000, percent: 15, old: 7200 }, answer_value: 900, correct_conclusion_id: "discount", wrong_values: { calculation_error: 90, distractor_trap: 1080 } },
      { id: "market-b", item_values: { tag_price: 8000, discount_percent: 20, old_price: 9000, loyalty_points: 400 }, tokens: { price: 8000, percent: 20, old: 9000 }, answer_value: 1600, correct_conclusion_id: "discount", wrong_values: { calculation_error: 160, distractor_trap: 1800 } },
      { id: "market-c", item_values: { tag_price: 7500, discount_percent: 12, old_price: 8200, loyalty_points: 250 }, tokens: { price: 7500, percent: 12, old: 8200 }, answer_value: 900, correct_conclusion_id: "discount", wrong_values: { calculation_error: 90, distractor_trap: 984 } }
    ],
    distractorHint: { ru: "Скидку считают от сегодняшнего ценника. Какое число относится к текущей покупке?", kz: "Жеңілдік бүгінгі баға белгісінен есептеледі. Қай сан қазіргі сатып алуға қатысты?" },
    calculationHint: { ru: "Чтобы найти процент от числа, умножь цену на процент и раздели на 100.", kz: "Санның пайызын табу үшін бағаны пайызға көбейтіп, 100-ге бөл." }
  }),
  makeTask({
    id: "family-budget", grade: "7", topic: "budget",
    title: { ru: "Покупки для семейного ужина", kz: "Отбасылық кешкі асқа азық-түлік" },
    story: { ru: "Семья выделила {{budget}} ₸ на продукты к ужину. Овощи стоят {{vegetables}} ₸, а крупы и молоко — {{staples}} ₸. Сколько денег останется?", kz: "Отбасы кешкі асқа азық-түлік алуға {{budget}} ₸ бөлді. Көкөніс {{vegetables}} ₸, ал жарма мен сүт {{staples}} ₸ тұрады. Қанша ақша қалады?" },
    question: { ru: "Найди остаток семейного бюджета после этих покупок.", kz: "Осы сатып алулардан кейін отбасылық бюджетте қанша ақша қалатынын тап." },
    svgTitle: { ru: "План расходов", kz: "Шығындар жоспары" },
    note: { ru: "Все суммы указаны в тенге.", kz: "Барлық сома теңгемен берілген." },
    items: [
      { id: "budget", label: { ru: "Бюджет на продукты", kz: "Азық-түлік бюджеті" }, unit: "₸", needed: true },
      { id: "vegetables", label: { ru: "Овощи", kz: "Көкөніс" }, unit: "₸", needed: true },
      { id: "staples", label: { ru: "Крупы и молоко", kz: "Жарма мен сүт" }, unit: "₸", needed: true },
      { id: "delivery", label: { ru: "Доставка прошлой недели", kz: "Өткен аптадағы жеткізу" }, unit: "₸", needed: false }
    ],
    formula: ["[Бюджет: {{budget}} ₸]", "[Вычесть овощи: {{vegetables}} ₸]", "[Вычесть крупы и молоко: {{staples}} ₸]"],
    distractors: ["[Прошлая доставка: {{delivery}} ₸]"], distractorIds: ["delivery"],
    unit: "₸",
    conclusions: [
      { id: "enough", text: { ru: "Деньги на эти покупки остаются.", kz: "Осы сатып алулардан кейін ақша қалады." } },
      { id: "over", text: { ru: "План расходов превышает бюджет.", kz: "Жоспарланған шығын бюджеттен асады." } }
    ],
    correctConclusion: "enough",
    variants: [
      { id: "budget-a", item_values: { budget: 15000, vegetables: 6200, staples: 4500, delivery: 1200 }, tokens: { budget: 15000, vegetables: 6200, staples: 4500, delivery: 1200 }, answer_value: 4300, correct_conclusion_id: "enough", wrong_values: { calculation_error: 10700, distractor_trap: 3100 } },
      { id: "budget-b", item_values: { budget: 18000, vegetables: 7100, staples: 5300, delivery: 1500 }, tokens: { budget: 18000, vegetables: 7100, staples: 5300, delivery: 1500 }, answer_value: 5600, correct_conclusion_id: "enough", wrong_values: { calculation_error: 10900, distractor_trap: 4100 } },
      { id: "budget-c", item_values: { budget: 12000, vegetables: 4800, staples: 3900, delivery: 900 }, tokens: { budget: 12000, vegetables: 4800, staples: 3900, delivery: 900 }, answer_value: 3300, correct_conclusion_id: "enough", wrong_values: { calculation_error: 8100, distractor_trap: 2400 } }
    ],
    distractorHint: { ru: "Для этого ужина нужны только перечисленные покупки. Не прибавляй старую доставку.", kz: "Бұл кешкі асқа тек берілген сатып алулар қажет. Бұрынғы жеткізу ақысын қоспа." },
    calculationHint: { ru: "Сначала сложи расходы, затем вычти их из бюджета.", kz: "Алдымен шығындарды қосып, содан кейін бюджеттен азайт." }
  }),
  makeTask({
    id: "mobile-overage", grade: "8", topic: "percentages",
    title: { ru: "Интернет-пакет для семьи", kz: "Отбасылық интернет пакеті" },
    story: { ru: "В семейном тарифе включено {{included}} ГБ. За месяц использовали {{used}} ГБ. Каждый гигабайт сверх пакета стоит {{rate}} ₸. Какую доплату начислят?", kz: "Отбасылық тарифке {{included}} ГБ кіреді. Бір айда {{used}} ГБ жұмсалды. Пакеттен асқан әр гигабайт {{rate}} ₸ тұрады. Қосымша төлем қанша болады?" },
    question: { ru: "Рассчитай только доплату за интернет сверх включённого пакета.", kz: "Пакетке кірмейтін интернет үшін қосымша төлемді есепте." },
    svgTitle: { ru: "Условия мобильного тарифа", kz: "Ұялы тариф шарттары" },
    note: { ru: "За гигабайты внутри пакета доплаты нет.", kz: "Пакет ішіндегі гигабайттар үшін қосымша төлем алынбайды." },
    items: [
      { id: "included", label: { ru: "Интернет в пакете", kz: "Пакеттегі интернет" }, unit: "ГБ", needed: true },
      { id: "used", label: { ru: "Использовано за месяц", kz: "Бір айда жұмсалды" }, unit: "ГБ", needed: true },
      { id: "rate", label: { ru: "Цена 1 ГБ сверх пакета", kz: "Пакеттен асқан 1 ГБ бағасы" }, unit: "₸ / ГБ", needed: true },
      { id: "plan_fee", label: { ru: "Абонентская плата", kz: "Айлық абоненттік төлем" }, unit: "₸", needed: false }
    ],
    formula: ["[Использовано: {{used}} ГБ]", "[Вычесть пакет: {{included}} ГБ]", "[Умножить на {{rate}} ₸/ГБ]"],
    distractors: ["[Абонентская плата: {{fee}} ₸]"], distractorIds: ["plan_fee"],
    unit: "₸",
    conclusions: [
      { id: "extra", text: { ru: "Доплата начисляется только за ГБ сверх пакета.", kz: "Қосымша төлем пакеттен асқан ГБ үшін ғана алынады." } },
      { id: "all", text: { ru: "Доплата начисляется за весь объём интернета.", kz: "Қосымша төлем интернеттің барлық көлеміне алынады." } }
    ],
    correctConclusion: "extra",
    variants: [
      { id: "mobile-a", item_values: { included: 8, used: 10, rate: 350, plan_fee: 2800 }, tokens: { included: 8, used: 10, rate: 350, fee: 2800 }, answer_value: 700, correct_conclusion_id: "extra", wrong_values: { calculation_error: 2800, distractor_trap: 3500 } },
      { id: "mobile-b", item_values: { included: 10, used: 13, rate: 300, plan_fee: 3200 }, tokens: { included: 10, used: 13, rate: 300, fee: 3200 }, answer_value: 900, correct_conclusion_id: "extra", wrong_values: { calculation_error: 3200, distractor_trap: 3900 } },
      { id: "mobile-c", item_values: { included: 6, used: 9, rate: 250, plan_fee: 2200 }, tokens: { included: 6, used: 9, rate: 250, fee: 2200 }, answer_value: 750, correct_conclusion_id: "extra", wrong_values: { calculation_error: 2200, distractor_trap: 3000 } }
    ],
    distractorHint: { ru: "Абонентская плата уже оплачивает пакет. Найди только объём сверх включённых гигабайтов.", kz: "Абоненттік төлем пакет ақысын қамтиды. Тек пакеттен асқан гигабайтты тап." },
    calculationHint: { ru: "Вычти объём пакета из использованного и умножь остаток на цену за 1 ГБ.", kz: "Жұмсалған көлемнен пакеттегі көлемді азайтып, қалғанын 1 ГБ бағасына көбейт." }
  }),
  makeTask({
    id: "water-norm", grade: "9", topic: "graphs",
    title: { ru: "Расход воды на полив", kz: "Суаруға жұмсалған су" },
    story: { ru: "Школьный сад расходует {{used}} м³ воды за месяц. Норма без повышенной оплаты — {{norm}} м³. За каждый кубометр сверх нормы начисляют {{rate}} ₸. Найди доплату.", kz: "Мектеп бағында бір айда {{used}} м³ су жұмсалады. Қосымша төлемсіз норма — {{norm}} м³. Нормадан асқан әр текше метрге {{rate}} ₸ есептеледі. Қосымша төлемді тап." },
    question: { ru: "Сколько составит плата только за воду сверх нормы?", kz: "Нормадан асқан су үшін ғана төлем қанша болады?" },
    svgTitle: { ru: "Водомер и месячный лимит", kz: "Су есептегіші мен айлық шек" },
    note: { ru: "Повышенный тариф применяется только к превышению.", kz: "Жоғары тариф тек нормадан асқан бөлікке қолданылады." },
    items: [
      { id: "used", label: { ru: "Расход воды за месяц", kz: "Бір айдағы су шығыны" }, unit: "м³", needed: true },
      { id: "norm", label: { ru: "Норма", kz: "Норма" }, unit: "м³", needed: true },
      { id: "rate", label: { ru: "Тариф сверх нормы", kz: "Нормадан асқандағы тариф" }, unit: "₸ / м³", needed: true },
      { id: "last_month", label: { ru: "Расход в прошлом месяце", kz: "Өткен айдағы шығын" }, unit: "м³", needed: false }
    ],
    formula: ["[Расход: {{used}} м³]", "[Вычесть норму: {{norm}} м³]", "[Умножить на {{rate}} ₸/м³]"],
    distractors: ["[Прошлый месяц: {{last}} м³]"], distractorIds: ["last_month"],
    unit: "₸",
    conclusions: [
      { id: "only_extra", text: { ru: "Повышенная оплата берётся только за превышение.", kz: "Жоғары төлем тек нормадан асқан бөлікке алынады." } },
      { id: "all", text: { ru: "Повышенная оплата берётся за весь расход.", kz: "Жоғары төлем бүкіл шығынға алынады." } }
    ],
    correctConclusion: "only_extra",
    variants: [
      { id: "water-a", item_values: { used: 18, norm: 15, rate: 500, last_month: 13 }, tokens: { used: 18, norm: 15, rate: 500, last: 13 }, answer_value: 1500, correct_conclusion_id: "only_extra", wrong_values: { calculation_error: 7500, distractor_trap: 500 } },
      { id: "water-b", item_values: { used: 22, norm: 16, rate: 450, last_month: 14 }, tokens: { used: 22, norm: 16, rate: 450, last: 14 }, answer_value: 2700, correct_conclusion_id: "only_extra", wrong_values: { calculation_error: 9900, distractor_trap: 450 } },
      { id: "water-c", item_values: { used: 17, norm: 12, rate: 600, last_month: 11 }, tokens: { used: 17, norm: 12, rate: 600, last: 11 }, answer_value: 3000, correct_conclusion_id: "only_extra", wrong_values: { calculation_error: 10200, distractor_trap: 600 } }
    ],
    distractorHint: { ru: "Вопрос про этот месяц. Сравни показания с нормой, а прошлый месяц оставь для сравнения.", kz: "Сұрақ осы ай туралы. Көрсеткішті нормамен салыстыр, өткен айды тек салыстыру үшін қалдыр." },
    calculationHint: { ru: "Сначала найди превышение в кубометрах, затем умножь только его на тариф.", kz: "Алдымен нормадан асқан текше метрді тап, содан кейін соны тарифке көбейт." }
  }),
  makeTask({
    id: "recipe-scale", grade: "7", topic: "proportion",
    title: { ru: "Наурыз-көже для гостей", kz: "Қонақтарға арналған наурызкөже" },
    story: { ru: "Рецепт на {{basePeople}} человек требует {{baseFlour}} г крупы. На школьный праздник придут {{people}} человек. Сколько граммов крупы нужно взять, если пропорция сохраняется?", kz: "Рецепт бойынша {{basePeople}} адамға {{baseFlour}} г жарма қажет. Мектеп мерекесіне {{people}} адам келеді. Қатынас өзгермесе, қанша грамм жарма алу керек?" },
    question: { ru: "Масштабируй рецепт пропорционально числу гостей.", kz: "Қонақ санына қарай рецепт мөлшерін пропорционал өзгерт." },
    svgTitle: { ru: "Рецепт и число гостей", kz: "Рецепт пен қонақ саны" },
    note: { ru: "На одного человека берут одинаковую долю ингредиента.", kz: "Әр адамға ингредиенттің бірдей үлесі алынады." },
    items: [
      { id: "base_people", label: { ru: "Порций в исходном рецепте", kz: "Бастапқы рецепттегі үлес" }, unit: "чел.", needed: true },
      { id: "base_flour", label: { ru: "Крупа в исходном рецепте", kz: "Бастапқы рецепттегі жарма" }, unit: "г", needed: true },
      { id: "people", label: { ru: "Гостей на празднике", kz: "Мерекедегі қонақтар" }, unit: "чел.", needed: true },
      { id: "rice_price", label: { ru: "Цена крупы в прошлом месяце", kz: "Өткен айдағы жарма бағасы" }, unit: "₸/кг", needed: false }
    ],
    formula: ["[Крупа: {{flour}} г]", "[Разделить на {{base}} порций]", "[Умножить на {{people}} гостей]"],
    distractors: ["[Прошлая цена: {{price}} ₸/кг]"], distractorIds: ["rice_price"],
    unit: "г",
    conclusions: [
      { id: "scale", text: { ru: "Каждому гостю достанется одинаковая порция.", kz: "Әр қонаққа бірдей үлес тиеді." } },
      { id: "not_scale", text: { ru: "Рецепт нужно оставить без изменений.", kz: "Рецептті өзгертпей қалдыру керек." } }
    ],
    correctConclusion: "scale",
    variants: [
      { id: "recipe-a", item_values: { base_people: 4, base_flour: 300, people: 8, rice_price: 950 }, tokens: { basePeople: 4, baseFlour: 300, people: 8, flour: 300, base: 4, price: 950 }, answer_value: 600, correct_conclusion_id: "scale", wrong_values: { calculation_error: 2400, distractor_trap: 950 } },
      { id: "recipe-b", item_values: { base_people: 5, base_flour: 400, people: 10, rice_price: 1100 }, tokens: { basePeople: 5, baseFlour: 400, people: 10, flour: 400, base: 5, price: 1100 }, answer_value: 800, correct_conclusion_id: "scale", wrong_values: { calculation_error: 4000, distractor_trap: 1100 } },
      { id: "recipe-c", item_values: { base_people: 6, base_flour: 450, people: 12, rice_price: 1000 }, tokens: { basePeople: 6, baseFlour: 450, people: 12, flour: 450, base: 6, price: 1000 }, answer_value: 900, correct_conclusion_id: "scale", wrong_values: { calculation_error: 2700, distractor_trap: 1000 } }
    ],
    distractorHint: { ru: "Стоимость крупы не нужна: вопрос о количестве ингредиента, а не о цене.", kz: "Жарманың бағасы қажет емес: сұрақ баға туралы емес, ингредиент мөлшері туралы." },
    calculationHint: { ru: "Сначала найди количество крупы на одного человека, затем умножь на число гостей.", kz: "Алдымен бір адамға кететін жарма мөлшерін тап, содан кейін қонақ санына көбейт." }
  }),
  makeTask({
    id: "seed-plan", grade: "8", topic: "area",
    title: { ru: "Семена для школьного огорода", kz: "Мектеп бақшасына арналған тұқым" },
    story: { ru: "Площадь грядок школьного огорода — {{area}} м². Для каждого квадратного метра нужно {{norm}} г семян. Сколько граммов нужно купить?", kz: "Мектеп бақшасындағы жүйектердің ауданы {{area}} м². Әр шаршы метрге {{norm}} г тұқым қажет. Қанша грамм тұқым сатып алу керек?" },
    question: { ru: "Рассчитай нужную массу семян для всех грядок.", kz: "Барлық жүйекке қажет тұқым массасын есепте." },
    svgTitle: { ru: "План участка и норма посева", kz: "Жер телімінің жоспары мен себу мөлшері" },
    note: { ru: "Норма указана на 1 м².", kz: "Мөлшер 1 м² үшін берілген." },
    items: [
      { id: "area", label: { ru: "Площадь грядок", kz: "Жүйектер ауданы" }, unit: "м²", needed: true },
      { id: "norm", label: { ru: "Семян на 1 м²", kz: "1 м²-ге арналған тұқым" }, unit: "г", needed: true },
      { id: "fence", label: { ru: "Длина ограды участка", kz: "Жер телімінің қоршау ұзындығы" }, unit: "м", needed: false },
      { id: "beds", label: { ru: "Число грядок", kz: "Жүйектер саны" }, unit: "шт.", needed: false }
    ],
    formula: ["[Площадь: {{area}} м²]", "[Умножить на норму: {{norm}} г/м²]"],
    distractors: ["[Ограда: {{fence}} м]"], distractorIds: ["fence"],
    unit: "г",
    conclusions: [
      { id: "mass", text: { ru: "Нужна указанная масса семян для всех грядок.", kz: "Барлық жүйекке есептелген тұқым массасы қажет." } },
      { id: "per_bed", text: { ru: "Норма дана на одну грядку, а не на площадь.", kz: "Мөлшер ауданға емес, бір жүйекке берілген." } }
    ],
    correctConclusion: "mass",
    variants: [
      { id: "seed-a", item_values: { area: 12, norm: 25, fence: 18, beds: 4 }, tokens: { area: 12, norm: 25, fence: 18 }, answer_value: 300, correct_conclusion_id: "mass", wrong_values: { calculation_error: 37, distractor_trap: 450 } },
      { id: "seed-b", item_values: { area: 16, norm: 20, fence: 22, beds: 5 }, tokens: { area: 16, norm: 20, fence: 22 }, answer_value: 320, correct_conclusion_id: "mass", wrong_values: { calculation_error: 36, distractor_trap: 440 } },
      { id: "seed-c", item_values: { area: 15, norm: 30, fence: 20, beds: 3 }, tokens: { area: 15, norm: 30, fence: 20 }, answer_value: 450, correct_conclusion_id: "mass", wrong_values: { calculation_error: 45, distractor_trap: 600 } }
    ],
    distractorHint: { ru: "Ограда измеряется в метрах, а норму семян считают на квадратный метр.", kz: "Қоршау метрмен өлшенеді, ал тұқым мөлшері шаршы метрге есептеледі." },
    calculationHint: { ru: "Проверь единицы: м² умножаются на г/м², и в ответе остаются граммы.", kz: "Өлшем бірлігін тексер: м² пен г/м² көбейтілгенде жауап граммен шығады." }
  })
];



