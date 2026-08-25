import { ActorContext } from '@core/actor-context/actor.context';
import { DocumentPurgingError } from '@services/collaboration-client/collaboration-document.session';
import { vi } from 'vitest';
import { WhiteboardResourceProvider } from './whiteboard.resource';

// No fork mock: the provider DOES await the real `loadWhiteboardFork()` before joining the
// room, but the mocked collaboration service below ignores the reader callback, so the
// returned fork is never used — running the real loader here is harmless. A GLOBAL
// `vi.mock` of `whiteboard.fork` would instead, under isolate:false, poison the real-loader
// boundary spec (`whiteboard.fork.cjs-boundary.spec.ts`) by worker/order; the real loader
// is now Vitest-drivable (CommonJS `require`), so no mock is warranted.

const WB_ID = 'wb-1';
const URI = `alkemio://whiteboards/${WB_ID}`;
const ctx = Object.assign(new ActorContext(), { actorID: 'actor-1' });

/**
 * The whiteboard MCP resource reads the LIVE scene from the collaboration room.
 * A read REJECTION must PROPAGATE — a failed read (including a purging/deleted
 * room, `DocumentPurgingError`) must never be masked as a synthetic empty scene,
 * which would misreport a real read failure as an empty whiteboard. A genuinely
 * EMPTY successful read still legitimately returns no elements.
 */
const buildProvider = (
  readImpl: () => Promise<{
    elements: unknown[];
    files: Record<string, unknown>;
  }>
) => {
  const whiteboardService = {
    getWhiteboardOrFail: vi.fn().mockResolvedValue({
      id: WB_ID,
      profile: { displayName: 'WB', description: 'desc' },
      contentUpdatePolicy: 'ADMINS',
      createdBy: 'actor-1',
      previewSettings: {},
    }),
  };
  const collaborationService = { read: vi.fn(readImpl) };
  const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const provider = new WhiteboardResourceProvider(
    whiteboardService as any,
    collaborationService as any,
    logger as any
  );
  return { provider, collaborationService };
};

describe('WhiteboardResourceProvider — read-failure propagation', () => {
  it('propagates a generic read REJECTION (no synthetic-empty success)', async () => {
    const { provider } = buildProvider(() =>
      Promise.reject(new Error('room join failed'))
    );

    await expect(provider.read(URI, ctx)).rejects.toThrow('room join failed');
  });

  it('propagates a DocumentPurgingError (a deleted room is NOT an empty whiteboard)', async () => {
    const { provider } = buildProvider(() =>
      Promise.reject(new DocumentPurgingError(WB_ID))
    );

    await expect(provider.read(URI, ctx)).rejects.toBeInstanceOf(
      DocumentPurgingError
    );
  });

  it('a genuinely-empty SUCCESSFUL read still returns an empty scene (not an error)', async () => {
    const { provider } = buildProvider(() =>
      Promise.resolve({ elements: [], files: {} })
    );

    const result = await provider.read(URI, ctx);
    const payload = JSON.parse(result.contents[0].text);
    expect(payload.content).toEqual({
      type: 'excalidraw',
      elements: [],
      files: {},
    });
  });
});
