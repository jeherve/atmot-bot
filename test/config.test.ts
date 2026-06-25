import { describe, it, expect } from 'vitest';
import { EPOCH_UTC_MS, puzzleNumberFor, daysSinceEpoch, puzzleTarget } from '../src/config.js';

describe('puzzle numbering', () => {
  it('epoch day is puzzle #1', () => {
    expect(puzzleNumberFor(EPOCH_UTC_MS)).toBe(1);
    expect(daysSinceEpoch(EPOCH_UTC_MS)).toBe(0);
  });

  it('four days after epoch is puzzle #5', () => {
    expect(puzzleNumberFor(Date.UTC(2026, 5, 27))).toBe(5);
  });

  it('only changes at UTC midnight, not mid-day', () => {
    const lateInEpochDay = EPOCH_UTC_MS + 23 * 3_600_000;
    expect(puzzleNumberFor(lateInEpochDay)).toBe(1);
  });

  it('days before the epoch are < 1 (no puzzle yet)', () => {
    expect(puzzleNumberFor(Date.UTC(2026, 5, 22))).toBe(0);
  });
});

describe('puzzleTarget format (frozen)', () => {
  it('builds the canonical permalink', () => {
    expect(puzzleTarget('en', 5)).toBe('https://atmot.herve.bzh/p/en/5');
    expect(puzzleTarget('fr', 12)).toBe('https://atmot.herve.bzh/p/fr/12');
  });
});
