'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ExercisePreview, IntroPreview } from '@/ExercisePreview';
import { supabase } from '@/supabase';
import { STATUS_LABEL, type Status } from '@/types';

interface Exercise {
  id: string;
  order_index: number;
  type: string;
  skill: string;
  cefr: string;
  payload: unknown;
  answer: unknown;
  explanation: string | null;
}
interface Lesson {
  id: number;
  title: string;
  kind: string;
  cefr: string | null;
  status: Status;
  source: string;
  goals: string[];
  target_language: string[];
  est_minutes: number;
  intro: unknown[];
  review_notes: string | null;
  modules: { title: string; stages: { title: string } };
  exercises: Exercise[];
}

export default function ReviewLesson() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [notes, setNotes] = useState('');
  const [raw, setRaw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('lessons')
      .select('id, title, kind, cefr, status, source, goals, target_language, est_minutes, intro, review_notes, modules(title, stages(title)), exercises(id, order_index, type, skill, cefr, payload, answer, explanation)')
      .eq('id', Number(id))
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        const l = data as unknown as Lesson;
        l.exercises.sort((a, b) => a.order_index - b.order_index);
        setLesson(l);
        setNotes(l.review_notes ?? '');
      });
  }, [id]);

  const decide = async (decision: 'approve' | 'request_changes' | 'reject') => {
    if (decision !== 'approve' && !notes.trim()) return setError('Write a note so the writer (or Claude) knows what to fix.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('review_lesson', { p_lesson_id: Number(id), p_decision: decision, p_notes: notes.trim() || null });
    setBusy(false);
    if (error) return setError(error.message);
    router.push('/review');
  };

  if (error && !lesson) return <p className="error">{error}</p>;
  if (!lesson) return <p className="muted">Loading…</p>;

  return (
    <>
      <p><Link href="/review">← Review queue</Link></p>
      <h1>{lesson.title}</h1>
      <p className="muted">
        {lesson.modules.stages.title} · {lesson.modules.title} · {lesson.kind} · {lesson.cefr} · {lesson.est_minutes} min ·{' '}
        {lesson.source === 'ai' ? 'written by Claude' : 'written by a person'} · <span className={`chip ${lesson.status}`}>{STATUS_LABEL[lesson.status]}</span>
      </p>
      <div className="card">
        <b>Brief</b>
        <ul style={{ margin: '4px 0' }}>{lesson.goals.map((g) => <li key={g}>{g}</li>)}</ul>
        {lesson.target_language.length > 0 && <div className="muted">Target language: {lesson.target_language.join(', ')}</div>}
      </div>

      <h2>Introduction</h2>
      <IntroPreview blocks={lesson.intro} />

      <h2 className="row" style={{ justifyContent: 'space-between' }}>
        <span>Exercises ({lesson.exercises.length})</span>
        <button onClick={() => setRaw(!raw)} style={{ fontSize: 13 }}>{raw ? 'Hide' : 'Show'} JSON</button>
      </h2>
      <div className="card">
        {lesson.exercises.map((ex) => (
          <div className="ex" key={ex.id}>
            <div className="muted" style={{ fontSize: 13 }}>
              {ex.order_index}. {ex.type} · {ex.skill} · {ex.cefr}
            </div>
            <ExercisePreview type={ex.type} payload={ex.payload} answer={ex.answer} />
            {ex.explanation && <div className="muted" style={{ fontSize: 13 }}>Explanation: {ex.explanation}</div>}
            {raw && <pre>{JSON.stringify({ payload: ex.payload, answer: ex.answer }, null, 2)}</pre>}
          </div>
        ))}
      </div>

      <h2>Decision</h2>
      <textarea placeholder="Notes (required to request changes or reject)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="primary" disabled={busy} onClick={() => decide('approve')}>Approve and publish</button>
        <button disabled={busy} onClick={() => decide('request_changes')}>Request changes</button>
        <button className="danger" disabled={busy} onClick={() => decide('reject')}>Reject</button>
      </div>
      {error && <p className="error">{error}</p>}
    </>
  );
}
