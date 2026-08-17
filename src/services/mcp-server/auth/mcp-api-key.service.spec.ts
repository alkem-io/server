import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpApiKeyOperation } from '../dto/mcp.api.key.dto';
import { McpApiKeyAuditService } from './mcp-api-key.audit.service';
import { McpApiKeyService } from './mcp-api-key.service';

const ACTOR = 'actor-virtual-assistant';
const SCOPES: any = [{ operations: ['read', 'tools'] }];
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const build = () => {
  const repo = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (e: any) => ({ id: e.id ?? 'new-id', ...e })),
  };
  const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const auditService = {
    recordMint: vi.fn().mockResolvedValue(undefined),
    recordRevoke: vi.fn().mockResolvedValue(undefined),
  };
  // A minimal fake EntityManager whose `.transaction()` runs the callback
  // against a manager that reads/writes through the SAME `repo` mock, so
  // assertions on `repo.save`/`repo.find` still work for the transactional
  // paths (mintApiKeyForUser, revokeOwnApiKey, adminRevokeApiKey). Exposed so
  // individual tests can override `manager.count` (cap boundary) or
  // `manager.findOne` (owner mismatch) per-case.
  const manager: any = {
    query: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn((_entity: any, data: any) => data),
    save: vi.fn(async (e: any) => repo.save(e)),
    findOne: vi.fn(async (_entity: any, opts: any) => repo.findOne(opts)),
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        where: vi.fn(() => qb),
        andWhere: vi.fn(() => qb),
        getOne: vi.fn(async () => repo.findOne()),
      };
      return qb;
    }),
  };
  const entityManager = {
    transaction: vi.fn(async (cb: any) => cb(manager)),
  };
  const service = new McpApiKeyService(
    repo as any,
    logger as any,
    entityManager as any,
    auditService as any as McpApiKeyAuditService
  );
  return { service, repo, entityManager, manager, auditService };
};

describe('McpApiKeyService.ensureActorKeyFromPlaintext (issue #1937)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an actor-bound key (hash of the plaintext) when none exists', async () => {
    const { service, repo } = build();

    await service.ensureActorKeyFromPlaintext(ACTOR, 'mcp_secret', SCOPES);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.actorId).toBe(ACTOR);
    expect(saved.userId).toBeUndefined(); // actor-bound only (trust-anchor invariant)
    expect(saved.isActive).toBe(true);
    expect(saved.keyHash).toBe(sha256('mcp_secret')); // stores the HASH, not the secret
    expect(saved.keyHash).toHaveLength(64);
    // FR-003: the plaintext is never persisted (no plaintext field, hash ≠ secret)
    expect(saved.keyHash).not.toBe('mcp_secret');
    expect((saved as any).apiKey).toBeUndefined();
  });

  it('is idempotent — no write when an active, correctly-bound key already exists', async () => {
    const { service, repo } = build();
    const existing = {
      id: 'k1',
      actorId: ACTOR,
      keyHash: sha256('mcp_secret'),
      isActive: true,
      scopes: SCOPES,
    };
    repo.find.mockResolvedValue([existing]); // active for actor, same hash → not stale
    repo.findOne.mockResolvedValue(existing);

    const res = await service.ensureActorKeyFromPlaintext(
      ACTOR,
      'mcp_secret',
      SCOPES
    );

    expect(res).toBe(existing);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('reactivates a deactivated key AND refreshes stale scopes', async () => {
    const { service, repo } = build();
    const existing = {
      id: 'k1',
      actorId: ACTOR,
      keyHash: sha256('mcp_secret'),
      isActive: false,
      scopes: [{ operations: ['read'] }], // stale — missing 'tools'
    };
    repo.find.mockResolvedValue([]); // no ACTIVE keys for the actor
    repo.findOne.mockResolvedValue(existing);

    await service.ensureActorKeyFromPlaintext(ACTOR, 'mcp_secret', SCOPES);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.isActive).toBe(true);
    expect(saved.scopes).toEqual(SCOPES); // refreshed, not stale
  });

  it('clears userId when re-asserting on a user-bound matching-hash row (FR-002 XOR)', async () => {
    const { service, repo } = build();
    // A pre-existing row with the SAME hash but bound to a user (not the actor) —
    // re-asserting must move it to actor-binding AND clear userId, never leave both set.
    const existing = {
      id: 'k1',
      userId: 'some-user',
      actorId: ACTOR,
      keyHash: sha256('mcp_secret'),
      isActive: true,
      scopes: SCOPES,
    };
    repo.find.mockResolvedValue([]);
    repo.findOne.mockResolvedValue(existing);

    await service.ensureActorKeyFromPlaintext(ACTOR, 'mcp_secret', SCOPES);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.actorId).toBe(ACTOR);
    expect(saved.userId == null).toBe(true); // null/undefined — XOR holds
    expect(saved.isActive).toBe(true);
  });

  it('rotation: deactivates a stale active key and creates the new one', async () => {
    const { service, repo } = build();
    const stale = {
      id: 'old',
      actorId: ACTOR,
      keyHash: 'oldhash',
      isActive: true,
    };
    repo.find.mockResolvedValue([stale]); // active, different hash → rotated
    repo.findOne.mockResolvedValue(null); // new hash not present yet

    await service.ensureActorKeyFromPlaintext(ACTOR, 'mcp_rotated', SCOPES);

    expect(repo.save).toHaveBeenCalledTimes(2);
    const staleSave = repo.save.mock.calls.find(c => c[0].id === 'old')![0];
    expect(staleSave.isActive).toBe(false); // old key retired
    const created = repo.save.mock.calls.find(c => c[0].id !== 'old')![0];
    expect(created.actorId).toBe(ACTOR);
    expect(created.keyHash).toBe(sha256('mcp_rotated'));
    expect(created.isActive).toBe(true);
  });

  it('survives a concurrent insert race — re-reads on a unique violation, no throw', async () => {
    const { service, repo } = build();
    // A racing replica inserted the same hash between our find and save.
    const raced = {
      id: 'raced',
      actorId: ACTOR,
      keyHash: sha256('mcp_secret'),
      isActive: true,
      scopes: SCOPES,
    };
    repo.findOne
      .mockResolvedValueOnce(null) // initial find: absent
      .mockResolvedValueOnce(raced); // re-read after the duplicate-key error
    repo.save.mockRejectedValueOnce({ code: '23505' }); // our INSERT loses the race

    const res = await service.ensureActorKeyFromPlaintext(
      ACTOR,
      'mcp_secret',
      SCOPES
    );

    expect(res).toBe(raced); // re-read row returned; startup not aborted
  });
});

