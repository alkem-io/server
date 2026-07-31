import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { AuditEvent } from '../audit';
import { OidcService } from '../oidc.service';
import { OIDC_REDIS_CLIENT } from '../oidc.tokens';
import { refreshLockKey } from '../refresh-lock';
import { subIndexKey } from '../session-index.redis';
import type { AlkemioSessionPayload } from '../session-store.redis';
import { SESSION_STORE_HANDLE } from '../strategies/cookie-session.errors';
import { OidcSessionRevocationService } from './oidc-session-revocation.service';
import type { SessionRevocationReason } from './session-revocation.types';

const SUB = 'a1b2c3d4-0000-0000-0000-000000000001';
const CLIENT_ID = 'alkemio-web';
const REVOCATION_ENDPOINT = 'https://hydra.test/oauth2/revoke';

// Recognisable fixture credentials. The leak-proof test greps everything this
// service emits for these exact strings.
const FIXTURE_REFRESH_TOKEN = 'REFRESH-TOKEN-MUST-NEVER-BE-LOGGED-0001';
const FIXTURE_ACCESS_TOKEN = 'ACCESS-TOKEN-MUST-NEVER-BE-LOGGED-0002';
const FIXTURE_ID_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.ID-TOKEN-MUST-NEVER-LEAK.sig';
const FIXTURE_EMAIL = 'deleted.person@example.com';
const FIXTURE_DISPLAY_NAME = 'Deleted Person';

function livePayload(
  overrides: Partial<AlkemioSessionPayload> = {}
): AlkemioSessionPayload {
  const nowS = Math.floor(Date.now() / 1000);
  return {
    access_token: FIXTURE_ACCESS_TOKEN,
    id_token: FIXTURE_ID_TOKEN,
    refresh_token: FIXTURE_REFRESH_TOKEN,
    expires_at: nowS + 600,
    absolute_expires_at: nowS + 30 * 24 * 3600,
    sub: SUB,
    alkemio_actor_id: 'actor-1',
    refresh_failure_count: 0,
    refresh_failure_streak_started_at: null,
    created_at: nowS,
    client_id: CLIENT_ID,
    request_context_cache: {
      display_name: FIXTURE_DISPLAY_NAME,
      email: FIXTURE_EMAIL,
    },
    terminated_at: null,
    terminated_reason: null,
    ...overrides,
  };
}

type Harness = Awaited<ReturnType<typeof buildHarness>>;

