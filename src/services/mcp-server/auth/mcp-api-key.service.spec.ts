import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  const service = new McpApiKeyService(repo as any, logger as any);
  return { service, repo };
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

  it('reactivates a matching but deactivated key', async () => {
    const { service, repo } = build();
    const existing = {
      id: 'k1',
      actorId: ACTOR,
      keyHash: sha256('mcp_secret'),
      isActive: false,
    };
    repo.find.mockResolvedValue([]); // no ACTIVE keys for the actor
    repo.findOne.mockResolvedValue(existing);

    await service.ensureActorKeyFromPlaintext(ACTOR, 'mcp_secret', SCOPES);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0][0].isActive).toBe(true);
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
});
