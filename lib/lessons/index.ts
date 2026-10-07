import type { Lesson, Question } from './types';
import { m0 } from './m0';
import { m1 } from './m1';
import { m2 } from './m2';
import { m3 } from './m3';
import { m4 } from './m4';
import { m5 } from './m5';
import { m6 } from './m6';
import { m7 } from './m7';
import { m8 } from './m8';
import { m9 } from './m9';
import { m10 } from './m10';
import { m11 } from './m11';
import { m12 } from './m12';
import { m13 } from './m13';
import { m14 } from './m14';
import { m15 } from './m15';
import { m16 } from './m16';
import { m17 } from './m17';

export type { Lesson, LessonSection, Question } from './types';

// Every module in the plain-language format with quizzes.
export const lessons: Record<string, Lesson> = { m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17 };

export const allQuestions: Record<string, Question> = Object.fromEntries(
  Object.values(lessons).flatMap(l => [...l.sections.flatMap(s => s.check), ...l.quiz]).map(q => [q.id, q]),
);

export const PASS_MARK = 80;