async function buildHarness(options?: {
  sids?: string[];
  payloads?: Record<string, AlkemioSessionPayload | null>;
  markTerminatedImpl?: (sid: string) => Promise<void>;
  smembersImpl?: () => Promise<string[]>;
  sremImpl?: () => Promise<number>;
  revocationEndpoint?: string | undefined;
  issuerThrows?: boolean;
}) {
  const sids = options?.sids ?? ['sid-1'];
  const commands: { cmd: string; args: unknown[] }[] = [];
  const auditRecords: AuditEvent[] = [];
  const logLines: unknown[] = [];
  const order: string[] = [];

  const redis = {
    smembers: vi.fn(async (key: string) => {
      commands.push({ cmd: 'smembers', args: [key] });
      if (options?.smembersImpl) return options.smembersImpl();
      return sids;
    }),
    srem: vi.fn(async (key: string, member: string) => {
      commands.push({ cmd: 'srem', args: [key, member] });
      order.push(`srem:${member}`);
      if (options?.sremImpl) return options.sremImpl();
      return 1;
    }),
    del: vi.fn(async (key: string) => {
      commands.push({ cmd: 'del', args: [key] });
      order.push(`del:${key}`);
      return 1;
    }),
    sadd: vi.fn(),
    ttl: vi.fn(),
    expire: vi.fn(),
  };

  const sessionStore = {
    get: vi.fn(async (sid: string) => {
      order.push(`get:${sid}`);
      if (options?.payloads && sid in options.payloads) {
        return options.payloads[sid];
      }
      return livePayload();
    }),
    destroy: vi.fn(async () => {
      order.push('destroy');
    }),
    markTerminated: vi.fn(async (sid: string) => {
      order.push(`markTerminated:${sid}`);
      if (options?.markTerminatedImpl) {
        await options.markTerminatedImpl(sid);
      }
    }),
  };

  const oidcService = {
    getIssuer: vi.fn(() => {
      if (options?.issuerThrows) {
        throw new Error('OIDC issuer not yet initialised');
      }
      return {
        metadata: {
          revocation_endpoint:
            options && 'revocationEndpoint' in options
              ? options.revocationEndpoint
              : REVOCATION_ENDPOINT,
        },
      };
    }),
  };

  const logger = {
    error: vi.fn((...args: unknown[]) => logLines.push(args)),
    warn: vi.fn((...args: unknown[]) => logLines.push(args)),
    log: vi.fn((...args: unknown[]) => logLines.push(args)),
    verbose: vi.fn((...args: unknown[]) => logLines.push(args)),
    debug: vi.fn((...args: unknown[]) => logLines.push(args)),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      OidcSessionRevocationService,
      { provide: OIDC_REDIS_CLIENT, useValue: redis },
      { provide: SESSION_STORE_HANDLE, useValue: sessionStore },
      { provide: OidcService, useValue: oidcService },
      {
        provide: ConfigService,
        useValue: { get: vi.fn(() => CLIENT_ID) },
      },
      { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: logger },
    ],
  }).compile();

  return {
    service: moduleRef.get(OidcSessionRevocationService),
    redis,
    sessionStore,
    oidcService,
    logger,
    commands,
    auditRecords,
    logLines,
    order,
  };
}

/** Capture the newline-delimited JSON `emitAudit` writes to stdout. */
function captureAudit(harness: Harness) {
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: any) => {
      try {
        harness.auditRecords.push(JSON.parse(String(chunk)));
      } catch {
        /* not an audit record */
      }
      return true;
    });
  return spy;
}

let stdoutSpy: ReturnType<typeof captureAudit> | undefined;

afterEach(() => {
  stdoutSpy?.mockRestore();
  stdoutSpy = undefined;
  vi.restoreAllMocks();
});

function mockFetch(impl: (...args: any[]) => Promise<any>) {
  return vi.spyOn(globalThis, 'fetch' as any).mockImplementation(impl as any);
}

function okFetch() {
  return mockFetch(async () => ({ ok: true, status: 200 }));
}

// ---------------------------------------------------------------------------
// T008 — contract-critical cases (C1..C5)
// ---------------------------------------------------------------------------

describe('revokeAllForSub — contract C3: tombstone, never destroy', () => {
  // THE assertion of this feature. `destroy` deletes the Redis key, which
  // CookieSessionStrategy reads as "never had a session" → anonymous
  // fall-through → HTTP 200. That IS the reported bug (#6315), just wearing a
  // different hat: the browser keeps rendering as signed-in because nothing
  // told it otherwise. Only the tombstone produces the 401.
  it('calls markTerminated and NEVER destroy', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(h.sessionStore.markTerminated).toHaveBeenCalledWith(
      'sid-1',
      'account_deleted',
      {
        sub: SUB,
        client_id: CLIENT_ID,
      }
    );
    expect(h.sessionStore.destroy).not.toHaveBeenCalled();
  });

  it('passes the revocation reason through as the tombstone reason', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'admin_revoked');

    expect(h.sessionStore.markTerminated).toHaveBeenCalledWith(
      'sid-1',
      'admin_revoked',
      expect.anything()
    );
  });
});

