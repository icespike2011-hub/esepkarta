export type Language = "ru" | "kz";
export type ErrorType = "missed_footnote" | "distractor_trap" | "unit_mismatch" | "calculation_error";
export type Bilingual = { ru: string; kz: string };
export type SvgType = "table" | "line_chart" | "floor_plan";

export type SvgItem = {
  element_id: string;
  label: Bilingual;
  value: string | number;
  unit: string;
  is_needed: boolean;
};

export type ErrorRule = {
  wrong_value?: number;
  trigger_distractor_id?: string;
  mistake_key?: string;
  error_type: ErrorType;
  highlight_element_id: string;
  hint: Bilingual;
};

export type AnswerOption = {
  id: string;
  text: Bilingual;
  is_correct: boolean;
};

export type TaskVariant = {
  id: string;
  item_values: Record<string, string | number>;
  tokens?: Record<string, string | number>;
  answer_value: number;
  correct_conclusion_id: string;
  wrong_values: Partial<Record<string, number>>;
};

export type EsepTask = {
  task_id: string;
  grade: "7" | "8" | "9";
  topic: string;
  curriculum_topic_id?: string;
  context_tags?: Array<"city" | "village" | "universal">;
  title: Bilingual;
  story: Bilingual;
  question: Bilingual;
  glossary: Array<{ term: Bilingual; simple_explanation: Bilingual }>;
  svg_type: SvgType;
  svg_spec: {
    title: Bilingual;
    footnote: Bilingual;
    items: SvgItem[];
    chart?: { x_label: Bilingual; y_label: Bilingual; max_value: number; points: string[] };
    floor_plan?: { length_id: string; width_id: string; label: Bilingual };
  };
  step2_formula_chips: { correct_sequence: string[]; distractor_chips: string[] };
  formula_distractor_ids?: string[];
  correct_answer: { value: number; unit: string; life_conclusion_options: AnswerOption[] };
  error_map: ErrorRule[];
  variants: TaskVariant[];
};

export type AttemptStatus = "pending" | "synced";
export type SyncAttempt = {
  attempt_id: string;
  task_id: string;
  is_correct: boolean;
  error_type: ErrorType | null;
  timestamp: string;
  status: AttemptStatus;
};

export type StoredTaskPack = {
  pack_id: string;
  version: number;
  tasks: EsepTask[];
  size_bytes: number;
  saved_at: string;
};

export type TaskPack = Omit<StoredTaskPack, "size_bytes" | "saved_at">;

export type LocalStudyPack = {
  id: string;
  topic_id: string;
  lang: Language;
  content_json: {
    theory: string;
    formula: string;
    examples: Array<{ question: string; solution: string }>;
    tasks: Array<{ level: "basic" | "medium" | "advanced"; context: "city" | "village" | "universal"; question: string; answer: number; unit: string; hint: string; solution: string; common_mistake: string; check: { a: number; b: number; operator: "+" | "-" | "*" | "/" } }>;
    mini_test: Array<{ question: string; answer: string }>;
    cheat_sheet: string;
  };
  validated: boolean;
  usage_count: number;
  saved_at: string;
};
