/**
 * Identity resolution (handle/DID -> PDS) and per-PDS record reads.
 * Mirrors the app's read path; failures resolve to null and drop the entry.
 */
import {
  CompositeDidDocumentResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  XrpcHandleResolver,
  type ResolvedActor,
} from '@atcute/identity-resolver';
import { Client, simpleFetchHandler } from '@atcute/client';
import { APPVIEW_URL } from './config.js';

const actorResolver = new LocalActorResolver({
  handleResolver: new XrpcHandleResolver({ serviceUrl: APPVIEW_URL }),
  didDocumentResolver: new CompositeDidDocumentResolver({
    methods: { plc: new PlcDidDocumentResolver(), web: new WebDidDocumentResolver() },
  }),
});

/** Resolve a handle or DID to { did, handle, pds }. May reject. */
export function resolveActor(identifier: string): Promise<ResolvedActor> {
  return actorResolver.resolve(identifier as Parameters<typeof actorResolver.resolve>[0]);
}

/** Unauthenticated read client pointed at a specific PDS. */
export function pdsClient(pds: string): Client {
  return new Client({ handler: simpleFetchHandler({ service: pds }) });
}

/** Public read of a record by at:// URI; null on any failure. */
export async function getRecordByUri<T = unknown>(uri: string): Promise<T | null> {
  const m = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(uri);
  if (!m) return null;
  try {
    const actor = await resolveActor(m[1]!);
    const rpc = pdsClient(actor.pds);
    const res = await rpc.get('com.atproto.repo.getRecord', {
      params: {
        repo: m[1]! as `did:${string}:${string}`,
        collection: m[2]! as `${string}.${string}.${string}`,
        rkey: m[3]!,
      },
    });
    if (!res.ok) return null;
    return res.data.value as unknown as T;
  } catch {
    return null;
  }
}
