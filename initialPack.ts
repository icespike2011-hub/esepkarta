import busTask from "./bus-task.json";
import { extraTasks } from "./extraTasks";
import { linkTaskToCurriculum } from "./curriculum";
import type { EsepTask, TaskPack } from "../types";

const bus = {
  ...busTask,
  formula_distractor_ids: ["weekend_fare", "old_fare"],
  story: {
    ru: "{{students}} учеников едут на школьный кружок в районный центр в будний день и возвращаются в тот же день. На поездку выделили {{budget}} ₸. У ребят есть ученические карты: по сноске * для них действует льготный тариф. Хватит ли выделенной суммы на дорогу туда и обратно?",
    kz: "{{students}} оқушы жұмыс күні аудан орталығындағы үйірмеге барып, сол күні ауылға қайтады. Жолға {{budget}} ₸ бөлінді. Оқушыларда жеңілдік картасы бар: * ескертпесіне сай оларға жеңілдік тарифі қолданылады. Бөлінген ақша барып-қайтуға жете ме?"
  },
  step2_formula_chips: {
    correct_sequence: ["[Поездки на ученика: {{trips}}]", "[Ученики: {{students}}]", "[Будний тариф: {{fare}} ₸]", "[Оплата после скидки {{discount}}%]"],
    distractor_chips: ["[Тариф выходного дня: {{weekend}} ₸]", "[Прошлогодняя цена: {{old_fare}} ₸]"]
  },
  variants: [
    {
      id: "bus-a",
      item_values: { weekday_fare: 180, students_count: 3, round_trip: 2, student_discount: 50, weekend_fare: 240, old_fare: 160, luggage_fee: 500 },
      tokens: { students: 3, budget: 600, trips: 2, fare: 180, discount: 50, weekend: 240, old_fare: 160 },
      answer_value: 540,
      correct_conclusion_id: "budget_enough",
      wrong_values: { missed_footnote: 1080, distractor_trap: 720, unit_mismatch: 54000, calculation_error: 360 }
    },
    {
      id: "bus-b",
      item_values: { weekday_fare: 170, students_count: 4, round_trip: 2, student_discount: 50, weekend_fare: 230, old_fare: 150, luggage_fee: 500 },
      tokens: { students: 4, budget: 700, trips: 2, fare: 170, discount: 50, weekend: 230, old_fare: 150 },
      answer_value: 680,
      correct_conclusion_id: "budget_enough",
      wrong_values: { missed_footnote: 1360, distractor_trap: 920, unit_mismatch: 68000, calculation_error: 340 }
    },
    {
      id: "bus-c",
      item_values: { weekday_fare: 200, students_count: 5, round_trip: 2, student_discount: 50, weekend_fare: 260, old_fare: 180, luggage_fee: 500 },
      tokens: { students: 5, budget: 900, trips: 2, fare: 200, discount: 50, weekend: 260, old_fare: 180 },
      answer_value: 1000,
      correct_conclusion_id: "budget_short",
      wrong_values: { missed_footnote: 2000, distractor_trap: 1300, unit_mismatch: 100000, calculation_error: 400 }
    }
  ]
} as EsepTask;