const USER = 'user-1';

describe('McpApiKeyService.mintApiKeyForUser (workspace#038)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes duplicate operations into ONE scope object with no spaceIds (FR-004, R-06)', async () => {
    const { service } = build();

    const { entity } = await service.mintApiKeyForUser(USER, {
      name: 'my-key',
      operations: [
        McpApiKeyOperation.READ,
        McpApiKeyOperation.TOOLS,
        McpApiKeyOperation.READ, // duplicate
      ],
    });

    expect(entity.scopes).toHaveLength(1);
    expect(entity.scopes[0]).toEqual({ operations: ['read', 'tools'] });
    expect((entity.scopes[0] as any).spaceIds).toBeUndefined();
  });

  it('takes the per-user advisory lock before counting usable keys (FR-006)', async () => {
    const { service, manager } = build();

    await service.mintApiKeyForUser(USER, {
      name: 'k',
      operations: [McpApiKeyOperation.READ],
    });

    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [USER]
    );
    const lockCallOrder = manager.query.mock.invocationCallOrder[0];
    const countCallOrder = manager.count.mock.invocationCallOrder[0];
    expect(lockCallOrder).toBeLessThan(countCallOrder);
  });

  it('refuses to mint at the cap of 10 usable keys (FR-005, C-05)', async () => {
    const { service, manager } = build();
    manager.count.mockResolvedValue(10);

    await expect(
      service.mintApiKeyForUser(USER, {
        name: 'k',
        operations: [McpApiKeyOperation.READ],
      })
    ).rejects.toThrow(/limit/i);
  });

  it('does not consume the allowance below the cap (9 usable → mint succeeds)', async () => {
    const { service, manager } = build();
    manager.count.mockResolvedValue(9);

    await expect(
      service.mintApiKeyForUser(USER, {
        name: 'k',
        operations: [McpApiKeyOperation.READ],
      })
    ).resolves.toBeDefined();
  });

  it('serializes concurrent mints at the boundary to exactly one winner (FR-006, R-038-1)', async () => {
    const { service, repo, auditService } = build();
    // A real `pg_advisory_xact_lock` makes the WHOLE cap-check+insert critical
    // section mutually exclusive across concurrent transactions contending for
    // the same key — the second transaction's body only starts once the
    // first's has committed (lock released at transaction end). This mutex
    // models exactly that guarantee at the `entityManager.transaction` level,
    // with a stateful "usable" counter shared across the (now-serialized)
    // critical sections — the property under test.
    let usable = 9;
    let queue: Promise<unknown> = Promise.resolve();
    const manager: any = {
      query: vi.fn().mockResolvedValue(undefined),
      count: vi.fn(async () => usable),
      create: vi.fn((_entity: any, data: any) => data),
      save: vi.fn(async (e: any) => {
        const saved = await repo.save(e);
        usable += 1;
        return saved;
      }),
    };
    const entityManager = {
      transaction: vi.fn((cb: any) => {
        // Chain each call onto the previous — mutual exclusion, matching the
        // advisory lock's real effect.
        const run = queue.then(() => cb(manager));
        queue = run.catch(() => undefined);
        return run;
      }),
    };
    const serializedService = new (service.constructor as any)(
      repo,
      { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() },
      entityManager,
      auditService
    );

    const [first, second] = await Promise.allSettled([
      serializedService.mintApiKeyForUser(USER, {
        name: 'a',
        operations: [McpApiKeyOperation.READ],
      }),
      serializedService.mintApiKeyForUser(USER, {
        name: 'b',
        operations: [McpApiKeyOperation.READ],
      }),
    ]);

    const outcomes = [first.status, second.status];
    expect(outcomes.filter(s => s === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(s => s === 'rejected')).toHaveLength(1);
  });

  it('rejects a past expiresAt (FR-003)', async () => {
    const { service } = build();
    await expect(
      service.mintApiKeyForUser(USER, {
        name: 'k',
        operations: [McpApiKeyOperation.READ],
        expiresAt: new Date(Date.now() - 60_000),
      })
    ).rejects.toThrow(/future/i);
  });

  it('rolls back the transaction (propagates) when the audit write throws — no key row survives (FR-023, R-038-5)', async () => {
    const { service, auditService } = build();
    auditService.recordMint.mockRejectedValueOnce(new Error('audit db down'));

    await expect(
      service.mintApiKeyForUser(USER, {
        name: 'k',
        operations: [McpApiKeyOperation.READ],
      })
    ).rejects.toThrow(/audit db down/);
  });

  it('records the mint audit row in the SAME transaction manager as the insert (FR-023)', async () => {
    const { service, manager, auditService } = build();

    await service.mintApiKeyForUser(USER, {
      name: 'k',
      operations: [McpApiKeyOperation.READ],
    });

    expect(auditService.recordMint).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        ownerUserId: USER,
        initiatorUserId: USER,
        operations: ['read'],
      })
    );
  });
});

