import type { Unit } from '../courseTypes';

/**
 * Units 101-103: what a language model is, and how to talk to one.
 *
 * Written in English like the Python course, so the two read as one app rather
 * than as two half-translated ones.
 *
 * The angle throughout is practical rather than academic. Nobody learning to
 * use a model needs the transformer architecture; they need to know why it
 * invents a library that does not exist, and what to do about it. Where a
 * simplification is load-bearing the explanation says so, because a learner who
 * later finds out they were told a comfortable lie stops trusting the rest.
 */
export const aiFoundations: Unit[] = [
  {
    id: 101,
    title: 'What AI Really Is',
    summary: 'What a language model does, where it comes from, and why it is confident when wrong.',
    icon: 'psychology',
    tone: 'primary',
    lessons: [
      {
        id: 101,
        title: 'Prediction, not thought',
        icon: 'lightbulb',
        questions: [
          {
            type: 'choice',
            prompt: 'At heart, what is a language model doing when it answers you?',
            options: [
              'Predicting what text comes next, one piece at a time',
              'Looking your question up in a database of answers',
              'Searching the internet as you type',
              'Running the code in its head to see what happens',
            ],
            answer: 'Predicting what text comes next, one piece at a time',
            explanation:
              'Everything else it appears to do is built on that one trick, which is why it is so good at plausible text and so unreliable about facts.',
          },
          {
            type: 'choice',
            prompt: 'Why can the same question give you two different answers?',
            options: [
              'The model picks between likely next words with some randomness',
              'The model changes its mind between requests',
              'It remembers being corrected last time',
              'It is a bug that good models do not have',
            ],
            answer: 'The model picks between likely next words with some randomness',
            explanation:
              'That setting is usually called temperature. Turning it down makes answers steadier and duller; there is no setting that makes them true.',
          },
          {
            type: 'bug',
            prompt: 'What is wrong with the reasoning here?',
            code: 'The model wrote this function very confidently,\nso the function is probably correct.',
            options: [
              'Confidence is a property of the writing, not of the code',
              'Nothing, confidence is a good signal',
              'It should have been asked twice',
              'Functions are always correct',
            ],
            answer: 'Confidence is a property of the writing, not of the code',
            explanation:
              'A model has no separate sense of how sure it is. It writes confident prose because confident prose is what it was trained on.',
          },
          {
            type: 'choice',
            prompt: 'Which of these is a model genuinely good at?',
            options: [
              'Turning a rough description into a first draft',
              'Telling you whether a fact is true',
              'Remembering what you said last week',
              'Counting the characters in a long string',
            ],
            answer: 'Turning a rough description into a first draft',
            explanation:
              'Drafting is prediction, which is the thing it does. The other three are memory, truth and arithmetic, none of which it has.',
          },
        ],
      },
      {
        id: 102,
        title: 'Where it learned',
        icon: 'school',
        questions: [
          {
            type: 'choice',
            prompt: 'What did the model learn from?',
            options: [
              'A very large amount of text written by people',
              'A curated encyclopedia of verified facts',
              'Live feeds from the internet',
              'Conversations with its users only',
            ],
            answer: 'A very large amount of text written by people',
            explanation:
              'Which means it learned our habits and our mistakes together. It cannot tell the two apart.',
          },
          {
            type: 'choice',
            prompt: 'A model was trained on text up to a certain date. What is that date called?',
            options: ['The knowledge cutoff', 'The release date', 'The context limit', 'The token budget'],
            answer: 'The knowledge cutoff',
            explanation:
              'Anything after it the model has never seen — including the library version you are actually using.',
          },
          {
            type: 'choice',
            prompt: 'Why does a model often suggest an older way of doing something?',
            options: [
              'The old way appears far more often in the text it learned from',
              'It prefers stable code',
              'New methods are hidden from it',
              'It is trying to keep the answer short',
            ],
            answer: 'The old way appears far more often in the text it learned from',
            explanation:
              'Ten years of tutorials outweigh six months of new documentation. Say which version you are on and it will do better.',
          },
          {
            type: 'blank',
            prompt: 'Complete the sentence about what training gives a model.',
            code: 'Training gives the model ___, not understanding.',
            options: ['patterns', 'facts', 'memories', 'opinions'],
            answer: 'patterns',
            explanation:
              'Patterns are enough to be genuinely useful. They are not enough to be trusted without checking.',
          },
        ],
      },
      {
        id: 103,
        title: 'Tokens',
        icon: 'toll',
        questions: [
          {
            type: 'choice',
            prompt: 'What is a token, roughly?',
            options: [
              'A chunk of text, often a word or part of a word',
              'One letter',
              'One sentence',
              'One question you are allowed to ask',
            ],
            answer: 'A chunk of text, often a word or part of a word',
            explanation:
              'The model never sees letters the way you do. It sees these chunks, which is why it is oddly bad at spelling puzzles.',
          },
          {
            type: 'choice',
            prompt: 'Why is a model bad at "how many letter r are in this word"?',
            options: [
              'It reads chunks, not individual letters',
              'It cannot count at all',
              'The question is too short',
              'Letters are filtered out before it sees them',
            ],
            answer: 'It reads chunks, not individual letters',
            explanation:
              'Knowing this saves you from concluding a model is stupid when it is merely built differently from what you assumed.',
          },
          {
            type: 'choice',
            prompt: 'You are billed per token. Which change actually reduces cost?',
            options: [
              'Pasting only the function you are asking about, not the whole file',
              'Writing in shorter sentences',
              'Asking more politely',
              'Removing all punctuation',
            ],
            answer: 'Pasting only the function you are asking about, not the whole file',
            explanation:
              'Cost follows volume. Trimming what you send also sharpens the answer, so it pays twice.',
          },
          {
            type: 'blank',
            prompt: 'Complete the rule of thumb.',
            code: 'Both what you send and what comes back cost ___.',
            options: ['tokens', 'requests', 'seconds', 'nothing'],
            answer: 'tokens',
            explanation:
              'A long answer you did not need is as expensive as a long question you did not need to ask.',
          },
        ],
      },
      {
        id: 104,
        title: 'The context window',
        icon: 'crop-free',
        questions: [
          {
            type: 'choice',
            prompt: 'What is the context window?',
            options: [
              'How much text the model can hold in view at once',
              'How long you may keep a chat open',
              'The size of the reply',
              'How much it remembers between sessions',
            ],
            answer: 'How much text the model can hold in view at once',
            explanation:
              'Everything outside it might as well never have been written.',
          },
          {
            type: 'choice',
            prompt: 'A very long chat starts forgetting what you agreed at the beginning. Why?',
            options: [
              'The earliest messages have fallen out of the context window',
              'The model got bored',
              'Your account was reset',
              'It only keeps the last question by design',
            ],
            answer: 'The earliest messages have fallen out of the context window',
            explanation:
              'The cure is to restate the decisions that still matter, rather than assuming they are still in view.',
          },
          {
            type: 'choice',
            prompt: 'You start a brand new chat. What does the model remember about yesterday?',
            options: [
              'Nothing, unless the tool sends it again',
              'Everything you have ever told it',
              'Only your name',
              'The last ten messages',
            ],
            answer: 'Nothing, unless the tool sends it again',
            explanation:
              'What feels like memory in a chat app is that app quietly re-sending your history each time.',
          },
          {
            type: 'blocks',
            prompt: 'Assemble the habit that keeps long sessions on track.',
            options: ['restate', 'the decisions', 'that still', 'matter'],
            answer: ['restate', 'the decisions', 'that still', 'matter'],
            explanation:
              'Cheap to do, and it beats discovering three files later that the model reverted to its first assumption.',
          },
        ],
      },
      {
        id: 105,
        title: 'Hallucinations',
        icon: 'report',
        questions: [
          {
            type: 'choice',
            prompt: 'A model invents a library function that does not exist. What happened?',
            options: [
              'It predicted text that looks like a real function name',
              'It found the function in an old version',
              'It made a typing mistake',
              'Someone deleted the function',
            ],
            answer: 'It predicted text that looks like a real function name',
            explanation:
              'This is the single most common way AI code wastes your afternoon. A plausible name is exactly what prediction produces.',
          },
          {
            type: 'choice',
            prompt: 'Which of these is the most reliable way to catch an invented API?',
            options: [
              'Run the code, or check the official documentation',
              'Ask the model if it is sure',
              'Ask the same question again',
              'Read the code carefully',
            ],
            answer: 'Run the code, or check the official documentation',
            explanation:
              'Asking if it is sure just generates more confident text. Only something outside the model can settle it.',
          },
          {
            type: 'bug',
            prompt: 'Why is this a weak check?',
            code: 'Me: Are you certain this function exists?\nModel: Yes, absolutely certain.',
            options: [
              'The answer is generated the same way the mistake was',
              'The question was too short',
              'It should have been asked in code',
              'Nothing, this is a good check',
            ],
            answer: 'The answer is generated the same way the mistake was',
            explanation:
              'You are asking the witness to confirm their own testimony.',
          },
          {
            type: 'choice',
            prompt: 'Where do hallucinations get most dangerous?',
            options: [
              'In things that look right and are never run',
              'In code that crashes immediately',
              'In very long answers',
              'In code the model rewrote twice',
            ],
            answer: 'In things that look right and are never run',
            explanation:
              'A crash tells you at once. A quietly wrong constant, comment or citation can survive to production.',
          },
        ],
      },
    ],
  },
  {
    id: 102,
    title: 'Talking to a Model',
    summary: 'Asking so you get the answer you meant: context, examples, format, iteration.',
    icon: 'chat',
    tone: 'tertiary',
    lessons: [
      {
        id: 106,
        title: 'Say what you want',
        icon: 'edit-note',
        questions: [
          {
            type: 'choice',
            prompt: 'Which request will get the more useful answer?',
            options: [
              'Write a Python function that takes a list of prices and returns the average, ignoring None',
              'Write me some code for prices',
              'Help with Python',
              'Prices function please',
            ],
            answer:
              'Write a Python function that takes a list of prices and returns the average, ignoring None',
            explanation:
              'Inputs, output, and the awkward case. Vagueness in gets guesswork out.',
          },
          {
            type: 'bug',
            prompt: 'What is missing from this prompt?',
            code: 'Fix my code.',
            options: [
              'The code, and what "fixed" would mean',
              'A greeting',
              'The programming language',
              'Nothing, it is fine',
            ],
            answer: 'The code, and what "fixed" would mean',
            explanation:
              'The model cannot see your screen. What it is not told, it invents.',
          },
          {
            type: 'blocks',
            prompt: 'Assemble a request that says what to do and what to avoid.',
            options: ['Sort these names by length,', 'shortest first,', 'without changing', 'the original list'],
            answer: ['Sort these names by length,', 'shortest first,', 'without changing', 'the original list'],
            explanation:
              'The constraint at the end is the half most people leave out, and the half that decides whether the answer is usable.',
          },
          {
            type: 'choice',
            prompt: 'You want a short answer. What works best?',
            options: [
              'Say "answer in two sentences"',
              'Ask nicely for brevity',
              'Use fewer words in your question',
              'Nothing works, length is fixed',
            ],
            answer: 'Say "answer in two sentences"',
            explanation:
              'A concrete limit is a pattern the model can follow. "Be brief" is an adjective it can ignore.',
          },
        ],
      },
      {
        id: 107,
        title: 'Give it the context',
        icon: 'inventory',
        questions: [
          {
            type: 'choice',
            prompt: 'You get an error you do not understand. What should you send with your question?',
            options: [
              'The full error text and the code that raised it',
              'A description of the error from memory',
              'A screenshot description',
              'Just the file name',
            ],
            answer: 'The full error text and the code that raised it',
            explanation:
              'The traceback is the single most information-dense thing you own. Paraphrasing it throws that away.',
          },
          {
            type: 'choice',
            prompt: 'Which detail most often changes the answer for the better?',
            options: [
              'The versions you are actually running',
              'How long you have been stuck',
              'How urgent it is',
              'Your operating system, always',
            ],
            answer: 'The versions you are actually running',
            explanation:
              'Half of all wrong AI code is right code for a version you are not on.',
          },
          {
            type: 'bug',
            prompt: 'Why will this prompt disappoint?',
            code: 'This function is broken, what is wrong with it?\n\n(no function attached)',
            options: [
              'There is nothing to look at, so it will guess',
              'It is too polite',
              'It should name the language',
              'Nothing, the model can infer it',
            ],
            answer: 'There is nothing to look at, so it will guess',
            explanation:
              'And it will guess fluently, which is worse than refusing.',
          },
          {
            type: 'choice',
            prompt: 'When is pasting the whole file the wrong move?',
            options: [
              'When it buries the twenty lines that matter',
              'Always, never paste files',
              'When the file is under 100 lines',
              'When you are in a hurry',
            ],
            answer: 'When it buries the twenty lines that matter',
            explanation:
              'Context helps until it dilutes. Send what is relevant, plus what it needs to understand the relevant part.',
          },
        ],
      },
      {
        id: 108,
        title: 'Show an example',
        icon: 'content-copy',
        questions: [
          {
            type: 'choice',
            prompt: 'You want output in a very particular shape. What is the strongest way to ask?',
            options: [
              'Show one example of the shape you want',
              'Describe the shape in detail',
              'Ask twice',
              'Use capital letters',
            ],
            answer: 'Show one example of the shape you want',
            explanation:
              'A model matches patterns. One example is worth a paragraph of description because it is the pattern itself.',
          },
          {
            type: 'blank',
            prompt: 'Complete the name for this technique.',
            code: 'Giving a couple of examples in the prompt is called ___ prompting.',
            options: ['few-shot', 'deep', 'chain', 'hard'],
            answer: 'few-shot',
            explanation:
              'Zero-shot is asking cold. Few-shot is showing two or three worked cases first.',
          },
          {
            type: 'choice',
            prompt: 'Which example set would teach the pattern best?',
            options: [
              'Two typical cases and one awkward one',
              'Three identical cases',
              'One very long case',
              'Ten cases of the same kind',
            ],
            answer: 'Two typical cases and one awkward one',
            explanation:
              'The awkward one is what tells the model where the edges are. Without it you get the happy path only.',
          },
          {
            type: 'choice',
            prompt: 'Your examples all end with a full stop. What is the model likely to do?',
            options: [
              'End its answers with a full stop too',
              'Ignore the punctuation',
              'Ask you about it',
              'Remove all punctuation',
            ],
            answer: 'End its answers with a full stop too',
            explanation:
              'It copies everything about the pattern, including the parts you did not mean to include. Examples are instructions.',
          },
        ],
      },
      {
        id: 109,
        title: 'Ask for a shape',
        icon: 'data-object',
        questions: [
          {
            type: 'choice',
            prompt: 'Your program needs to read the answer automatically. What should you ask for?',
            options: [
              'JSON, with the exact fields named',
              'A neat paragraph',
              'A bullet list',
              'Whatever it prefers',
            ],
            answer: 'JSON, with the exact fields named',
            explanation:
              'Prose is for people. If code has to read it, say precisely what shape it must arrive in.',
          },
          {
            type: 'bug',
            prompt: 'The reply keeps arriving wrapped in a code fence and your parser breaks. Best fix?',
            code: '```json\n{"ok": true}\n```',
            options: [
              'Ask for JSON only with no fence, and strip fences defensively anyway',
              'Ask again until it stops',
              'Give up on JSON',
              'Parse the fence as JSON',
            ],
            answer: 'Ask for JSON only with no fence, and strip fences defensively anyway',
            explanation:
              'Ask nicely, then handle it not being obeyed. Both halves, because the instruction works most of the time and most is not all.',
          },
          {
            type: 'choice',
            prompt: 'Why does giving the model a role sometimes help?',
            options: [
              'It narrows which patterns the answer is drawn from',
              'The model tries harder',
              'It unlocks better models',
              'It makes answers longer',
            ],
            answer: 'It narrows which patterns the answer is drawn from',
            explanation:
              '"You are reviewing this for security" changes what gets noticed. It is aim, not motivation.',
          },
          {
            type: 'blocks',
            prompt: 'Assemble a request that pins down the output.',
            options: ['Reply with JSON only:', '{"risk": "low|high",', '"reason": "one sentence"}'],
            answer: ['Reply with JSON only:', '{"risk": "low|high",', '"reason": "one sentence"}'],
            explanation:
              'Naming the fields and their allowed values leaves far less room for a creative interpretation.',
          },
        ],
      },
      {
        id: 110,
        title: 'Go round again',
        icon: 'refresh',
        questions: [
          {
            type: 'choice',
            prompt: 'The first answer is close but wrong in one place. What is usually best?',
            options: [
              'Say exactly what is wrong and ask for that part again',
              'Start a new chat from scratch',
              'Ask it to try harder',
              'Accept it and fix it yourself silently',
            ],
            answer: 'Say exactly what is wrong and ask for that part again',
            explanation:
              'Specific correction is the fastest loop there is. "Try again" throws away the ninety percent that was fine.',
          },
          {
            type: 'choice',
            prompt: 'The model keeps repeating the same mistake after three corrections. What now?',
            options: [
              'Start fresh with a better first prompt',
              'Correct it a fourth time',
              'Switch to a longer answer',
              'Ask it to apologise',
            ],
            answer: 'Start fresh with a better first prompt',
            explanation:
              'The wrong answers are still in the context, and everything in the context is a pattern to follow. Sometimes the room needs clearing.',
          },
          {
            type: 'bug',
            prompt: 'What is unhelpful about this correction?',
            code: "Me: That's wrong. Do it properly this time.",
            options: [
              'It does not say which part is wrong',
              'It is too short',
              'It is impolite',
              'Nothing, this is clear',
            ],
            answer: 'It does not say which part is wrong',
            explanation:
              'The model cannot see what you saw. Without the which, it will re-roll at random and may well break the good part.',
          },
          {
            type: 'choice',
            prompt: 'What is worth doing once an answer finally works?',
            options: [
              'Save the prompt that got you there',
              'Delete the chat',
              'Ask for a longer version',
              'Nothing',
            ],
            answer: 'Save the prompt that got you there',
            explanation:
              'A prompt that works is a small tool you have just built. Most people throw it away and rebuild it next week.',
          },
        ],
      },
    ],
  },
  {
    id: 103,
    title: 'AI and Your Code',
    summary: 'Where a model genuinely helps in programming, and where it quietly costs you time.',
    icon: 'terminal',
    tone: 'success',
    lessons: [
      {
        id: 111,
        title: 'Autocomplete',
        icon: 'keyboard',
        questions: [
          {
            type: 'choice',
            prompt: 'Inline completion suggests a whole function body. What should you do first?',
            options: ['Read it', 'Accept it and move on', 'Accept it and run the tests later', 'Reject it'],
            answer: 'Read it',
            explanation:
              'Reading is faster than debugging. This is the entire discipline in two words.',
          },
          {
            type: 'choice',
            prompt: 'What makes inline suggestions markedly better?',
            options: [
              'A clear function name and a short docstring above it',
              'Longer variable names',
              'More blank lines',
              'Writing in English',
            ],
            answer: 'A clear function name and a short docstring above it',
            explanation:
              'The completion is predicted from what is around it. Say what the function is for and the guess gets much sharper.',
          },
          {
            type: 'choice',
            prompt: 'Where is autocomplete most likely to hurt you?',
            options: [
              'In code that is subtly wrong but runs',
              'In code that will not compile',
              'In comments',
              'In test files',
            ],
            answer: 'In code that is subtly wrong but runs',
            explanation:
              'Anything that fails loudly is cheap. The expensive suggestions are the ones that pass on the day you accept them.',
          },
          {
            type: 'blank',
            prompt: 'Complete the habit.',
            code: 'Never accept a suggestion you could not have ___ yourself.',
            options: ['written', 'read', 'typed', 'copied'],
            answer: 'written',
            explanation:
              'Not because you should type it, but because code you do not understand is code nobody can maintain.',
          },
        ],
      },
      {
        id: 112,
        title: 'Explain this code',
        icon: 'menu-book',
        questions: [
          {
            type: 'choice',
            prompt: 'What is a model genuinely excellent at, for an unfamiliar codebase?',
            options: [
              'Explaining what a piece of code appears to do',
              'Telling you why it was written that way',
              'Knowing which parts are still used',
              'Remembering the team decisions behind it',
            ],
            answer: 'Explaining what a piece of code appears to do',
            explanation:
              'The what is on the page. The why lives in people and in history the model never saw.',
          },
          {
            type: 'choice',
            prompt: 'Which question gets a more useful explanation?',
            options: [
              'What does this function return when the list is empty?',
              'Explain this code',
              'Is this good code?',
              'What is this?',
            ],
            answer: 'What does this function return when the list is empty?',
            explanation:
              'A narrow question gets a checkable answer. A broad one gets a summary you cannot verify.',
          },
          {
            type: 'choice',
            prompt: 'The explanation sounds right but you cannot follow one step. Best move?',
            options: [
              'Ask about that one step',
              'Ask for the whole thing again',
              'Assume it is fine',
              'Ask for a longer explanation',
            ],
            answer: 'Ask about that one step',
            explanation:
              'The step you cannot follow is either the thing you needed to learn or the place the explanation went wrong. Both are worth stopping on.',
          },
          {
            type: 'bug',
            prompt: 'What is the flaw in trusting this?',
            code: 'Model: This function is used everywhere\nin the project, so do not change it.',
            options: [
              'It has not seen your project, only what you pasted',
              'It should have counted the uses',
              'It is too cautious',
              'Nothing, that is good advice',
            ],
            answer: 'It has not seen your project, only what you pasted',
            explanation:
              'Claims about your codebase as a whole are guesses unless your tool actually searched it. Grep beats vibes.',
          },
        ],
      },
      {
        id: 113,
        title: 'Finding a bug',
        icon: 'bug-report',
        questions: [
          {
            type: 'choice',
            prompt: 'What should you give a model when hunting a bug?',
            options: [
              'The code, the input, what you expected, and what happened',
              'Just the code',
              'Just the error',
              'A description of the feature',
            ],
            answer: 'The code, the input, what you expected, and what happened',
            explanation:
              'Those four are what a bug report is. Missing any one of them turns diagnosis into guessing.',
          },
          {
            type: 'choice',
            prompt: 'The model suggests three possible causes. What is the right next step?',
            options: [
              'Test the cheapest one to check',
              'Fix all three',
              'Pick the longest explanation',
              'Ask which is most likely',
            ],
            answer: 'Test the cheapest one to check',
            explanation:
              'It has given you hypotheses, not a diagnosis. Ordering them by how fast they can be ruled out is your job.',
          },
          {
            type: 'choice',
            prompt: 'Why is "it works now" after an AI fix a risky place to stop?',
            options: [
              'You may have hidden the symptom rather than fixed the cause',
              'The fix might be slow',
              'The code might be ugly',
              'It is never risky',
            ],
            answer: 'You may have hidden the symptom rather than fixed the cause',
            explanation:
              'A try/except round the whole thing makes any bug disappear. Ask what the cause was, and see whether the answer holds up.',
          },
          {
            type: 'blocks',
            prompt: 'Assemble the follow-up question worth asking after every fix.',
            options: ['Why did', 'this happen,', 'and what else', 'could it affect?'],
            answer: ['Why did', 'this happen,', 'and what else', 'could it affect?'],
            explanation:
              'The second half is the one that finds the other three places with the same mistake.',
          },
        ],
      },
      {
        id: 114,
        title: 'Tests',
        icon: 'fact-check',
        questions: [
          {
            type: 'choice',
            prompt: 'Why are tests an unusually good use of AI?',
            options: [
              'They are tedious to write and you can run them to check',
              'They do not matter if wrong',
              'They are short',
              'Nobody reads them',
            ],
            answer: 'They are tedious to write and you can run them to check',
            explanation:
              'The best AI tasks are the ones where verification is cheap. Tests verify themselves by running.',
          },
          {
            type: 'choice',
            prompt: 'A model writes twelve tests and all pass immediately. What is the first thing to suspect?',
            options: [
              'The tests may not be testing much',
              'The code is perfect',
              'The test runner is broken',
              'Nothing, that is a good sign',
            ],
            answer: 'The tests may not be testing much',
            explanation:
              'Break the function on purpose. Any test that still passes was never a test.',
          },
          {
            type: 'choice',
            prompt: 'Which case do generated tests most often miss?',
            options: ['The empty or missing input', 'The normal case', 'A large input', 'A string input'],
            answer: 'The empty or missing input',
            explanation:
              'The happy path is what most example code shows, so it is what prediction reaches for first. Ask for the edges by name.',
          },
          {
            type: 'blank',
            prompt: 'Complete the check.',
            code: 'A test that never ___ is not a test.',
            options: ['fails', 'runs', 'passes', 'compiles'],
            answer: 'fails',
            explanation:
              'Watch it go red before you trust it green.',
          },
        ],
      },
      {
        id: 115,
        title: 'Refactoring',
        icon: 'auto-fix-high',
        questions: [
          {
            type: 'choice',
            prompt: 'What must exist before you let a model restructure working code?',
            options: [
              'A way to tell if the behaviour changed',
              'A backup of the file',
              'A longer prompt',
              'A code review',
            ],
            answer: 'A way to tell if the behaviour changed',
            explanation:
              'Tests, or at least a script you can run before and after. Refactoring without that is rewriting and hoping.',
          },
          {
            type: 'choice',
            prompt: 'The rewrite is cleaner but you no longer understand one part. What now?',
            options: [
              'Do not merge it until you do',
              'Merge it, it is cleaner',
              'Ask for it to be shortened',
              'Add a comment saying it is complex',
            ],
            answer: 'Do not merge it until you do',
            explanation:
              'You will be the one paged about it at midnight. Clever code you cannot read is a debt with your name on it.',
          },
          {
            type: 'bug',
            prompt: 'What is wrong with this request?',
            code: 'Refactor this 800-line file to be better.',
            options: [
              'Neither the scope nor "better" is defined',
              'The file is too small',
              'It should say please',
              'Nothing, this is clear',
            ],
            answer: 'Neither the scope nor "better" is defined',
            explanation:
              'Better how — shorter, faster, easier to test? Name the goal and the answer stops being a lottery.',
          },
          {
            type: 'choice',
            prompt: 'What size of refactor is easiest to review?',
            options: ['One behaviour at a time', 'The whole file at once', 'Whatever the model offers', 'None'],
            answer: 'One behaviour at a time',
            explanation:
              'A diff you can hold in your head is a diff you can actually check. This is why small steps keep coming up.',
          },
        ],
      },
    ],
  },
];