describe('revokeAllForSub — contract C1: null subject', () => {
  // user.authenticationID is nullable (user.entity.ts:53). Users never linked
  // to Kratos legitimately have none — a state, not a fault (trap 8).
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
  ])('%s subject is a successful no-op that touches nothing', async (_l, sub) => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);

    const report = await h.service.revokeAllForSub(
      sub as any,
      'account_deleted'
    );

    expect(report).toMatchObject({
      entries: [],
      revokedCount: 0,
      failedCount: 0,
      complete: true,
    });
    expect(h.commands).toEqual([]);
    expect(h.sessionStore.get).not.toHaveBeenCalled();
    expect(h.auditRecords).toEqual([]);
  });
});

describe('revokeAllForSub — contract C2: bounded blast radius', () => {
  // FR-005 / SC-007. A keyspace sweep would make every revocation O(total
  // sessions) and put other subjects' sessions inside the blast radius.
  it('reads exactly one key and issues no KEYS/SCAN/wildcard', async () => {
    const h = await buildHarness({ sids: ['sid-1', 'sid-2'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    const reads = h.commands.filter(c => c.cmd === 'smembers');
    expect(reads).toHaveLength(1);
    expect(reads[0].args).toEqual([subIndexKey(SUB)]);
    expect(h.commands.some(c => c.cmd === 'keys' || c.cmd === 'scan')).toBe(
      false
    );
    for (const c of h.commands) {
      for (const a of c.args) expect(String(a)).not.toContain('*');
    }
  });
});

describe('revokeAllForSub — contract C4: full per-session teardown', () => {
  it('reads the payload before tombstoning, then clears the lock and the index', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    // Read-before-mutate matters: markTerminated blanks every token field, so
    // this is the only chance to capture the refresh token we revoke upstream.
    expect(h.order).toEqual([
      'get:sid-1',
      'markTerminated:sid-1',
      `del:${refreshLockKey('sid-1')}`,
      'srem:sid-1',
    ]);
  });

  it('clears the refresh lock so nothing keyed to a dead session lingers', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(h.redis.del).toHaveBeenCalledWith(refreshLockKey('sid-1'));
  });

  it('completes the local teardown BEFORE contacting the authorization server', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    mockFetch(async () => {
      h.order.push('fetch');
      return { ok: true, status: 200 };
    });

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    // FR-013 — local certainty over remote completeness. If the remote call
    // came first, a Hydra outage would leave the session alive.
    expect(h.order.indexOf('fetch')).toBe(h.order.length - 1);
  });

  it('revokes every session when the subject is signed in on several devices', async () => {
    const h = await buildHarness({ sids: ['sid-1', 'sid-2', 'sid-3'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report.revokedCount).toBe(3);
    expect(h.sessionStore.markTerminated).toHaveBeenCalledTimes(3);
  });
});

describe('revokeAllForSub — contract C5: payload states', () => {
  it('reports already_terminated and writes no second tombstone', async () => {
    const h = await buildHarness({
      payloads: { 'sid-1': livePayload({ terminated_at: Date.now() }) },
    });
    stdoutSpy = captureAudit(h);

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report.entries[0]).toMatchObject({
      outcome: 'already_terminated',
      tokenRevocation: 'skipped',
    });
    expect(h.sessionStore.markTerminated).not.toHaveBeenCalled();
    expect(report.complete).toBe(true);
  });

  it('reports already_absent, prunes the stale member, and writes NO tombstone', async () => {
    const h = await buildHarness({ payloads: { 'sid-1': null } });
    stdoutSpy = captureAudit(h);

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report.entries[0]).toMatchObject({ outcome: 'already_absent' });
    // Writing a tombstone here would resurrect a 401 for a session that had
    // already ended cleanly (index membership is advisory — invariant I3).
    expect(h.sessionStore.markTerminated).not.toHaveBeenCalled();
    expect(h.redis.srem).toHaveBeenCalledWith(subIndexKey(SUB), 'sid-1');
    expect(report.complete).toBe(true);
  });

  it('counts only genuinely revoked sessions', async () => {
    const h = await buildHarness({
      sids: ['live', 'dead', 'gone'],
      payloads: {
        live: livePayload(),
        dead: livePayload({ terminated_at: Date.now() }),
        gone: null,
      },
    });
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    // already_terminated / already_absent are successes but are not revocations
    // THIS call performed; conflating them would inflate the audit trail.
    expect(report.revokedCount).toBe(1);
    expect(report.failedCount).toBe(0);
    expect(report.complete).toBe(true);
  });

  it('succeeds with an empty report when the subject has no sessions', async () => {
    const h = await buildHarness({ sids: [] });
    stdoutSpy = captureAudit(h);

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report).toMatchObject({
      entries: [],
      revokedCount: 0,
      complete: true,
    });
  });
});

