import { vi } from 'vitest';
import * as Y from 'yjs';
import { CollaborationDocumentService } from './collaboration-document.service';
import { UpdateRejectedError } from './collaboration-document.session';

/**
 * The service `mutate()` retry loop, at the smallest possible seam: `newSession` is
 * stubbed so no socket/network is opened. These prove the two load-bearing retry
 * semantics of the correlated durability barrier:
 *   - an ambiguous (non-terminal) durability failure retries on a FRESH session and
 *     RESENDS the EXACT first-attempt update bytes (never a re-derivation), then a fresh
 *     `requestDurability` (a fresh reqId lives on the fresh session) succeeds; and
 *   - an `UpdateRejectedError` is TERMINAL — resending identical rejected bytes is
 *     futile, so it is thrown without a retry.
 */
describe('CollaborationDocumentService.mutate — correlated-barrier retry semantics', () => {
  const buildService = () => {
    const configValues: Record<string, unknown> = {
      'collaboration.service.url': 'ws://localhost:4006',
      'collaboration.service.actor_id_header': 'X-Alkemio-Actor-Id',
      'collaboration.service.connect_timeout': 15_000,
      'collaboration.service.durability_timeout': 20_000,
    };
    const configService = {
      get: vi.fn((key: string) => configValues[key]),
    };
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    return new CollaborationDocumentService(
      configService as never,
      logger as never
    );
  };

  const fakeSession = (opts: {
    mutationBytes?: Uint8Array | null;
    durability: () => Promise<void>;
  }) => ({
    doc: new Y.Doc(),
    connect: vi.fn(async () => undefined),
    isReadOnly: () => false,
    readOnlyError: () => new Error('read-only'),
    sendMutation: vi.fn(
      (_m: (doc: Y.Doc) => void) =>
        opts.mutationBytes ?? new Uint8Array([1, 2, 3])
    ),
    resend: vi.fn((_u: Uint8Array) => undefined),
    requestDurability: vi.fn(() => opts.durability()),
    close: vi.fn(() => undefined),
  });

  it('on an ambiguous (non-terminal) durability failure, retries on a FRESH session that RESENDS the exact same update bytes (never re-derives), then succeeds', async () => {
    const service = buildService();
    const bytes = new Uint8Array([9, 8, 7]);
    const s0 = fakeSession({
      mutationBytes: bytes,
      durability: () =>
        Promise.reject(new Error('ambiguous close before durability')),
    });
    const s1 = fakeSession({
      mutationBytes: null,
      durability: () => Promise.resolve(),
    });
    const newSession = vi
      .spyOn(service as never as { newSession: () => unknown }, 'newSession')
      .mockReturnValueOnce(s0 as never)
      .mockReturnValueOnce(s1 as never);

    await expect(
      service.mutate('wb-1', 'whiteboard', 'actor-1', () => undefined)
    ).resolves.toBeUndefined();

    // Two sessions: attempt 0, then one retry.
    expect(newSession).toHaveBeenCalledTimes(2);
    // Attempt 0 SENDS the mutation; the retry RESENDS the SAME bytes and never re-derives.
    expect(s0.sendMutation).toHaveBeenCalledTimes(1);
    expect(s1.sendMutation).not.toHaveBeenCalled();
    expect(s1.resend).toHaveBeenCalledWith(bytes);
    // Each attempt requested durability on its own (fresh) session.
    expect(s0.requestDurability).toHaveBeenCalledTimes(1);
    expect(s1.requestDurability).toHaveBeenCalledTimes(1);
    // Every session is closed.
    expect(s0.close).toHaveBeenCalledTimes(1);
    expect(s1.close).toHaveBeenCalledTimes(1);
  });

  it('an UpdateRejectedError from durability is TERMINAL — thrown to the caller with NO retry', async () => {
    const service = buildService();
    const s0 = fakeSession({
      mutationBytes: new Uint8Array([1]),
      durability: () => Promise.reject(new UpdateRejectedError('wb-1')),
    });
    const newSession = vi
      .spyOn(service as never as { newSession: () => unknown }, 'newSession')
      .mockReturnValueOnce(s0 as never);

    await expect(
      service.mutate('wb-1', 'whiteboard', 'actor-1', () => undefined)
    ).rejects.toBeInstanceOf(UpdateRejectedError);

    // Exactly ONE session — a rejected update is never resent.
    expect(newSession).toHaveBeenCalledTimes(1);
    expect(s0.resend).not.toHaveBeenCalled();
    expect(s0.close).toHaveBeenCalledTimes(1);
  });
});
