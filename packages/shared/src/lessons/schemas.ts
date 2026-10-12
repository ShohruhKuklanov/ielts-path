// Lesson content: the intro shown before the exercises, plus the shapes used
// by the syllabus files and by AI generation.
import { z } from 'zod/v4';

import { CEFR_LEVELS, SKILLS } from '../types/domain.ts';
import { exerciseContentSchema } from '../exercises/schemas.ts';

export const LESSON_KINDS = [
  'alphabet',
  'phonics',
  'vocabulary',
  'grammar',
  'listening',
  'reading',
  'writing',
  'speaking',
  'strategy',
  'review',
] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

const text = (max = 1000) => z.string().trim().min(1).max(max);

/** One card of the lesson introduction. Beginners see one block per screen. */
export const introBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: text(600) }),
  /** A model sentence with an optional short note, e.g. "She is a doctor." / "she → is". */
  z.object({ type: z.literal('example'), en: text(300), note: text(200).optional() }),
  /** A small table, e.g. I am / you are / he is. */
  z.object({ type: z.literal('table'), rows: z.array(z.array(text(80)).min(1).max(4)).min(1).max(10) }),
  z.object({ type: z.literal('tip'), text: text(300) }),
  z.object({ type: z.literal('image'), imageId: z.uuid(), alt: text(200) }),
  z.object({ type: z.literal('audio'), audioId: z.uuid(), transcript: text(500) }),
]);
export type IntroBlock = z.infer<typeof introBlockSchema>;

/** An exercise inside a lesson file: the content plus its metadata. */
export const lessonExerciseSchema = z.object({
  skill: z.enum(SKILLS),
  cefr: z.enum(CEFR_LEVELS),
  questionTypeTag: z.string().max(60).optional(),
  explanation: text(500).optional(),
  content: exerciseContentSchema,
});
export type LessonExercise = z.infer<typeof lessonExerciseSchema>;

/** A complete lesson as stored in content/ files and produced by AI generation. */
export const lessonFileSchema = z.object({
  title: text(120),
  kind: z.enum(LESSON_KINDS),
  cefr: z.enum(CEFR_LEVELS),
  estMinutes: z.number().int().min(1).max(30),
  intro: z.array(introBlockSchema).min(1).max(12),
  exercises: z.array(lessonExerciseSchema).min(3).max(20),
});
export type LessonFile = z.infer<typeof lessonFileSchema>;

/** The syllabus for one stage: modules with planned lessons (no content yet). */
export const syllabusSchema = z.object({
  stage: z.string(),
  modules: z
    .array(
      z.object({
        title: text(120),
        icon: z.string().max(40).optional(),
        lessons: z
          .array(
            z.object({
              title: text(120),
              kind: z.enum(LESSON_KINDS),
              cefr: z.enum(CEFR_LEVELS),
              /** What the lesson must teach: given to the AI and to human writers. */
              goals: z.array(text(200)).min(1).max(6),
              /** Words or patterns to use, if fixed. */
              targetLanguage: z.array(text(80)).max(40).optional(),
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .min(1),
});
export type Syllabus = z.infer<typeof syllabusSchema>;
export type SyllabusLesson = Syllabus['modules'][number]['lessons'][number];