// ---------------------------------------------------------------------------
// T009 — failure modes (C6, C8, C9) and idempotency
// ---------------------------------------------------------------------------

describe('revokeAllForSub — contract C6: RFC 7009 remote revocation', () => {
  it('POSTs the RFC 7009 form body to the discovered revocation_endpoint', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    const fetchSpy = okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(REVOCATION_ENDPOINT);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    );
    const body = new URLSearchParams(String(init.body));
    expect(body.get('token')).toBe(FIXTURE_REFRESH_TOKEN);
    expect(body.get('token_type_hint')).toBe('refresh_token');
    // Public client (token_endpoint_auth_method: 'none') → RFC 7009 §2.1
    // client authentication is the client_id form parameter. No secret.
    expect(body.get('client_id')).toBe(CLIENT_ID);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // FR-012a — the timeout is the whole of the failure policy: no retry, no
  // circuit breaker. Asserted so a well-meaning reviewer cannot add a retry
  // loop without also updating the spec that forbids it.
  it('makes exactly one attempt — no retry — when the endpoint fails', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    const fetchSpy = mockFetch(async () => ({ ok: false, status: 503 }));

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(report.entries[0].tokenRevocation).toBe('failed');
  });

  it.each([
    ['a non-2xx response', async () => ({ ok: false, status: 400 })],
    [
      'a network error',
      async () => {
        throw new Error('ECONNREFUSED');
      },
    ],
    [
      'a timeout',
      async () => {
        throw Object.assign(new Error('The operation was aborted'), {
          name: 'TimeoutError',
        });
      },
    ],
  ])('keeps the local tombstone when the remote leg fails with %s', async (_l, impl) => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    mockFetch(impl as any);

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    // FR-013 — the platform session is dead either way; only the upstream
    // refresh grant may survive to its own expiry.
    expect(h.sessionStore.markTerminated).toHaveBeenCalledTimes(1);
    expect(report.entries[0]).toMatchObject({
      outcome: 'revoked',
      tokenRevocation: 'failed',
      failureReason: 'token_revocation_failed',
    });
    expect(report.complete).toBe(false);
  });

  it('degrades to a failed remote leg when discovery has not completed', async () => {
    const h = await buildHarness({ issuerThrows: true });
    stdoutSpy = captureAudit(h);
    const fetchSpy = okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    // The identity chain may still be settling at boot; that must not throw.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(h.sessionStore.markTerminated).toHaveBeenCalledTimes(1);
    expect(report.entries[0].tokenRevocation).toBe('failed');
  });

  it('degrades to a failed remote leg when no revocation_endpoint is advertised', async () => {
    const h = await buildHarness({ revocationEndpoint: undefined });
    stdoutSpy = captureAudit(h);
    const fetchSpy = okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(report.entries[0].tokenRevocation).toBe('failed');
  });

  it('skips the remote leg when the session held no refresh token', async () => {
    const h = await buildHarness({
      payloads: { 'sid-1': livePayload({ refresh_token: '' }) },
    });
    stdoutSpy = captureAudit(h);
    const fetchSpy = okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(report.entries[0]).toMatchObject({
      outcome: 'revoked',
      tokenRevocation: 'skipped',
    });
    expect(report.complete).toBe(true);
  });
});

