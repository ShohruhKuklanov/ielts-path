'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '@/supabase';

interface Row {
  id: number;
  title: string;
  cefr: string | null;
  source: string;
  modules: { title: string; stages: { title: string } };
}

export default function ReviewQueue() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    supabase
      .from('lessons')
      .select('id, title, cefr, source, modules(title, stages(title))')
      .eq('status', 'in_review')
      .order('id')
      .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }, []);

  return (
    <>
      <h1>Review queue</h1>
      <p className="muted">Check every answer key, the level of the English, and that nothing is copied. Approve to make a lesson live.</p>
      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Nothing waiting. 🎉</p>
      ) : (
        <table>
          <thead>
            <tr><th>Lesson</th><th>Where</th><th>Level</th><th>Written by</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td className="muted">{r.modules.stages.title} · {r.modules.title}</td>
                <td>{r.cefr}</td>
                <td>{r.source === 'ai' ? 'Claude' : 'Human'}</td>
                <td><Link href={`/review/${r.id}`}>Review →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
