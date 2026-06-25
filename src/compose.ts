import { ORIGIN, type Lang, type YesterdayCounts } from './config.js';
import { linkFacet, type FacetLink } from './facets.js';

export interface ComposeInput {
  lang: Lang;
  todayN: number;
  /** Yesterday's counts, or null on day 1 when there is no previous puzzle. */
  yesterday: YesterdayCounts | null;
}

export interface ComposedPost {
  text: string;
  facets: FacetLink[];
  langs: [Lang];
}

/** Verbatim in the post text; also the idempotency marker. */
export function postMarker(lang: Lang, todayN: number): string {
  return lang === 'fr' ? `AT Mot n°${todayN}` : `AT Mot #${todayN}`;
}

function inviteLine(lang: Lang, todayN: number): string {
  const marker = postMarker(lang, todayN);
  return lang === 'fr'
    ? `🟩 ${marker} est en ligne ! Six essais pour deviner le mot de cinq lettres du jour.`
    : `🟩 ${marker} is live! Six tries to guess today's five-letter word.`;
}

/** The congrats sentence, or null when there's nothing meaningful to say. */
function congratsLine(lang: Lang, c: YesterdayCounts): string | null {
  const { players, solvers, sampled } = c;
  if (players == null || players === 0) return null;

  if (solvers === 0) {
    return lang === 'fr'
      ? `Personne n'a trouvé le mot d'hier. Nouveau départ aujourd'hui !`
      : `Nobody cracked yesterday's word. Fresh start today!`;
  }

  if (sampled) {
    return lang === 'fr'
      ? `Bravo aux ${solvers}+ qui ont trouvé le mot d'hier. Saurez-vous les rejoindre aujourd'hui ?`
      : `Congrats to the ${solvers}+ of you who cracked yesterday's word. Can you join them today?`;
  }

  const nonSolvers = Math.max(0, players - solvers);

  if (lang === 'fr') {
    const who = solvers === 1 ? 'au seul joueur' : `aux ${solvers}`;
    const verb = solvers === 1 ? 'a' : 'ont';
    let line = `Bravo ${who} qui ${verb} trouvé le mot d'hier.`;
    if (nonSolvers > 0) {
      const ns = nonSolvers === 1 ? 'Et au seul qui a séché' : `Et aux ${nonSolvers} qui ont séché`;
      line += ` ${ns}, meilleure chance aujourd'hui !`;
    }
    return line;
  }

  const who = solvers === 1 ? 'the one player' : `the ${solvers} of you`;
  let line = `Congrats to ${who} who cracked yesterday's word.`;
  if (nonSolvers > 0) {
    const ns = nonSolvers === 1 ? "And to the one who didn't" : `And to the ${nonSolvers} who didn't`;
    line += ` ${ns}, better luck today!`;
  }
  return line;
}

export function composePost(input: ComposeInput): ComposedPost {
  const { lang, todayN, yesterday } = input;
  const congrats = yesterday ? congratsLine(lang, yesterday) : null;
  const playLine = lang === 'fr' ? `Jouez : ${ORIGIN}` : `Play: ${ORIGIN}`;
  const tags = lang === 'fr' ? '#JeuDeMots #atproto' : '#WordGame #atproto';

  const text = [inviteLine(lang, todayN), congrats, playLine, tags].filter(Boolean).join('\n');
  return { text, facets: linkFacet(text, ORIGIN), langs: [lang] };
}