describe('McpApiKeyService.revokeOwnApiKey (workspace#038)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets isActive=false and records the revoke audit row', async () => {
    const { service, repo, auditService } = build();
    repo.findOne.mockResolvedValue({
      id: 'k1',
      userId: USER,
      name: 'my-key',
      isActive: true,
    });

    const revoked = await service.revokeOwnApiKey('k1', USER);

    expect(revoked.isActive).toBe(false);
    expect(auditService.recordRevoke).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ownerUserId: USER,
        initiatorUserId: USER,
        keyId: 'k1',
      })
    );
  });

  it('is idempotent — revoking an already-revoked key writes no second audit row', async () => {
    const { service, repo, auditService } = build();
    repo.findOne.mockResolvedValue({
      id: 'k1',
      userId: USER,
      name: 'my-key',
      isActive: false,
    });

    await service.revokeOwnApiKey('k1', USER);

    expect(auditService.recordRevoke).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails as not-found (without disclosing existence) for another user's key", async () => {
    const { service, repo } = build();
    // The query is scoped by (id, userId) — a key owned by someone else never
    // matches, so the repository correctly returns null; the service must not
    // distinguish "does not exist" from "exists but is not yours".
    repo.findOne.mockResolvedValue(null);

    await expect(service.revokeOwnApiKey('k1', USER)).rejects.toThrow(
      /not found/i
    );
  });

  it('exposes no delete-capable method at all (FR-011)', () => {
    // Assert against the real class, not a hand-built mock. The previous
    // version of this test checked `repo.delete === undefined` on a stub that
    // was never given a `delete` — it passed regardless of what the service
    // did, and would not have noticed the legacy `deleteApiKey` that survived
    // the REST deletion with zero callers on a service now injected into three
    // GraphQL surfaces.
    const methods = Object.getOwnPropertyNames(McpApiKeyService.prototype);
    expect(methods).not.toContain('deleteApiKey');
    expect(methods.filter(m => /delete|destroy|purge/i.test(m))).toEqual([]);
  });

  it('excludes actor-bound keys from the admin list (R-038-4)', async () => {
    // The `userId IS NOT NULL` firewall is what keeps the bootstrap trust
    // anchor out of reach of the admin surface. Assert it on the query the
    // SERVICE actually builds — the resolver spec only proves forwarding, so
    // dropping this clause would otherwise go unnoticed by every test.
    const { service, repo } = build();
    const qb: any = {
      select: vi.fn(() => qb),
      where: vi.fn(() => qb),
      andWhere: vi.fn(() => qb),
      orderBy: vi.fn(() => qb),
      getMany: vi.fn().mockResolvedValue([]),
    };
    (repo as any).createQueryBuilder = vi.fn(() => qb);

    await service.listUserKeysForAdmin(USER);

    const clauses = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    expect(clauses.some((c: string) => /userId IS NOT NULL/i.test(c))).toBe(
      true
    );
    // and the owner predicate is still scoped to the requested user
    expect(String(qb.where.mock.calls[0][0])).toMatch(/key\.userId = :userId/);
  });
});
