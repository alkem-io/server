import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { vi } from 'vitest';
import * as Y from 'yjs';
import {
  CollaborationDocumentSession,
  UpdateRejectedError,
} from './collaboration-document.session';

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

/**
 * The CORRELATED durability barrier (`requestDurability`). The session sends a
 * `persist-request(requestId)` (wire type 4, raw JSON) and resolves ONLY on the
 * `persisted(requestId)` that answers it — never on a room-wide `saved`. These REDs
 * drive the real `onControl`/`settleBarrier` seam: a fake `ws` captures the request
 * frame, and server control frames are fed through the real `onMessage`.
 */
describe('CollaborationDocumentSession.requestDurability — correlated persist barrier', () => {
  const WIRE_CONTROL = 3;
  const WIRE_DURABILITY_REQUEST = 4;

  const buildSession = () => {
    const session = new CollaborationDocumentSession(
      'ws://collab/room',
      {},
      'wb-1'
    );
    const wsSend = vi.fn();
    (session as unknown as { ws: { send: (b: Uint8Array) => void } }).ws = {
      send: wsSend,
    };
    return { session, wsSend };
  };

  /** Feed a server control frame (`[3][raw JSON]`) through the real message path. */
  const feedControl = (
    session: CollaborationDocumentSession,
    msg: Record<string, unknown>
  ): void => {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, WIRE_CONTROL);
    encoding.writeUint8Array(
      enc,
      new TextEncoder().encode(JSON.stringify(msg))
    );
    const bytes = encoding.toUint8Array(enc);
    (session as unknown as { onMessage: (d: ArrayBuffer) => void }).onMessage(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    );
  };

  /** The requestId the session put in its last persist-request frame (`[4][{"requestId"}]`). */
  const sentRequestId = (frame: Uint8Array): string => {
    const dec = decoding.createDecoder(frame);
    expect(decoding.readVarUint(dec)).toBe(WIRE_DURABILITY_REQUEST);
    const tail = decoding.readTailAsUint8Array(dec);
    return (JSON.parse(new TextDecoder().decode(tail)) as { requestId: string })
      .requestId;
  };

  /** Whether a promise has settled after one microtask flush (a still-pending probe). */
  const settledAfterMicrotask = async (
    p: Promise<unknown>
  ): Promise<boolean> => {
    let settled = false;
    p.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );
    await Promise.resolve();
    return settled;
  };

  it('installs the waiter BEFORE the send — a persisted fed synchronously from INSIDE ws.send resolves it (type-4 request, valid reqId)', async () => {
    let sentReqId: string | undefined;
    const session = new CollaborationDocumentSession(
      'ws://collab/room',
      {},
      'wb-1'
    );
    // The fake socket answers from INSIDE send: it parses the type-4 request and feeds
    // the matching `persisted` SYNCHRONOUSLY. That resolves the barrier ONLY if the
    // waiter was already installed when send ran — i.e. before the send. (Moving the
    // send before the waiter install makes this feed a no-op and the promise never
    // resolves — so this test is discriminating on the ordering.)
    const wsSend = vi.fn((frame: Uint8Array) => {
      sentReqId = sentRequestId(frame);
      feedControl(session, { kind: 'persisted', requestId: sentReqId });
    });
    (session as unknown as { ws: { send: (b: Uint8Array) => void } }).ws = {
      send: wsSend,
    };

    const p = session.requestDurability(1000);
    // crypto.randomUUID → passes the service's validRequestID (alphabet + ≤64).
    expect(sentReqId).toMatch(/^[0-9a-fA-F-]{36}$/);
    // Already settled: the barrier existed when the in-send response arrived.
    expect(await settledAfterMicrotask(p)).toBe(true);
    await expect(p).resolves.toBeUndefined();
  });

  it('IGNORES a persisted with a non-matching requestId, then resolves on the correct one', async () => {
    const { session, wsSend } = buildSession();
    const p = session.requestDurability(1000);
    const reqId = sentRequestId(wsSend.mock.calls[0][0] as Uint8Array);
    feedControl(session, {
      kind: 'persisted',
      requestId: 'not-our-request-id',
    });
    expect(await settledAfterMicrotask(p)).toBe(false);
    feedControl(session, { kind: 'persisted', requestId: reqId });
    await expect(p).resolves.toBeUndefined();
  });

  it('a room-wide saved broadcast does NOT resolve the barrier (correlation, not room-wide)', async () => {
    const { session, wsSend } = buildSession();
    const p = session.requestDurability(1000);
    feedControl(session, { kind: 'saved', version: 7 });
    expect(await settledAfterMicrotask(p)).toBe(false);
    // Settle so the barrier's timer is cleared.
    feedControl(session, {
      kind: 'persisted',
      requestId: sentRequestId(wsSend.mock.calls[0][0] as Uint8Array),
    });
    await expect(p).resolves.toBeUndefined();
  });

  it('rejects on a persist-failed matching the request', async () => {
    const { session, wsSend } = buildSession();
    const p = session.requestDurability(1000);
    const reqId = sentRequestId(wsSend.mock.calls[0][0] as Uint8Array);
    feedControl(session, {
      kind: 'persist-failed',
      requestId: reqId,
      error: 'store unavailable',
    });
    await expect(p).rejects.toThrow('store unavailable');
  });

  it('update-rejected (uncorrelated, NO requestId) rejects the barrier, sticky-poisons the session, and a later matching persisted cannot flip it to success', async () => {
    const { session, wsSend } = buildSession();
    const p = session.requestDurability(1000);
    const reqId = sentRequestId(wsSend.mock.calls[0][0] as Uint8Array);
    // The real Go frame carries NO requestId (it answers the preceding update).
    feedControl(session, {
      kind: 'update-rejected',
      error: 'file locators must be references, not inline data',
    });
    await expect(p).rejects.toBeInstanceOf(UpdateRejectedError);
    // A later persisted with the ORIGINAL reqId finds no barrier — inert, cannot resolve.
    feedControl(session, { kind: 'persisted', requestId: reqId });
    // The sticky poison makes a fresh request reject IMMEDIATELY, without sending.
    wsSend.mockClear();
    await expect(session.requestDurability(1000)).rejects.toBeInstanceOf(
      UpdateRejectedError
    );
    expect(wsSend).not.toHaveBeenCalled();
  });

  it('refuses a SECOND concurrent request WITHOUT sending a second frame (one outstanding)', async () => {
    const { session, wsSend } = buildSession();
    const p1 = session.requestDurability(1000);
    expect(wsSend).toHaveBeenCalledTimes(1);
    await expect(session.requestDurability(1000)).rejects.toThrow(
      /already outstanding/
    );
    expect(wsSend).toHaveBeenCalledTimes(1); // no second frame
    feedControl(session, {
      kind: 'persisted',
      requestId: sentRequestId(wsSend.mock.calls[0][0] as Uint8Array),
    });
    await expect(p1).resolves.toBeUndefined();
  });

  it('rejects on timeout and clears the waiter+timer — a later matching persisted is inert and a fresh request works', async () => {
    vi.useFakeTimers();
    try {
      const { session, wsSend } = buildSession();
      const p = session.requestDurability(1000);
      const reqId = sentRequestId(wsSend.mock.calls[0][0] as Uint8Array);
      vi.advanceTimersByTime(1000);
      await expect(p).rejects.toThrow(/timed out/);
      // The barrier + timer were cleared: a late matching persisted does nothing, and a
      // fresh request is accepted (a timeout does NOT poison the session).
      feedControl(session, { kind: 'persisted', requestId: reqId });
      const p2 = session.requestDurability(1000);
      expect(wsSend).toHaveBeenCalledTimes(2);
      feedControl(session, {
        kind: 'persisted',
        requestId: sentRequestId(wsSend.mock.calls[1][0] as Uint8Array),
      });
      await expect(p2).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('session.close() rejects an outstanding barrier synchronously', async () => {
    const { session } = buildSession();
    const p = session.requestDurability(1000);
    session.close();
    await expect(p).rejects.toThrow(/closed/);
  });

  it('a SYNCHRONOUS ws.send failure rejects the RETURNED promise (not an orphan), leaves no barrier/timer, and lets a fresh request proceed', async () => {
    const session = new CollaborationDocumentSession(
      'ws://collab/room',
      {},
      'wb-1'
    );
    const boom = new Error('WebSocket is not open: readyState 2 (CLOSING)');
    let fail = true;
    const wsSend = vi.fn((_frame: Uint8Array) => {
      if (fail) {
        throw boom;
      }
    });
    (session as unknown as { ws: { send: (b: Uint8Array) => void } }).ws = {
      send: wsSend,
    };

    // The send throws synchronously — the rejection must arrive through the returned
    // promise, never as an orphan the caller's close() rejects into an unhandled rejection.
    await expect(session.requestDurability(1000)).rejects.toThrow(boom);
    // No barrier/timer remained: a fresh request is accepted (send now succeeds).
    fail = false;
    const p = session.requestDurability(1000);
    feedControl(session, {
      kind: 'persisted',
      requestId: sentRequestId(wsSend.mock.calls.at(-1)?.[0] as Uint8Array),
    });
    await expect(p).resolves.toBeUndefined();
  });

  it('after close() a requestDurability rejects WITHOUT sending (session marked terminally closed)', async () => {
    const { session, wsSend } = buildSession();
    session.close();
    wsSend.mockClear();
    await expect(session.requestDurability(1000)).rejects.toThrow(/closed/);
    expect(wsSend).not.toHaveBeenCalled();
  });
});
