'use client';
// The course tree: stage → module → lesson, with one-click AI drafting for planned lessons.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { callFunction, supabase } from '@/supabase';
import { STATUS_LABEL, type StageRow } from '@/types';

export default function Content() {
  const [stages, setStages] = useState<StageRow[] | null>(null);
  const [open, setOpen] = useState<string>('foundation');
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('stages')
      .select('id, order_index, code, title, modules(id, order_index, title, lessons(id, order_index, title, kind, cefr, status, source, goals, target_language, est_minutes, review_notes))')
      .order('order_index');
    if (error) return setMessage({ ok: false, text: error.message });
    const rows = (data ?? []) as unknown as StageRow[];
    for (const s of rows) {
      s.modules.sort((a, b) => a.order_index - b.order_index);
      for (const m of s.modules) m.lessons.sort((a, b) => a.order_index - b.order_index);
    }
    setStages(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async (lessonId: number, title: string) => {
    setBusy(lessonId);
    setMessage({ ok: true, text: `Writing “${title}” with Claude… this takes about a minute.` });
    try {
      const r = await callFunction<{ exercises: number; dropped: string[] }>('content-generate', { lessonId });
      setMessage({
        ok: true,
        text: `“${title}” is ready for review: ${r.exercises} exercises${r.dropped.length ? ` (${r.dropped.length} invalid ones were dropped)` : ''}.`,
      });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <h1>Content</h1>
      <p className="muted">
        Planned lessons come from content/&lt;stage&gt;/syllabus.json. “Write with AI” drafts one; it then waits in the review queue.
      </p>
      {message && <p className={message.ok ? 'ok' : 'error'}>{message.text}</p>}
      {!stages ? (
        <p className="muted">Loading…</p>
      ) : (
        stages.map((s) => (
          <section key={s.id}>
            <h2 style={{ cursor: 'pointer' }} onClick={() => setOpen(open === s.code ? '' : s.code)}>
              {open === s.code ? '▾' : '▸'} {s.order_index}. {s.title}{' '}
              <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>
                {s.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
              </span>
            </h2>
            {open === s.code &&
              (s.modules.length === 0 ? (
                <p className="muted">No syllabus yet for this stage.</p>
              ) : (
                s.modules.map((m) => (
                  <div className="card" key={m.id} style={{ marginBottom: 12 }}>
                    <b>
                      Module {m.order_index}: {m.title}
                    </b>
                    <table>
                      <tbody>
                        {m.lessons.map((l) => (
                          <tr key={l.id}>
                            <td style={{ width: 32 }} className="muted">{l.order_index}</td>
                            <td>
                              {l.title}
                              <div className="muted" style={{ fontSize: 13 }}>
                                {l.kind} · {l.cefr ?? '–'} · {l.goals.join(' · ')}
                              </div>
                              {l.review_notes && l.status === 'draft' && (
                                <div className="error" style={{ fontSize: 13 }}>Reviewer: {l.review_notes}</div>
                              )}
                            </td>
                            <td style={{ width: 120 }}>
                              <span className={`chip ${l.status}`}>{STATUS_LABEL[l.status]}</span>
                              {l.source === 'ai' && l.status !== 'draft' && <span className="chip" style={{ marginLeft: 4 }}>AI</span>}
                            </td>
                            <td style={{ width: 150, textAlign: 'right' }}>
                              {l.status === 'draft' ? (
                                <button className="primary" disabled={busy !== null} onClick={() => generate(l.id, l.title)}>
                                  {busy === l.id ? 'Writing…' : 'Write with AI'}
                                </button>
                              ) : (
                                <Link href={`/review/${l.id}`}>{l.status === 'in_review' ? 'Review →' : 'Open →'}</Link>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              ))}
          </section>
        ))
      )}
    </>
  );
}
