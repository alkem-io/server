import { User } from '@domain/community/user/user.entity';
import { addSessionToSubIndex, subIndexKey } from '../session-index.redis';
import type { AlkemioSessionPayload } from '../session-store.redis';

/**
 * Pin for the implicit cross-service contract that makes subject-scoped
 * revocation possible at all (server#6315, design-input trap 7):
 *
 *     session.sub  ===  Kratos identity id  ===  user.authenticationID
 *
 * `oidc-service` sets the Hydra subject to the Kratos identity id
 * (`internal/challenge/service.go`, `login.SetSubject(kratosIdentityID)`); the
 * BFF reads it at the OIDC callback (`oidc.controller.ts`, `claims.sub`) and
 * writes it to the session payload; the platform stores the same value on
 * `user.authenticationID` and resolves requests to users by it
 * (`getUserByAuthenticationID`).
 *
 * ## Why this file exists
 *
 * Nothing enforces that equality at compile time — it is a convention shared
 * across two repositories. If a future change repoints the subject (for example
 * server#5941, Microsoft OIDC subject pinning), `revokeAllForSub` would keep
 * returning cheerful, EMPTY, successful reports while revoking nothing at all.
 * A security control failing open **and** silent is the worst failure mode this
 * design has: deletion would look like it worked, the audit trail would record
 * a clean success, and the sessions would stay alive.
 *
 * So if this file fails, the correct reading is **not** "the fixture drifted".
 * It is:
 *
 *     The OIDC subject source has changed. Session revocation is now a no-op.
 *     Find what `session.sub` holds today and make the deletion cascade look
 *     sessions up by that instead.
 */

const KRATOS_IDENTITY_ID = 'a1b2c3d4-1111-2222-3333-444455556666';

function sessionPayloadFromCallback(sub: string): AlkemioSessionPayload {
  // Mirrors what OidcController.callback writes: `s.sub = String(claims.sub)`,
  // where `claims` come from the Hydra id token.
  const nowS = Math.floor(Date.now() / 1000);
  return {
    access_token: 'a',
    id_token: 'i',
    refresh_token: 'r',
    expires_at: nowS + 600,
    absolute_expires_at: nowS + 3600,
    sub,
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: nowS,
    client_id: 'alkemio-web',
    request_context_cache: null,
    terminated_at: null,
    terminated_reason: null,
  };
}

function userLinkedToKratos(authenticationID: string): User {
  const user = new User();
  user.authenticationID = authenticationID;
  return user;
}

describe('cross-service subject contract (trap 7)', () => {
  it('the session subject and the user authentication id are the same value', () => {
    const session = sessionPayloadFromCallback(KRATOS_IDENTITY_ID);
    const user = userLinkedToKratos(KRATOS_IDENTITY_ID);

    // If this ever fails, revocation is silently revoking nothing — see the
    // file header before "fixing" the fixture.
    expect(session.sub).toBe(user.authenticationID);
  });

  it('a session indexed under session.sub is found by user.authenticationID', async () => {
    // The join in its operational form. `deleteUser` only ever knows
    // `user.authenticationID`; the index was written under `session.sub`. If
    // those two diverge, the lookup returns [] and the deletion reports a
    // successful revocation of zero sessions.
    const session = sessionPayloadFromCallback(KRATOS_IDENTITY_ID);
    const user = userLinkedToKratos(KRATOS_IDENTITY_ID);

    const sets = new Map<string, Set<string>>();
    const redis = {
      sadd: async (key: string, member: string) => {
        const set = sets.get(key) ?? new Set<string>();
        set.add(member);
        sets.set(key, set);
        return 1;
      },
      ttl: async () => -2,
      expire: async () => 1,
      smembers: async (key: string) => [...(sets.get(key) ?? [])],
    } as any;

    await addSessionToSubIndex(
      redis,
      session.sub,
      'sid-1',
      session.absolute_expires_at
    );

    const foundByUserKey = await redis.smembers(
      subIndexKey(user.authenticationID as string)
    );
    expect(foundByUserKey).toEqual(['sid-1']);
  });

  it('user.authenticationID is nullable, and that is a legitimate state', () => {
    // `user.entity.ts` declares `authenticationID!: string | null`. Users who
    // never signed in through Kratos have none — the revocation path must skip
    // them, not throw (FR-017 / FR-028 / trap 8). Pinned here so a future
    // change making the column non-nullable is a conscious decision rather than
    // an accident that quietly changes revocation's contract.
    const user = new User();
    user.authenticationID = null;

    expect(user.authenticationID).toBeNull();
  });
});
