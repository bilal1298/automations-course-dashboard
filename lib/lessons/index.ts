import type { Lesson, Question } from './types';
import { m1 } from './m1';

export type { Lesson, Question } from './types';

// Modules rewritten in the plain-language format with quizzes. Others fall back to the original handbook.
export const lessons: Record<string, Lesson> = { m1 };

export const allQuestions: Record<string, Question> = Object.fromEntries(
  Object.values(lessons).flatMap(l => [...l.sections.flatMap(s => s.check), ...l.quiz]).map(q => [q.id, q]),
);

export const PASS_MARK = 80;