const greenhouse: EsepTask = {
  task_id: "greenhouse-cover",
  grade: "8",
  topic: "area",
  title: { ru: "Укрытие для школьной теплицы", kz: "Мектеп жылыжайын жабу" },
  story: {
    ru: "Школьный кружок обновляет плёночное покрытие теплицы. Для расчёта стоимости мастер берёт площадь прямоугольной проекции крыши: нахлёст уже учтён в цене. На материалы выделили {{budget}} ₸. Достаточно ли денег?",
    kz: "Мектеп үйірмесі жылыжайдың үлдір жабынын жаңартады. Құнын есептегенде шебер шатырдың тік төртбұрышты проекциясының ауданын алады: қабаттастыру құнына енгізілген. Материалға {{budget}} ₸ бөлінді. Ақша жете ме?"
  },
  question: {
    ru: "Сколько будет стоить покрытие крыши по её проекции? Введите сумму и сравните её с бюджетом.",
    kz: "Шатырдың проекциясына қажет жабын қанша тұрады? Соманы енгізіп, бюджетпен салыстырыңыз."
  },
  glossary: [
    { term: { ru: "проекция крыши", kz: "шатыр проекциясы" }, simple_explanation: { ru: "Площадь крыши, если смотреть на неё сверху как на прямоугольник.", kz: "Шатырға жоғарыдан қарағандағы тік төртбұрышты аудан." } },
    { term: { ru: "нахлёст", kz: "қабаттастыру" }, simple_explanation: { ru: "Когда края соседних полос материала заходят друг на друга.", kz: "Көршілес материал жолақтарының шеттері бірінің үстіне бірі жабылуы." } },
    { term: { ru: "смета", kz: "шығын есебі" }, simple_explanation: { ru: "Заранее составленный список ожидаемых расходов.", kz: "Алдын ала жасалған жоспарлы шығындар тізімі." } }
  ],
  svg_type: "floor_plan",
  svg_spec: {
    title: { ru: "План теплицы и смета", kz: "Жылыжай жоспары мен шығын есебі" },
    footnote: { ru: "Стоимость плёнки указана за 1 м² проекции крыши; нахлёст включён.", kz: "Үлдір бағасы шатыр проекциясының 1 м² үшін берілген; қабаттастыру құнына енгізілген." },
    items: [
      { element_id: "length", label: { ru: "Длина теплицы", kz: "Жылыжай ұзындығы" }, value: 8, unit: "м", is_needed: true },
      { element_id: "width", label: { ru: "Ширина теплицы", kz: "Жылыжай ені" }, value: 4, unit: "м", is_needed: true },
      { element_id: "film_price", label: { ru: "Плёнка за 1 м²", kz: "Үлдірдің 1 м² бағасы" }, value: 3500, unit: "₸ / м²", is_needed: true },
      { element_id: "old_fence", label: { ru: "Старый забор вдоль теплицы", kz: "Жылыжай жанындағы ескі қоршау" }, value: 7, unit: "м", is_needed: false },
      { element_id: "door_height", label: { ru: "Высота двери", kz: "Есіктің биіктігі" }, value: 2, unit: "м", is_needed: false },
      { element_id: "watering_barrels", label: { ru: "Бочки для полива", kz: "Суару бөшкелері" }, value: 3, unit: "шт.", is_needed: false }
    ],
    floor_plan: { length_id: "length", width_id: "width", label: { ru: "проекция крыши", kz: "шатыр проекциясы" } }
  },
  step2_formula_chips: {
    correct_sequence: ["[Длина: {{length}} м]", "[Ширина: {{width}} м]", "[Цена плёнки: {{price}} ₸/м²]"],
    distractor_chips: ["[Старый забор: {{fence}} м]", "[Высота двери: {{door}} м]"]
  },
  formula_distractor_ids: ["old_fence", "door_height"],
  correct_answer: {
    value: 112000,
    unit: "₸",
    life_conclusion_options: [
      { id: "budget_enough", text: { ru: "Да, выделенного бюджета хватит.", kz: "Иә, бөлінген бюджет жеткілікті." }, is_correct: true },
      { id: "budget_short", text: { ru: "Нет, потребуется больше денег.", kz: "Жоқ, қосымша ақша қажет." }, is_correct: false }
    ]
  },
  error_map: [
    { trigger_distractor_id: "old_fence", error_type: "distractor_trap", highlight_element_id: "old_fence", hint: { ru: "Забор уже существует. Какие размеры задают площадь покрытия крыши?", kz: "Қоршау бұрыннан бар. Шатыр жабынының ауданын қандай өлшемдер анықтайды?" } },
    { wrong_value: 56000, mistake_key: "calculation_error", error_type: "calculation_error", highlight_element_id: "length", hint: { ru: "Сначала найдите площадь прямоугольника, затем умножьте её на цену за квадратный метр.", kz: "Алдымен тік төртбұрыштың ауданын тауып, содан кейін 1 м² бағасына көбейтіңіз." } },
    { wrong_value: 11200000, mistake_key: "unit_mismatch", error_type: "unit_mismatch", highlight_element_id: "film_price", hint: { ru: "Цена дана за квадратный метр. Проверьте, сколько квадратных метров нужно покрыть.", kz: "Баға шаршы метрге берілген. Қанша шаршы метр жабу керегін тексеріңіз." } },
    { wrong_value: 168000, mistake_key: "distractor_trap", error_type: "distractor_trap", highlight_element_id: "door_height", hint: { ru: "Высота двери не задаёт площадь прямоугольной проекции крыши.", kz: "Есіктің биіктігі шатырдың тік төртбұрышты проекциясының ауданын анықтамайды." } }
  ],
  variants: [
    { id: "greenhouse-a", item_values: { length: 8, width: 4, film_price: 3500, old_fence: 7, door_height: 2, watering_barrels: 3 }, tokens: { budget: 120000, length: 8, width: 4, price: 3500, fence: 7, door: 2 }, answer_value: 112000, correct_conclusion_id: "budget_enough", wrong_values: { calculation_error: 56000, unit_mismatch: 11200000, distractor_trap: 168000 } },
    { id: "greenhouse-b", item_values: { length: 9, width: 5, film_price: 3200, old_fence: 8, door_height: 2, watering_barrels: 4 }, tokens: { budget: 150000, length: 9, width: 5, price: 3200, fence: 8, door: 2 }, answer_value: 144000, correct_conclusion_id: "budget_enough", wrong_values: { calculation_error: 72000, unit_mismatch: 14400000, distractor_trap: 160000 } },
    { id: "greenhouse-c", item_values: { length: 8, width: 6, film_price: 3500, old_fence: 6, door_height: 2, watering_barrels: 2 }, tokens: { budget: 160000, length: 8, width: 6, price: 3500, fence: 6, door: 2 }, answer_value: 168000, correct_conclusion_id: "budget_short", wrong_values: { calculation_error: 84000, unit_mismatch: 16800000, distractor_trap: 140000 } }
  ]
};

