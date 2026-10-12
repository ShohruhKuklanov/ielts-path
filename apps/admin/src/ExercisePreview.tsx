'use client';
// Read-only view of one exercise with its answer key, for reviewers.
import type { ReactNode } from 'react';

// Payloads were validated with the shared schemas when saved, so loose typing is safe here.
type Any = any;

const Ans = ({ children }: { children: ReactNode }) => <span className="answer">{children}</span>;
const opt = (o: Any) => o?.text ?? (o?.imageId ? '[picture]' : '?');
const fillBlanks = (text: string, blanks: Record<string, string[]>) =>
  text.split(/(\{\{\w+\}\})/g).map((part, i) => {
    const m = part.match(/^\{\{(\w+)\}\}$/);
    return m ? <Ans key={i}>[{(blanks[m[1]!] ?? ['?']).join(' / ')}]</Ans> : <span key={i}>{part}</span>;
  });

export function ExercisePreview({ type, payload: p, answer: a }: { type: string; payload: Any; answer: Any }) {
  switch (type) {
    case 'mcq':
    case 'listen_pick': {
      const correct: number[] = type === 'mcq' ? a.correct : [a.correct];
      return (
        <div>
          {p.prompt && <div><b>{p.prompt}</b></div>}
          {type === 'listen_pick' && <div className="muted">[audio {p.audioId}]</div>}
          <ol type="A" style={{ margin: '4px 0' }}>
            {p.options.map((o: Any, i: number) => (
              <li key={i}>{correct.includes(i) ? <Ans>{opt(o)} ✓</Ans> : opt(o)}</li>
            ))}
          </ol>
        </div>
      );
    }
    case 'gap_fill':
      return (
        <div>
          <div>{fillBlanks(p.text, a.blanks)}</div>
          {p.wordBank && <div className="muted">Word bank: {p.wordBank.join(', ')}</div>}
        </div>
      );
    case 'form_completion':
      return (
        <div>
          {p.title && <b>{p.title}</b>}
          {p.fields.map((f: string, i: number) => <div key={i}>{fillBlanks(f, a.blanks)}</div>)}
          <div className="muted">Limit: {p.wordLimit.words} word(s){p.wordLimit.allowNumber ? ' and/or a number' : ''}</div>
        </div>
      );
    case 'word_order':
      return (
        <div>
          <div className="muted">Tokens: {p.tokens.join(' · ')}</div>
          {a.accepted.map((s: string, i: number) => <div key={i}><Ans>{s}</Ans></div>)}
        </div>
      );
    case 'match_pairs':
      return (
        <div>
          {p.left.map((l: string, i: number) => (
            <div key={i}>{l} → <Ans>{p.right[a.pairs[i]]}</Ans></div>
          ))}
          {p.right.length > p.left.length && <div className="muted">Extra options: {p.right.filter((_: string, i: number) => !a.pairs.includes(i)).join(', ')}</div>}
        </div>
      );
    case 'dictation':
      return <div><span className="muted">[audio {p.audioId}]</span> → <Ans>{a.accepted.join(' / ')}</Ans></div>;
    case 'tfng':
    case 'ynng':
      return (
        <div>
          {p.passage && <blockquote className="muted" style={{ margin: '4px 0 8px', whiteSpace: 'pre-wrap' }}>{p.passage}</blockquote>}
          {p.statements.map((s: string, i: number) => (
            <div key={i}>{i + 1}. {s} → <Ans>{String(a.answers[i]).replace('_', ' ').toUpperCase()}</Ans></div>
          ))}
        </div>
      );
    case 'match_headings':
      return (
        <div>
          {p.paragraphs.map((para: string, i: number) => (
            <div key={i}>Paragraph {String.fromCharCode(65 + i)}: <Ans>{p.headings[a.headings[i]]}</Ans></div>
          ))}
        </div>
      );
    default:
      return <pre>{JSON.stringify({ payload: p, answer: a }, null, 2)}</pre>;
  }
}

export function IntroPreview({ blocks }: { blocks: Any[] }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'text':
            return <div key={i}>{b.text}</div>;
          case 'tip':
            return <div key={i}>💡 {b.text}</div>;
          case 'example':
            return <div key={i}><b>{b.en}</b>{b.note && <span className="muted"> — {b.note}</span>}</div>;
          case 'table':
            return (
              <table key={i} style={{ width: 'auto' }}>
                <tbody>{b.rows.map((r: string[], j: number) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
              </table>
            );
          default:
            return <div key={i} className="muted">[{b.type}]</div>;
        }
      })}
    </div>
  );
}
