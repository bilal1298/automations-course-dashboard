// Rich text conventions used in lesson strings:
//   **bold**, `code`, [[glossary-term]] or [[glossary-term|shown text]]
//   A block whose lines start with "- " or "1. " renders as a list.

export type ChoiceQuestion = {
  id: string;
  kind: 'choice';
  prompt: string;
  code?: string;
  options: { text: string; why: string }[];
  answer: number; // index into options before shuffling
  explain: string;
};

export type OrderQuestion = {
  id: string;
  kind: 'order';
  prompt: string;
  code?: string;
  items: string[]; // in the correct order
  explain: string;
};

export type Question = ChoiceQuestion | OrderQuestion;

export type LessonSection = {
  title: string;
  minutes: number;
  body: string[];
  example?: { caption: string; code: string };
  interview: string;
  check: Question[];
};

export type Device = 'phone' | 'computer';

export type Lesson = {
  intro: string;
  sections: LessonSection[];
  quiz: Question[];
  tasks: { device: Device; plain: string; done: string }[];
};
