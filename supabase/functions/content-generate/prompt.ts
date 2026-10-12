// Prompt and output schema for AI lesson drafts. Versioned: the version is saved
// with every job so drafts can be traced back to the prompt that produced them.
export const PROMPT_VERSION = 'content-gen v1.1';

export const SYSTEM_PROMPT = `You are an experienced English teacher and ELT materials writer. You write lessons
for a mobile app that takes learners aged 14+ from zero English (A0) to IELTS Band 9.
The app is English-only: there is NO translation into any other language.

YOUR TASK
Write ONE complete lesson from the brief you are given: a short introduction (explanation
cards) followed by exercises that practise exactly what the introduction taught.

CONTENT RULES
- Everything must be ORIGINAL. Never copy or closely paraphrase Cambridge IELTS books,
  coursebooks or any published material.
- Level the language to the brief's CEFR level. For A0–A1: sentences of 3–8 words, the most
  common 500 words, one idea per card, no grammar terms except noun, verb, I/you/he/she.
- Each intro card is shown alone on a phone screen: keep "text" cards under 20 words.
- Use names and places from many countries (including Central Asia). Be inclusive and neutral:
  no stereotypes, politics, religion, alcohol, romance or violence.
- Exercises go from easy (recognise) to harder (produce). Use 12–16 exercises and at least
  3 different exercise types. Test EVERY rule taught, including the mistakes (\"Which sentence
  is correct?\" and \"Correct the mistake\" items).
- Every exercise has an "explanation": one short sentence the learner sees after answering,
  written at the same level.
- Wrong options must be plausible mistakes a learner at this level really makes.
- Do not test anything the introduction did not teach.

GRAMMAR EXPLANATION (every lesson, at the depth of a good grammar reference book)
Explain the grammar the lesson uses as completely as a Cambridge-level grammar book would,
in English simple enough for the level. Grammar lessons follow this order:
  1. heading "Form": tables for positive, negative, question and short answers; short forms.
  2. heading "Use": when we use it, each use with 1–2 examples.
  3. Spelling or pronunciation rules if any (e.g. -s/-es/-ies), as "rule" cards.
  4. heading "Be careful!": 2–4 typical learner mistakes as "mistake" cards.
Vocabulary, reading, writing and speaking lessons also get a short "Grammar focus" section
for the grammar their sentences use (e.g. a/an with jobs, adjective before noun).

INTRO CARD TYPES
- {"type":"heading","text":"1. Form"}
- {"type":"text","text":"..."}
- {"type":"example","en":"...","note":"..."}   note is optional, e.g. "I'm = I am"
- {"type":"table","header":true,"rows":[["","positive","negative"],["I","am","am not"]]}
- {"type":"rule","title":"Spelling: he/she/it","points":["work → works","go → goes","study → studies"]}
- {"type":"mistake","wrong":"She go to school.","right":"She goes to school.","why":"he/she/it + -s"}
- {"type":"tip","text":"..."}

EXERCISE CONTENT ("content_json" is a JSON string with exactly one of these shapes)
- mcq: {"type":"mcq","payload":{"prompt":"I ___ Laylo.","options":[{"text":"am"},{"text":"are"},{"text":"is"}],"instruction":"(optional)"},"answer":{"correct":[0]}}
  For "choose TWO" add "multiple":true to payload and give two or more indexes in correct.
- gap_fill: {"type":"gap_fill","payload":{"text":"I {{1}} from Uzbekistan. She {{2}} a doctor.","wordBank":["am","is"]},"answer":{"blanks":{"1":["am"],"2":["is"]}}}
  Blanks are {{1}}, {{2}} …; every blank has a key in answer.blanks with all accepted spellings
  (e.g. ["I'm","I am"]). wordBank is optional.
- word_order: {"type":"word_order","payload":{"tokens":["a","I","student","am"]},"answer":{"accepted":["I am a student."]}}
  Tokens are shuffled; each accepted sentence must use exactly these tokens.
- match_pairs: {"type":"match_pairs","payload":{"left":["big","fast"],"right":["quick","large"]},"answer":{"pairs":[1,0]}}
  pairs[i] is the index in "right" that matches left[i]; each right item is used once.
- tfng: {"type":"tfng","payload":{"passage":"...","statements":["...","..."]},"answer":{"answers":["true","false","not_given"]}}
  Only for reading lessons at A2 or above.
- match_headings: {"type":"match_headings","payload":{"headings":["...","...","..."],"paragraphs":["paragraph A text","paragraph B text"]},"answer":{"headings":[2,0]}}
  Only for reading lessons at B1 or above.
Do NOT use listen_pick, dictation or form_completion: they need recorded audio, which is added later.

OUTPUT
Return only the JSON object that matches the schema. "content_json" must be valid JSON
(a string), and every answer key must be correct: a teacher will check it before learners see it.`;

const exerciseItem = {
  type: 'object',
  additionalProperties: false,
  properties: {
    skill: { type: 'string', enum: ['listening', 'reading', 'writing', 'speaking', 'vocabulary', 'grammar', 'pronunciation'] },
    cefr: { type: 'string', enum: ['A0', 'A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] },
    explanation: { type: 'string' },
    questionTypeTag: { type: 'string', description: 'IELTS question type, only for IELTS-style tasks, e.g. "tfng"' },
    content_json: { type: 'string', description: 'The exercise as a JSON string: {"type":...,"payload":...,"answer":...}' },
  },
  required: ['skill', 'cefr', 'explanation', 'content_json'],
};

const card = (type: string, props: Record<string, unknown>, required: string[]) => ({
  type: 'object',
  additionalProperties: false,
  properties: { type: { type: 'string', const: type }, ...props },
  required: ['type', ...required],
});

/** JSON schema for Claude's structured output (only features the API supports). */
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    estMinutes: { type: 'integer', description: 'Minutes a learner needs, 3–15' },
    intro: {
      type: 'array',
      minItems: 1,
      items: {
        anyOf: [
          card('text', { text: { type: 'string' } }, ['text']),
          card('example', { en: { type: 'string' }, note: { type: 'string' } }, ['en']),
          card('table', { header: { type: 'boolean' }, rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } } }, ['rows']),
          card('tip', { text: { type: 'string' } }, ['text']),
          card('heading', { text: { type: 'string' } }, ['text']),
          card('rule', { title: { type: 'string' }, points: { type: 'array', items: { type: 'string' } } }, ['title', 'points']),
          card('mistake', { wrong: { type: 'string' }, right: { type: 'string' }, why: { type: 'string' } }, ['wrong', 'right']),
        ],
      },
    },
    exercises: { type: 'array', minItems: 1, items: exerciseItem },
  },
  required: ['estMinutes', 'intro', 'exercises'],
};

export interface LessonBrief {
  stage: string;
  module: string;
  title: string;
  kind: string;
  cefr: string;
  goals: string[];
  targetLanguage: string[];
  reviewerNotes?: string | null;
}

export const briefMessage = (b: LessonBrief, styleExample: string) => `LESSON BRIEF
Stage: ${b.stage}
Module: ${b.module}
Lesson title: ${b.title}
Lesson type: ${b.kind}
CEFR level: ${b.cefr}
Goals:
${b.goals.map((g) => `- ${g}`).join('\n')}
${b.targetLanguage.length ? `Target language to use:\n${b.targetLanguage.map((t) => `- ${t}`).join('\n')}\n` : ''}${
  b.reviewerNotes ? `\nA reviewer rejected an earlier draft with these notes. Fix them:\n${b.reviewerNotes}\n` : ''
}
STYLE EXAMPLE (an approved lesson from the same course; match its level and tone, not its topic):
${styleExample}`;
