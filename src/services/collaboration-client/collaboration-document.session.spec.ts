import { vi } from 'vitest';
import * as Y from 'yjs';
import { CollaborationDocumentSession } from './collaboration-document.session';

/**
 * `edit_whiteboard_elements` drives the write session's `sendMutation`, which is
 * where a whiteboard edit becomes a WS update frame (`sendMutation` → `resend` →
 * `send` → `ws.send`). The contract on an invalid op is NOT a Yjs transaction
 * rollback: `applyEditOps` throws SYNCHRONOUSLY inside the mutator, so the throw
 * propagates out of `sendMutation` BEFORE it emits any frame — ZERO WS update
 * frame is sent and the failed edit never reaches the server.
 *
 * This RED observes that real seam directly: a REAL `CollaborationDocumentSession`
 * with a fake `ws` capturing `send`. A synchronous mutator throw must emit no
 * frame; a successful mutation must emit exactly one.
 */
describe('CollaborationDocumentSession.sendMutation — no frame on mutator throw', () => {
  const buildSession = () => {
    const session = new CollaborationDocumentSession(
      'ws://collab/room',
      {},
      'wb-1'
    );
    const wsSend = vi.fn();
    // `send()` forwards to `this.ws?.send`; inject a fake socket to observe frames
    // without opening a real connection.
    (session as unknown as { ws: { send: (b: Uint8Array) => void } }).ws = {
      send: wsSend,
    };
    return { session, wsSend };
  };

  it('a synchronous mutator throw sends ZERO WS update frames and rethrows', () => {
    const { session, wsSend } = buildSession();

    // Mirror applyEditOps failing mid-batch: some ops mutate the ephemeral local
    // doc, then an invalid op throws. Those partial mutations must NEVER reach the
    // wire — the throw propagates before sendMutation emits its frame.
    const boom = new Error('operations[1]: element not found.');
    expect(() =>
      session.sendMutation(doc => {
        doc.getMap<number>('elements').set('partial', 1);
        throw boom;
      })
    ).toThrow(boom);

    // The throw propagated before sendMutation emitted a frame: no ws.send.
    expect(wsSend).not.toHaveBeenCalled();
  });

  it('a successful mutation emits exactly one WS update frame (positive control)', () => {
    const { session, wsSend } = buildSession();

    const bytes = session.sendMutation(doc => {
      doc.getMap<number>('elements').set('a', 1);
    });

    expect(bytes).not.toBeNull();
    expect(wsSend).toHaveBeenCalledTimes(1);
  });

  it('a no-op mutation sends no frame and returns null', () => {
    const { session, wsSend } = buildSession();

    const bytes = session.sendMutation((_doc: Y.Doc) => {
      // touch nothing
    });

    expect(bytes).toBeNull();
    expect(wsSend).not.toHaveBeenCalled();
  });
});
