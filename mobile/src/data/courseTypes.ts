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

export type Question = ChoiceQuestion | BlankQuestion | BlocksQuestion | BugQuestion;

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
