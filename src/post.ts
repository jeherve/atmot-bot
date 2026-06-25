/**
 * Posting side: create an app-password session against the bot's PDS, check we
 * haven't already posted today (by scanning our own recent posts — stateless),
 * and publish the post.
 */
import { Client, simpleFetchHandler, type FetchHandler } from '@atcute/client';
import { resolveActor } from './identity.js';
import type { ComposedPost } from './compose.js';

export interface BotSession {
  client: Client;
  did: string;
}

/** Log in with an app password; returns a client whose requests carry the bearer token. */
export async function createBotSession(identifier: string, appPassword: string): Promise<BotSession> {
  const actor = await resolveActor(identifier);
  const pds = actor.pds;

  const loginClient = new Client({ handler: simpleFetchHandler({ service: pds }) });
  const res = await loginClient.post('com.atproto.server.createSession', {
    input: { identifier, password: appPassword },
  });
  if (!res.ok) throw new Error(`createSession failed: ${JSON.stringify(res.data)}`);

  const accessJwt = res.data.accessJwt;
  const base = simpleFetchHandler({ service: pds });
  const authed: FetchHandler = (pathname, init) => {
    const headers = new Headers(init.headers ?? {});
    headers.set('authorization', `Bearer ${accessJwt}`);
    return base(pathname, { ...init, headers });
  };

  return { client: new Client({ handler: authed }), did: res.data.did };
}

/** True if any of the bot's recent posts already contains `marker` (today's puzzle token). */
export async function alreadyPosted(session: BotSession, marker: string): Promise<boolean> {
  const res = await session.client.get('com.atproto.repo.listRecords', {
    params: {
      repo: session.did as `did:${string}:${string}`,
      collection: 'app.bsky.feed.post' as `${string}.${string}.${string}`,
      limit: 20,
    },
  });
  if (!res.ok) return false; // can't confirm — allow the post rather than skip forever
  const records = res.data.records as Array<{ value?: { text?: string } }>;
  return records.some((r) => typeof r.value?.text === 'string' && r.value.text.includes(marker));
}

/** Create the post; returns its at:// uri. */
export async function publishPost(session: BotSession, post: ComposedPost): Promise<string> {
  const res = await session.client.post('com.atproto.repo.createRecord', {
    input: {
      repo: session.did as `did:${string}:${string}`,
      collection: 'app.bsky.feed.post' as `${string}.${string}.${string}`,
      record: {
        $type: 'app.bsky.feed.post',
        text: post.text,
        langs: post.langs,
        facets: post.facets,
        createdAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>,
    },
  });
  if (!res.ok) throw new Error(`createRecord failed: ${JSON.stringify(res.data)}`);
  return res.data.uri;
}