const electricity: EsepTask = {
  task_id: "electricity-limit",
  grade: "9",
  topic: "graphs",
  title: { ru: "Расход электричества зимой", kz: "Қыстағы электр шығыны" },
  story: {
    ru: "Семья из села проверяет счёт за электричество. По местным условиям повышенный тариф применяется только к расходу сверх нормы {{limit}} кВт·ч в месяц. За декабрь счётчик показал {{actual}} кВт·ч. Нужно определить доплату именно за превышение нормы.",
    kz: "Ауылдағы отбасы электр қуатының төлемін тексеріп отыр. Жергілікті шарт бойынша жоғарылатылған тариф айлық {{limit}} кВт·сағ нормадан асқан бөлікке ғана қолданылады. Желтоқсанда есептегіш {{actual}} кВт·сағ көрсетті. Нормадан асқаны үшін қосымша төлемді есептеңіз."
  },
  question: {
    ru: "Какую доплату начислят за декабрьский расход сверх нормы? Ответ укажите в тенге.",
    kz: "Желтоқсандағы нормадан асқан шығын үшін қанша қосымша төлем алынады? Жауапты теңгемен жазыңыз."
  },
  glossary: [
    { term: { ru: "норма", kz: "норма" }, simple_explanation: { ru: "Заранее установленный объём, в пределах которого действует обычный тариф.", kz: "Қалыпты тариф қолданылатын алдын ала белгіленген көлем." } },
    { term: { ru: "сверх нормы", kz: "нормадан асқан бөлік" }, simple_explanation: { ru: "Только та часть расхода, которая больше установленного лимита.", kz: "Белгіленген шектен асып кеткен шығын бөлігі ғана." } },
    { term: { ru: "кВт·ч", kz: "кВт·сағ" }, simple_explanation: { ru: "Единица, которой измеряют количество использованной электроэнергии.", kz: "Жұмсалған электр энергиясының мөлшерін өлшейтін бірлік." } }
  ],
  svg_type: "line_chart",
  svg_spec: {
    title: { ru: "Показания счётчика по месяцам", kz: "Айлар бойынша есептегіш көрсеткіші" },
    footnote: { ru: "Повышенная ставка начисляется только на разницу между фактом и нормой.", kz: "Жоғары тариф тек нақты шығын мен норманың айырмасына қолданылады." },
    chart: { x_label: { ru: "Месяц", kz: "Ай" }, y_label: { ru: "Расход, кВт·ч", kz: "Шығын, кВт·сағ" }, max_value: 240, points: ["jan", "apr", "dec"] },
    items: [
      { element_id: "jan", label: { ru: "Январь", kz: "Қаңтар" }, value: 130, unit: "кВт·ч", is_needed: false },
      { element_id: "apr", label: { ru: "Апрель", kz: "Сәуір" }, value: 145, unit: "кВт·ч", is_needed: false },
      { element_id: "dec", label: { ru: "Декабрь", kz: "Желтоқсан" }, value: 180, unit: "кВт·ч", is_needed: true },
      { element_id: "limit", label: { ru: "Месячная норма", kz: "Айлық норма" }, value: 150, unit: "кВт·ч", is_needed: true },
      { element_id: "above_rate", label: { ru: "Ставка сверх нормы", kz: "Нормадан асқандағы тариф" }, value: 32, unit: "₸ / кВт·ч", is_needed: true },
      { element_id: "base_rate", label: { ru: "Обычная ставка в пределах нормы", kz: "Норма шегіндегі қалыпты тариф" }, value: 21, unit: "₸ / кВт·ч", is_needed: false },
      { element_id: "prev_dec", label: { ru: "Декабрь прошлого года", kz: "Өткен жылдың желтоқсаны" }, value: 165, unit: "кВт·ч", is_needed: false }
    ]
  },
  step2_formula_chips: {
    correct_sequence: ["[Декабрь: {{actual}} кВт·ч]", "[− Норма: {{limit}} кВт·ч]", "[× Ставка сверх нормы: {{above_rate}} ₸/кВт·ч]"],
    distractor_chips: ["[Обычная ставка: {{base_rate}} ₸/кВт·ч]", "[Прошлый декабрь: {{prev_dec}} кВт·ч]"]
  },
  formula_distractor_ids: ["base_rate", "prev_dec"],
  correct_answer: {
    value: 960,
    unit: "₸",
    life_conclusion_options: [
      { id: "overage_only", text: { ru: "Повышенный тариф применяют только к части сверх нормы.", kz: "Жоғары тариф тек нормадан асқан бөлікке қолданылады." }, is_correct: true },
      { id: "all_usage", text: { ru: "Весь расход за месяц считают по повышенному тарифу.", kz: "Айдағы бүкіл шығын жоғары тарифпен есептеледі." }, is_correct: false }
    ]
  },
  error_map: [
    { trigger_distractor_id: "prev_dec", error_type: "distractor_trap", highlight_element_id: "prev_dec", hint: { ru: "Вопрос о декабрьском расходе этого года. Какую точку показывает нужный месяц?", kz: "Сұрақ биылғы желтоқсан шығыны туралы. Қажетті айды қай нүкте көрсетеді?" } },
    { trigger_distractor_id: "base_rate", error_type: "distractor_trap", highlight_element_id: "base_rate", hint: { ru: "Доплата относится к части выше нормы. Какая ставка указана именно для неё?", kz: "Қосымша төлем нормадан асқан бөлікке қатысты. Оған қай тариф берілген?" } },
    { wrong_value: 5760, mistake_key: "unit_mismatch", error_type: "unit_mismatch", highlight_element_id: "limit", hint: { ru: "Повышенная ставка действует не на весь объём. Сначала отделите расход сверх нормы.", kz: "Жоғары тариф бүкіл көлемге жүрмейді. Алдымен нормадан асқан бөлікті табыңыз." } },
    { wrong_value: 630, mistake_key: "distractor_trap", error_type: "distractor_trap", highlight_element_id: "base_rate", hint: { ru: "Это обычная ставка. Какая цена указана для расхода сверх нормы?", kz: "Бұл қалыпты тариф. Нормадан асқан шығынға қай баға берілген?" } }
  ],
  variants: [
    { id: "electricity-a", item_values: { jan: 130, apr: 145, dec: 180, limit: 150, above_rate: 32, base_rate: 21, prev_dec: 165 }, tokens: { actual: 180, limit: 150, above_rate: 32, base_rate: 21, prev_dec: 165 }, answer_value: 960, correct_conclusion_id: "overage_only", wrong_values: { unit_mismatch: 5760, calculation_error: 630, distractor_trap: 750 } },
    { id: "electricity-b", item_values: { jan: 142, apr: 155, dec: 200, limit: 160, above_rate: 34, base_rate: 22, prev_dec: 178 }, tokens: { actual: 200, limit: 160, above_rate: 34, base_rate: 22, prev_dec: 178 }, answer_value: 1360, correct_conclusion_id: "overage_only", wrong_values: { unit_mismatch: 6800, calculation_error: 640, distractor_trap: 880 } },
    { id: "electricity-c", item_values: { jan: 120, apr: 138, dec: 190, limit: 140, above_rate: 30, base_rate: 20, prev_dec: 172 }, tokens: { actual: 190, limit: 140, above_rate: 30, base_rate: 20, prev_dec: 172 }, answer_value: 1500, correct_conclusion_id: "overage_only", wrong_values: { unit_mismatch: 5700, calculation_error: 700, distractor_trap: 1000 } }
  ]
};

export const initialPack: TaskPack = {
  pack_id: "esepkarta-kz-starter",
  version: 3,
  tasks: [bus, greenhouse, electricity, ...extraTasks].map(linkTaskToCurriculum)
};

export const topicLabels = {
  percentages: { ru: "Проценты и тарифы", kz: "Пайыздар мен тарифтер" },
  area: { ru: "Площадь и смета", kz: "Аудан мен шығын есебі" },
  graphs: { ru: "Графики и расход", kz: "Графиктер мен тұтыну" }
} as const;
