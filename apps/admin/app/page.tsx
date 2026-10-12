'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { supabase } from '@/supabase';
import { STATUS_LABEL, type Status } from '@/types';

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [jobs, setJobs] = useState<{ id: string; status: string; created_at: string; error: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lessons').select('status');
      const c = { draft: 0, in_review: 0, published: 0, archived: 0 } as Record<Status, number>;
      for (const r of data ?? []) c[r.status as Status]++;
      setCounts(c);
      const j = await supabase.from('content_jobs').select('id, status, created_at, error').order('created_at', { ascending: false }).limit(5);
      setJobs(j.data ?? []);
    })();
  }, []);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">Every AI or hand-written lesson must be approved here before learners see it.</p>
      <div className="grid" style={{ marginTop: 16 }}>
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <div className="card" key={s}>
            <div className="muted">{STATUS_LABEL[s]}</div>
            <div className="stat">{counts ? counts[s] : '…'}</div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16 }}>
        {counts && counts.in_review > 0 ? <Link href="/review">Review {counts.in_review} lesson(s) →</Link> : null}
      </p>
      <h2>Recent AI jobs</h2>
      {jobs.length === 0 ? (
        <p className="muted">None yet. Open Content and press “Write with AI” on a planned lesson.</p>
      ) : (
        <table>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{new Date(j.created_at).toLocaleString()}</td>
                <td><span className="chip">{j.status}</span></td>
                <td className="error">{j.error ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
