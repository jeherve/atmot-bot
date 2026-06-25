import { describe, it, expect } from 'vitest';
import { langForCron } from '../src/index.js';

describe('langForCron', () => {
  it('maps the configured EN and FR crons', () => {
    expect(langForCron('10 0 * * *')).toBe('en');
    expect(langForCron('11 0 * * *')).toBe('fr');
  });

  it('throws on an unrecognized cron rather than defaulting to EN', () => {
    expect(() => langForCron('11 1 * * *')).toThrow(/unmapped cron/);
    expect(() => langForCron('')).toThrow(/unmapped cron/);
    expect(() => langForCron('* * * * *')).toThrow(/unmapped cron/);
  });
});
