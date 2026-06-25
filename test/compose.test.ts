import { describe, it, expect } from 'vitest';
import { composePost, postMarker } from '../src/compose.js';
import { ORIGIN, type YesterdayCounts } from '../src/config.js';

const y = (players: number | null, solvers: number, sampled = false): YesterdayCounts => ({
  players,
  solvers,
  sampled,
});

describe('postMarker', () => {
  it('is language-specific and carries the puzzle number', () => {
    expect(postMarker('en', 5)).toBe('AT Mot #5');
    expect(postMarker('fr', 5)).toBe('AT Mot n°5');
  });
});

describe('composePost — EN', () => {
  it('normal: solvers + non-solvers', () => {
    const { text, langs, facets } = composePost({ lang: 'en', todayN: 5, yesterday: y(33, 25) });
    expect(text).toBe(
      `🟩 AT Mot #5 is live! Six tries to guess today's five-letter word.\n` +
        `Congrats to the 25 of you who cracked yesterday's word. And to the 8 who didn't, better luck today!\n` +
        `Play: ${ORIGIN}\n` +
        `#WordGame #atproto`,
    );
    expect(langs).toEqual(['en']);
    expect(facets).toHaveLength(1);
    expect(facets[0]!.features[0]!.uri).toBe(ORIGIN);
  });

  it('singular solver, no non-solvers', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(1, 1) });
    expect(text).toContain('Congrats to the one player who cracked yesterday\'s word.');
    expect(text).not.toContain('who didn\'t');
  });

  it('singular non-solver', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(5, 4) });
    expect(text).toContain('And to the one who didn\'t, better luck today!');
  });

  it('zero solvers', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(5, 0) });
    expect(text).toContain('Nobody cracked yesterday\'s word. Fresh start today!');
  });

  it('everyone solved (no non-solver clause)', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(10, 10) });
    expect(text).toContain('Congrats to the 10 of you who cracked yesterday\'s word.');
    expect(text).not.toContain('who didn\'t');
  });

  it('sampled: hedged floor, no exact non-solver count', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(50, 20, true) });
    expect(text).toContain('Congrats to the 20+ of you who cracked yesterday\'s word. Can you join them today?');
  });

  it('day 1 (no yesterday): invite only', () => {
    const { text } = composePost({ lang: 'en', todayN: 1, yesterday: null });
    expect(text).toBe(
      `🟩 AT Mot #1 is live! Six tries to guess today's five-letter word.\n` +
        `Play: ${ORIGIN}\n` +
        `#WordGame #atproto`,
    );
  });

  it('Constellation unreachable (players null): no congrats', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(null, 0) });
    expect(text).not.toContain('Congrats');
    expect(text).not.toContain('Nobody');
  });

  it('nobody played yesterday (players 0): no congrats', () => {
    const { text } = composePost({ lang: 'en', todayN: 5, yesterday: y(0, 0) });
    expect(text).not.toContain('Congrats');
    expect(text).not.toContain('Nobody');
  });
});

describe('composePost — FR', () => {
  it('normal: solvers + non-solvers', () => {
    const { text, langs } = composePost({ lang: 'fr', todayN: 5, yesterday: y(23, 18) });
    expect(text).toBe(
      `🟩 AT Mot n°5 est en ligne ! Six essais pour deviner le mot de cinq lettres du jour.\n` +
        `Bravo aux 18 qui ont trouvé le mot d'hier. Et aux 5 qui ont séché, meilleure chance aujourd'hui !\n` +
        `Jouez : ${ORIGIN}\n` +
        `#JeuDeMots #atproto`,
    );
    expect(langs).toEqual(['fr']);
  });

  it('singular solver uses "au seul joueur" + "a trouvé"', () => {
    const { text } = composePost({ lang: 'fr', todayN: 5, yesterday: y(1, 1) });
    expect(text).toContain('Bravo au seul joueur qui a trouvé le mot d\'hier.');
  });

  it('singular non-solver', () => {
    const { text } = composePost({ lang: 'fr', todayN: 5, yesterday: y(5, 4) });
    expect(text).toContain('Et au seul qui a séché, meilleure chance aujourd\'hui !');
  });

  it('zero solvers', () => {
    const { text } = composePost({ lang: 'fr', todayN: 5, yesterday: y(5, 0) });
    expect(text).toContain('Personne n\'a trouvé le mot d\'hier. Nouveau départ aujourd\'hui !');
  });

  it('sampled hedge', () => {
    const { text } = composePost({ lang: 'fr', todayN: 5, yesterday: y(50, 20, true) });
    expect(text).toContain('Bravo aux 20+ qui ont trouvé le mot d\'hier. Saurez-vous les rejoindre aujourd\'hui ?');
  });
});
