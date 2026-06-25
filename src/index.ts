import { puzzleNumberFor, type Lang } from './config.js';
import { yesterdayCounts } from './counts.js';
import { composePost, postMarker } from './compose.js';
import { createBotSession, alreadyPosted, publishPost } from './post.js';

export interface Env {
  ATMOT_BOT_IDENTIFIER: string;
  ATMOT_BOT_APP_PASSWORD: string;
  /** When "1", compose and log the post but do not authenticate or publish. */
  DRY_RUN?: string;
}

/** Map the firing cron expression to a language (FR runs one minute after EN). */
function langForCron(cron: string): Lang {
  return cron.startsWith('11 ') ? 'fr' : 'en';
}

export default {
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const lang = langForCron(controller.cron);
    const todayN = puzzleNumberFor();
    const yesterdayN = todayN - 1;

    try {
      const yesterday = yesterdayN >= 1 ? await yesterdayCounts(lang, yesterdayN) : null;
      const post = composePost({ lang, todayN, yesterday });

      if (env.DRY_RUN === '1') {
        console.log(`[atmot-bot] DRY_RUN ${lang} #${todayN}:\n${post.text}`);
        return;
      }

      const session = await createBotSession(env.ATMOT_BOT_IDENTIFIER, env.ATMOT_BOT_APP_PASSWORD);
      if (await alreadyPosted(session, postMarker(lang, todayN))) {
        console.log(`[atmot-bot] ${lang} #${todayN} already posted; skipping`);
        return;
      }
      const uri = await publishPost(session, post);
      console.log(`[atmot-bot] posted ${lang} #${todayN}: ${uri}`);
    } catch (err) {
      console.error(`[atmot-bot] ${lang} #${todayN} failed:`, err);
      throw err; // surface the failure to Cloudflare's cron logs
    }
  },
};
