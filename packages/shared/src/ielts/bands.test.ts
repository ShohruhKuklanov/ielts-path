import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bandToCefr,
  criteriaBand,
  estimateBand,
  overallBand,
  rawToBand,
  roundDownToHalf,
  roundToNearestHalfIelts,
  writingSectionBand,
} from './bands.ts';

describe('overallBand (official IELTS rounding)', () => {
  it('matches the examples IELTS publishes', () => {
    assert.equal(overallBand(6.5, 6.5, 5, 7), 6.5); // 6.25 → 6.5
    assert.equal(overallBand(4, 3.5, 4, 4), 4); // 3.875 → 4
    assert.equal(overallBand(6.5, 6.5, 5.5, 6), 6); // 6.125 → 6
  });
  it('rounds .75 up to the next whole band', () => {
    assert.equal(overallBand(7, 7, 7, 6), 7); // 6.75 → 7
    assert.equal(roundToNearestHalfIelts(6.75), 7);
  });
  it('keeps exact halves and wholes', () => {
    assert.equal(overallBand(9, 9, 9, 9), 9);
    assert.equal(overallBand(5.5, 5.5, 5.5, 5.5), 5.5);
    assert.equal(overallBand(0, 0, 0, 0), 0);
  });
  it('rejects bands that are not half steps in 0–9', () => {
    assert.throws(() => overallBand(6.3, 6, 6, 6), RangeError);
    assert.throws(() => overallBand(9.5, 6, 6, 6), RangeError);
  });
  it('is never thrown off by float noise', () => {
    assert.equal(roundToNearestHalfIelts(0.1 + 0.2 + 6.15), 6.5);
  });
});

describe('criteriaBand (Writing task / Speaking)', () => {
  it('rounds the mean of four criteria down to the half band', () => {
    assert.equal(criteriaBand([6, 7, 7, 7]), 6.5); // 6.75 → 6.5
    assert.equal(criteriaBand([6, 6, 6, 7]), 6); // 6.25 → 6
    assert.equal(criteriaBand([7, 7, 6, 6]), 6.5);
    assert.equal(criteriaBand([9, 9, 9, 9]), 9);
  });
  it('accepts only whole criterion bands', () => {
    assert.throws(() => criteriaBand([6.5, 6, 6, 6]), RangeError);
    assert.throws(() => criteriaBand([10, 6, 6, 6]), RangeError);
  });
});

describe('writingSectionBand', () => {
  it('weights Task 2 double', () => {
    assert.equal(writingSectionBand(6, 7), 6.5); // 6.67 → 6.5
    assert.equal(writingSectionBand(5, 7), 6.0); // 6.33 → 6
    assert.equal(writingSectionBand(7, 7), 7);
  });
  it('roundDownToHalf', () => {
    assert.equal(roundDownToHalf(6.49), 6);
    assert.equal(roundDownToHalf(6.5), 6.5);
  });
});

describe('rawToBand', () => {
  it('hits the anchor points IELTS publishes', () => {
    assert.equal(rawToBand('listening', 16), 5);
    assert.equal(rawToBand('listening', 23), 6);
    assert.equal(rawToBand('listening', 30), 7);
    assert.equal(rawToBand('listening', 35), 8);
    assert.equal(rawToBand('reading_academic', 15), 5);
    assert.equal(rawToBand('reading_academic', 23), 6);
    assert.equal(rawToBand('reading_academic', 30), 7);
    assert.equal(rawToBand('reading_academic', 35), 8);
    assert.equal(rawToBand('reading_general', 15), 4);
    assert.equal(rawToBand('reading_general', 23), 5);
    assert.equal(rawToBand('reading_general', 30), 6);
    assert.equal(rawToBand('reading_general', 34), 7);
    assert.equal(rawToBand('reading_general', 38), 8);
  });
  it('covers the ends of the scale', () => {
    for (const s of ['listening', 'reading_academic', 'reading_general'] as const) {
      assert.equal(rawToBand(s, 40), 9);
      assert.equal(rawToBand(s, 0), 0);
    }
  });
  it('never goes down as the raw score goes up', () => {
    for (const s of ['listening', 'reading_academic', 'reading_general'] as const)
      for (let r = 1; r <= 40; r++) assert.ok(rawToBand(s, r) >= rawToBand(s, r - 1), `${s} ${r}`);
  });
  it('rejects impossible scores', () => {
    assert.throws(() => rawToBand('listening', 41), RangeError);
    assert.throws(() => rawToBand('listening', -1), RangeError);
    assert.throws(() => rawToBand('listening', 12.5), RangeError);
  });
  it('scales short practice sets to 40', () => {
    assert.equal(estimateBand('listening', 10, 10), 9);
    assert.equal(estimateBand('listening', 15, 20), 7); // 30/40
    assert.throws(() => estimateBand('listening', 11, 10), RangeError);
  });
});

describe('bandToCefr', () => {
  it('follows the IELTS–CEFR alignment', () => {
    assert.equal(bandToCefr(9), 'C2');
    assert.equal(bandToCefr(8.5), 'C2');
    assert.equal(bandToCefr(7), 'C1');
    assert.equal(bandToCefr(6.5), 'B2');
    assert.equal(bandToCefr(5.5), 'B2');
    assert.equal(bandToCefr(4), 'B1');
    assert.equal(bandToCefr(3), 'A2');
    assert.equal(bandToCefr(1), 'A0');
  });
});