describe('revokeAllForSub — contract C8: partial failure is a result', () => {
  it('resolves with a mixed report when one session cannot be torn down', async () => {
    const h = await buildHarness({
      sids: ['sid-1', 'sid-2', 'sid-3'],
      markTerminatedImpl: async sid => {
        if (sid === 'sid-2') throw new Error('redis write failed');
      },
    });
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report.entries.map(e => e.outcome)).toEqual([
      'revoked',
      'failed',
      'revoked',
    ]);
    expect(report.revokedCount).toBe(2);
    expect(report.failedCount).toBe(1);
    expect(report.complete).toBe(false);
  });

  it('does not let one failing session stop the others', async () => {
    const h = await buildHarness({
      sids: ['sid-1', 'sid-2'],
      markTerminatedImpl: async sid => {
        if (sid === 'sid-1') throw new Error('boom');
      },
    });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(h.sessionStore.markTerminated).toHaveBeenCalledTimes(2);
  });
});

describe('revokeAllForSub — contract C9: the only rejection', () => {
  it('rejects when the index itself cannot be read', async () => {
    const h = await buildHarness({
      smembersImpl: async () => {
        throw new Error('redis unreachable');
      },
    });
    stdoutSpy = captureAudit(h);

    // Categorically different from a per-session failure: we do not know WHAT
    // to revoke. Every caller must trap it; deleteUser does.
    await expect(
      h.service.revokeAllForSub(SUB, 'account_deleted')
    ).rejects.toThrow('redis unreachable');
  });
});

