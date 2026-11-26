import topicData from "./topics.json";
import type { EsepTask } from "../types";

export type CurriculumTopic = {
  id: string;
  official_code: string | null;
  grade: 7 | 8 | 9;
  subject: "algebra" | "geometry" | "stats";
  section: string;
  title_ru: string;
  title_kk: string;
  objective_ru: string;
  keywords: string[];
  prerequisites: string[];
  verify: true;
};

export const curriculumTopics = topicData as CurriculumTopic[];

// These are practice links for the current applied tasks, not claims about official codes.
const taskTopicLinks: Record<string, string> = {
  "7:percentages": "g7-alg-linear-function",
  "8:percentages": "g8-alg-rational",
  "7:area": "g7-geo-measure",
  "8:area": "g8-geo-area",
  "9:area": "g8-geo-area",
  "7:graphs": "g7-alg-data",
  "8:graphs": "g8-alg-stat-prob",
  "9:graphs": "g9-alg-comb-stat",
  "7:budget": "g7-alg-linear-equations",
  "8:budget": "g8-alg-stat-prob",
  "9:budget": "g9-alg-comb-stat",
  "7:proportion": "g7-alg-linear-equations",
  "8:proportion": "g8-geo-similarity",
  "9:proportion": "g9-alg-progressions",
  "7:utilities": "g7-alg-data",
  "8:utilities": "g8-alg-stat-prob",
  "9:utilities": "g9-alg-comb-stat",
  "7:distance": "g7-alg-linear-function",
  "8:distance": "g8-alg-functions",
  "9:distance": "g9-alg-quadratic-function"
};

const villageTerms = /село|сельск|теплиц|огород|полив|скот|урожай|ауыл|жылыжай|бақша|суару/i;
const cityTerms = /город|тариф|проезд|мобильн|скидк|қала|жолақы/i;

export function linkTaskToCurriculum(task: EsepTask): EsepTask {
  const context = `${task.title.ru} ${task.story.ru}`;
  const contextTag = villageTerms.test(context) ? "village" : cityTerms.test(context) ? "city" : "universal";
  return {
    ...task,
    curriculum_topic_id: taskTopicLinks[`${task.grade}:${task.topic}`],
    context_tags: [contextTag]
  };
}
