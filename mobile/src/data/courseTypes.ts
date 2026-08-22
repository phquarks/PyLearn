/** Shared shapes for the course content. Kept apart from the units themselves
    so a unit file can import them without importing every other unit. */

export type ChoiceQuestion = {
  type: 'choice';
  prompt: string;
  code?: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type BlankQuestion = {
  type: 'blank';
  prompt: string;
  code: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type BlocksQuestion = {
  type: 'blocks';
  prompt: string;
  options: string[];
  answer: string[];
  explanation: string;
};

export type BugQuestion = {
  type: 'bug';
  prompt: string;
  code: string;
  options: string[];
  answer: string;
  explanation: string;
};

/**
 * Write the code yourself.
 *
 * The other four types can be marked by comparing strings, which is why they
 * came first. This one cannot: `total = a + b` and `total=b+a` are the same
 * program, and a course that insists on one of them is teaching typing rather
 * than Python. So the marking is done by the model, reading the code against
 * `goal` — and `answer` is only ever shown to it as a reference, never to the
 * learner before they have finished.
 */
export type CodeQuestion = {
  type: 'code';
  prompt: string;
  /** what is already in the editor: the shape of the task, never the answer */
  starter: string;
  /** the task in plain words, precise enough to mark against */
  goal: string;
  /** one solution that works, for the marker's reference */
  answer: string;
  explanation: string;
};

export type Question = ChoiceQuestion | BlankQuestion | BlocksQuestion | BugQuestion | CodeQuestion;

export type Lesson = {
  id: number;
  title: string;
  /** MaterialIcons glyph, replacing the web build's Material Symbols ligature */
  icon: string;
  questions: Question[];
};

/**
 * Which of the palette's accents a unit is drawn in. The name is a role, not a
 * colour, so the theme stays the only place hex values live.
 */
export type UnitTone = 'primary' | 'tertiary' | 'success' | 'secondary';

export type Unit = {
  id: number;
  title: string;
  /** one line on the unit card, telling the learner what they walk away with */
  summary: string;
  icon: string;
  tone: UnitTone;
  lessons: Lesson[];
};