describe('revokeAllForSub — FR-015: idempotency', () => {
  it('is a successful no-op on a second run against already-dead sessions', async () => {
    const first = await buildHarness();
    stdoutSpy = captureAudit(first);
    okFetch();
    await first.service.revokeAllForSub(SUB, 'account_deleted');
    stdoutSpy.mockRestore();

    // Second run: the index still names the sid, but the payload is a tombstone.
    const second = await buildHarness({
      payloads: { 'sid-1': livePayload({ terminated_at: Date.now() }) },
    });
    stdoutSpy = captureAudit(second);

    const report = await second.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report.complete).toBe(true);
    expect(report.failedCount).toBe(0);
    expect(second.sessionStore.markTerminated).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T010 — contract C10 / SC-006: nothing leaks
// ---------------------------------------------------------------------------

describe('revokeAllForSub — contract C10: no token material escapes', () => {
  // FR-021 is absolute, so it is checked rather than promised: drive the
  // nastiest path available (a rejection whose message embeds the tokens) and
  // grep every byte the service emits.
  it('leaks no token or cached PII into any audit record or log line', async () => {
    const h = await buildHarness({
      sids: ['sid-1', 'sid-2'],
      markTerminatedImpl: async sid => {
        if (sid === 'sid-2') {
          throw new Error(
            `upstream rejected: refresh_token=${FIXTURE_REFRESH_TOKEN} access_token=${FIXTURE_ACCESS_TOKEN} ${FIXTURE_ID_TOKEN}`
          );
        }
      },
    });
    stdoutSpy = captureAudit(h);
    mockFetch(async () => {
      throw new Error(`revocation failed for token ${FIXTURE_REFRESH_TOKEN}`);
    });

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    const emitted = JSON.stringify({
      report,
      audit: h.auditRecords,
      logs: h.logLines,
    });

    for (const secret of [
      FIXTURE_REFRESH_TOKEN,
      FIXTURE_ACCESS_TOKEN,
      FIXTURE_ID_TOKEN,
      FIXTURE_EMAIL,
      FIXTURE_DISPLAY_NAME,
    ]) {
      expect(emitted).not.toContain(secret);
    }
  });

  it('emits no token material on the happy path either', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');
    const emitted = JSON.stringify({
      report,
      audit: h.auditRecords,
      logs: h.logLines,
    });

    for (const secret of [
      FIXTURE_REFRESH_TOKEN,
      FIXTURE_ACCESS_TOKEN,
      FIXTURE_ID_TOKEN,
      FIXTURE_EMAIL,
      FIXTURE_DISPLAY_NAME,
    ]) {
      expect(emitted).not.toContain(secret);
    }
  });
});

// ---------------------------------------------------------------------------
// T035 — FR-018..FR-022 / SC-005: the audit trail IS the compliance evidence
// ---------------------------------------------------------------------------

describe('revokeAllForSub — audit trail', () => {
  it('emits initiated BEFORE the first teardown (FR-018)', async () => {
    const h = await buildHarness();
    const seen: string[] = [];
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: any) => {
        try {
          const rec = JSON.parse(String(chunk)) as AuditEvent;
          h.auditRecords.push(rec);
          seen.push(`audit:${rec.event_type}`);
        } catch {
          /* ignore */
        }
        return true;
      });
    h.sessionStore.markTerminated.mockImplementation(async () => {
      seen.push('markTerminated');
    });
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    // Ordering, not just presence: the evidence has to survive a process death
    // mid-teardown, which it only does if it is written first (trap 5).
    expect(seen[0]).toBe('audit:session.revocation.initiated');
    expect(seen.indexOf('audit:session.revocation.initiated')).toBeLessThan(
      seen.indexOf('markTerminated')
    );
  });

  it('emits exactly one record per session plus the two bookends', async () => {
    const h = await buildHarness({ sids: ['sid-1', 'sid-2'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(h.auditRecords.map(r => r.event_type)).toEqual([
      'session.revocation.initiated',
      'session.revoked',
      'session.revoked',
      'session.revocation.completed',
    ]);
  });

  it('carries sub, reason and a correlation id on every record', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted', {
      correlationId: 'corr-42',
    });

    expect(report.correlationId).toBe('corr-42');
    for (const rec of h.auditRecords) {
      expect(rec.sub).toBe(SUB);
      expect(rec.reason).toBe('account_deleted');
      expect(rec.correlation_id).toBe('corr-42');
      expect(rec.request_id).toBe('corr-42');
    }
  });

  it('maps every local outcome to the right audit outcome', async () => {
    const h = await buildHarness({
      sids: ['live', 'dead', 'gone', 'boom'],
      payloads: {
        live: livePayload(),
        dead: livePayload({ terminated_at: Date.now() }),
        gone: null,
        boom: livePayload(),
      },
      markTerminatedImpl: async sid => {
        if (sid === 'boom') throw new Error('write failed');
      },
    });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    const perSession = h.auditRecords.filter(
      r => r.event_type === 'session.revoked'
    );
    expect(perSession.map(r => r.outcome)).toEqual([
      'success', // revoked
      'success', // already_terminated
      'success', // already_absent
      'failure', // failed
    ]);
  });

  // A locally-dead session whose upstream grant survived is a genuine control
  // failure — FR-022 forbids swallowing it even though platform access ended.
  it('audits a locally-successful but remotely-failed session as a failure', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    mockFetch(async () => ({ ok: false, status: 500 }));

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    const perSession = h.auditRecords.find(
      r => r.event_type === 'session.revoked'
    );
    expect(perSession?.outcome).toBe('failure');
    expect(perSession?.error_code).toBe('token_revocation_failed');
  });

  it('summarises the run, marking completed a failure iff anything failed', async () => {
    const h = await buildHarness({
      sids: ['sid-1', 'sid-2'],
      markTerminatedImpl: async sid => {
        if (sid === 'sid-2') throw new Error('nope');
      },
    });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    const completed = h.auditRecords.at(-1);
    expect(completed?.event_type).toBe('session.revocation.completed');
    expect(completed?.outcome).toBe('failure');
    expect(completed?.truncated_input).toBe('revoked=1 failed=1 total=2');
  });

  it('marks completed a success when everything succeeded', async () => {
    const h = await buildHarness({ sids: ['sid-1', 'sid-2'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(h.auditRecords.at(-1)).toMatchObject({
      event_type: 'session.revocation.completed',
      outcome: 'success',
      truncated_input: 'revoked=2 failed=0 total=2',
    });
  });

  // FR-022 — a best-effort call that fails only into silence is an unmonitored
  // control, which is worse than no control because it looks like one.
  it('never fails silently: a per-session failure is both audited and logged', async () => {
    const h = await buildHarness({
      markTerminatedImpl: async () => {
        throw new Error('redis write failed');
      },
    });
    stdoutSpy = captureAudit(h);

    await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(
      h.auditRecords.filter(
        r => r.event_type === 'session.revoked' && r.outcome === 'failure'
      )
    ).toHaveLength(1);
    expect(h.logger.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T025 / T026 — US3: the primitive is reusable by the three pending consumers
// ---------------------------------------------------------------------------

describe('revokeAllForSub — contract C7: exceptSid', () => {
  // OWASP ASVS V3.3.2 — "terminate all *other* active sessions after a
  // password change". Needed unchanged by client-web#10070 and by
  // server#6073's scope=others.
  it('leaves the excepted session completely untouched', async () => {
    const h = await buildHarness({ sids: ['sid-keep', 'sid-drop'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'password_changed', {
      exceptSid: 'sid-keep',
    });

    const keep = report.entries.find(e => e.sid === 'sid-keep');
    const drop = report.entries.find(e => e.sid === 'sid-drop');
    expect(keep).toMatchObject({
      outcome: 'skipped_excepted',
      tokenRevocation: 'skipped',
    });
    expect(drop).toMatchObject({ outcome: 'revoked' });
    expect(h.sessionStore.markTerminated).toHaveBeenCalledTimes(1);
    expect(h.sessionStore.markTerminated).toHaveBeenCalledWith(
      'sid-drop',
      'password_changed',
      expect.anything()
    );
  });

  it('leaves the excepted session in the index for a later scope=others call', async () => {
    const h = await buildHarness({ sids: ['sid-keep', 'sid-drop'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    await h.service.revokeAllForSub(SUB, 'user_revoked', {
      exceptSid: 'sid-keep',
    });

    expect(h.redis.srem).not.toHaveBeenCalledWith(subIndexKey(SUB), 'sid-keep');
    expect(h.redis.srem).toHaveBeenCalledWith(subIndexKey(SUB), 'sid-drop');
  });

  it('does not count the excepted session as revoked or failed', async () => {
    const h = await buildHarness({ sids: ['sid-keep', 'sid-drop'] });
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'password_changed', {
      exceptSid: 'sid-keep',
    });

    expect(report.revokedCount).toBe(1);
    expect(report.failedCount).toBe(0);
    expect(report.complete).toBe(true);
  });
});

describe('revokeAllForSub — consumer compatibility', () => {
  const REASONS: SessionRevocationReason[] = [
    'account_deleted',
    'password_changed',
    'email_changed',
    'admin_revoked',
    'user_revoked',
  ];

  // The evidence for the consumer matrix in
  // contracts/session-revocation-service.md: server#6073, client-web#10070 and
  // the admin email-change flow all consume this without editing it (trap 10).
  it.each(
    REASONS
  )('accepts reason %s and records it verbatim in the tombstone and the audit', async reason => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, reason);

    expect(h.sessionStore.markTerminated).toHaveBeenCalledWith(
      'sid-1',
      reason,
      expect.anything()
    );
    expect(report.reason).toBe(reason);
    for (const rec of h.auditRecords) expect(rec.reason).toBe(reason);
  });

  it('generates a correlation id when the caller supplies none', async () => {
    const h = await buildHarness();
    stdoutSpy = captureAudit(h);
    okFetch();

    const report = await h.service.revokeAllForSub(SUB, 'account_deleted');

    expect(report.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
