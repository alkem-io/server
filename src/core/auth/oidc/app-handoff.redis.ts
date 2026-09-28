import { randomBytes } from 'crypto';
import type { Redis } from 'ioredis';

/**
 * One-shot native sign-in handoff records (workspace#079-app-sso-handoff).
 *
 * The app's sign-in runs in an external auth browser, which has its own cookie
 * jar; the session it would establish there is worthless to the WebView. So
 * `/callback` establishes nothing in that jar, parks the minted session bundle
 * here under a random code, and 302s that code back to the app through its
 * private-use scheme. The shell then redeems it from the WebView, over a
 * request carrying the verifier it generated before the flow started.
 *
 * The record is the only thing that crosses the jar boundary, so its lifetime
 * is the whole attack window. Three properties keep it small:
 *
 * - **60 s TTL.** Long enough for a deep link to wake the app, far too short to
 *   be worth harvesting.
 * - **`GETDEL`.** One atomic round trip, so the record burns on ANY redemption
 *   attempt, before the verifier is so much as looked at (FR-009). A read
 *   followed by a delete would let two concurrent attempts both succeed.
 * - **`SET … NX`.** A 32-byte code cannot collide, but a write that could
 *   silently overwrite a live record is not a property worth leaving to chance.
 *
 * The prefix mirrors the existing `alkemio:sid:` / `alkemio:sub:` families so
 * all three are visible in one namespace when an operator debugs by hand.
 */
export const APP_HANDOFF_KEY_PREFIX = 'alkemio:apphandoff:';
export const APP_HANDOFF_TTL_S = 60;

/**
 * The session `/callback` minted but deliberately did not establish. Also the
 * argument `establishSession()` takes on BOTH paths — the web callback builds
 * one straight from the token set, the app path reads one back out of Redis —
 * so the two cannot drift apart.
 */
export type MintedSessionBundle = {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string | null;
  sub: string;
  alkemio_actor_id: string | null;
  client_id: string;
};

export type AppHandoffRecord = {
  bundle: MintedSessionBundle;
  /** Already through `validateReturnTo` at `/callback` (FR-015). */
  returnTo: string;
  /** Binds the record to the app instance that started the flow (FR-010). */
  app_challenge: string;
  issued_at: number;
};

function handoffKey(code: string): string {
  return APP_HANDOFF_KEY_PREFIX + code;
}

export async function storeAppHandoff(
  redis: Redis,
  record: AppHandoffRecord
): Promise<string> {
  const code = randomBytes(32).toString('base64url');
  await redis.set(
    handoffKey(code),
    JSON.stringify(record),
    'EX',
    APP_HANDOFF_TTL_S,
    'NX'
  );
  return code;
}

/** Burns the record on any attempt, valid or not, before anything is checked. */
export async function redeemAppHandoff(
  redis: Redis,
  code: string
): Promise<AppHandoffRecord | null> {
  const raw = await redis.getdel(handoffKey(code));
  if (typeof raw !== 'string') return null;
  return JSON.parse(raw) as AppHandoffRecord;
}
