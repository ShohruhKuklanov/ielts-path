import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dueCards, MIN_EASE, newCard, RELEARN_MINUTES, review, reviewWithButton } from './sm2.ts';

const T0 = new Date('2026-10-11T08:00:00Z');
const days = (d: Date) => (d.getTime() - T0.getTime()) / 86_400_000;

describe('SM-2', () => {
  it('a new card is due immediately with ease 2.5', () => {
    const c = newCard(T0);
    assert.equal(c.easeFactor, 2.5);
    assert.equal(c.dueAt.getTime(), T0.getTime());
  });

  it('Good, Good, Good gives 1, 6, then 6 × ease days', () => {
    let c = newCard(T0);
    c = reviewWithButton(c, 'good', T0);
    assert.equal(c.intervalDays, 1);
    assert.equal(days(c.dueAt), 1);
    c = reviewWithButton(c, 'good', T0);
    assert.equal(c.intervalDays, 6);
    c = reviewWithButton(c, 'good', T0);
    assert.equal(c.intervalDays, Math.round(6 * c.easeFactor));
    assert.equal(c.easeFactor, 2.5); // quality 4 keeps ease the same
  });

  it('Easy raises the ease by 0.1, Hard lowers it by 0.14', () => {
    assert.equal(review(newCard(T0), 5, T0).easeFactor, 2.6);
    assert.equal(review(newCard(T0), 3, T0).easeFactor, 2.36);
  });

  it('ease never falls below 1.3', () => {
    let c = newCard(T0);
    for (let i = 0; i < 30; i++) c = review(c, 3, T0);
    assert.equal(c.easeFactor, MIN_EASE);
  });

  it('Again restarts the card, keeps the ease, and brings it back in 10 minutes', () => {
    let c = newCard(T0);
    c = reviewWithButton(c, 'good', T0);
    c = reviewWithButton(c, 'good', T0);
    const before = c.easeFactor;
    c = reviewWithButton(c, 'again', T0);
    assert.equal(c.repetitions, 0);
    assert.equal(c.intervalDays, 0);
    assert.equal(c.lapses, 1);
    assert.equal(c.easeFactor, before);
    assert.equal(c.dueAt.getTime() - T0.getTime(), RELEARN_MINUTES * 60_000);
    // and the next success starts the ladder again at 1 day
    assert.equal(reviewWithButton(c, 'good', T0).intervalDays, 1);
  });

  it('missing a card that was never learnt is not a lapse', () => {
    assert.equal(reviewWithButton(newCard(T0), 'again', T0).lapses, 0);
  });

  it('is pure: the input state is not changed', () => {
    const c = newCard(T0);
    const copy = { ...c };
    review(c, 4, T0);
    assert.deepEqual(c, copy);
  });

  it('rejects quality outside 0–5', () => {
    assert.throws(() => review(newCard(T0), 6, T0), RangeError);
    assert.throws(() => review(newCard(T0), 2.5, T0), RangeError);
  });

  it('dueCards returns overdue cards, soonest first', () => {
    const a = { id: 'a', dueAt: new Date(T0.getTime() - 1000) };
    const b = { id: 'b', dueAt: new Date(T0.getTime() - 5000) };
    const later = { id: 'c', dueAt: new Date(T0.getTime() + 1000) };
    assert.deepEqual(dueCards([a, later, b], T0).map((c) => c.id), ['b', 'a']);
  });
});
