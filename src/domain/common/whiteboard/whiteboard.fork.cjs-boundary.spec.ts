import { createRequire } from 'node:module';
import { vi } from 'vitest';
import { loadWhiteboardFork } from './whiteboard.fork';

/**
 * Console DIAGNOSTICS Yjs emits WITHOUT throwing when two instances mix — `[yjs#509]
 * Not same Y.Doc` and `[yjs#438] … already imported`. Captured so a warning-only
 * regression fails too. (The other cross-instance symptom — a THROWN `Unexpected content
 * type` on the first write — is caught behaviourally by the insert/round-trip asserts,
 * not here.)
 */
const CROSS_INSTANCE = /#509|Not same Y\.Doc|#438|already imported/i;

/**
 * The CJS/ESM single-Yjs-instance boundary. This exercises the REAL
 * `loadWhiteboardFork()` (not a direct `require` of the package) and hands its `Scene`
 * a `Y.Doc` from the server's own CommonJS `yjs` — so it is load-bearing on the LOADER,
 * not just the published artifact:
 *
 *   - as shipped (`whiteboard.fork.ts` loads the fork's `require`/CJS build), the fork
 *     shares the server's single `yjs.cjs` instance → insert/mutate/encode succeed; but
 *   - if the loader regresses to a dynamic ESM `import()`, the fork resolves the ESM
 *     headless + `yjs.mjs` — a SECOND Yjs instance — and the first write into this CJS
 *     `Y.Doc` throws `[yjs#509] Not same Y.Doc` → `Unexpected content type`, failing this
 *     test. (Confirmed against the pre-fix loader.)
 *
 * `createRequire(__filename)` gives Node's NATIVE CommonJS resolution even under the
 * Vitest module runner, so the `.cjs` boundary is observed faithfully rather than through
 * Vitest's own module graph.
 */
const nodeRequire = createRequire(__filename);
const Y = nodeRequire('yjs') as typeof import('yjs');

describe('whiteboard fork — CJS/ESM single-yjs-instance boundary', () => {
  it('loadWhiteboardFork resolves the CJS (`require`-condition) headless build', () => {
    expect(nodeRequire.resolve('@excalidraw-yjs/element/headless')).toMatch(
      /\.cjs$/
    );
  });

  it('the fork Scene writes into a server require("yjs") Y.Doc (no cross-instance split, no #509 diagnostic), and the update round-trips', async () => {
    // Yjs signals a cross-instance mix via console (a WARNING, not always a throw), so
    // capture both channels across the real load + write and assert the diagnostic never
    // fires — otherwise a warning-only regression would slip past the behavioural asserts.
    const logs: string[] = [];
    const capture = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(capture);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(capture);
    try {
      const fork = (await loadWhiteboardFork()) as unknown as {
        Scene: new (
          _: undefined,
          opts: { doc: unknown }
        ) => {
          insertElement: (el: Record<string, unknown>) => void;
          mutateElement: (
            el: Record<string, unknown>,
            patch: Record<string, unknown>
          ) => void;
          getNonDeletedElements: () => readonly { id: string; x?: number }[];
        };
        newElement: (
          opts: Record<string, unknown>
        ) => Record<string, unknown> & { id: string };
      };
      // Guard against a vacuous pass if the fork API ever drifts.
      expect(typeof fork.Scene).toBe('function');
      expect(typeof fork.newElement).toBe('function');

      const doc = new Y.Doc();
      const scene = new fork.Scene(undefined, { doc });

      // Insert a rectangle via the SAME scoped-intent API applyEditOps uses. On a
      // cross-instance loader this line throws "Unexpected content type".
      const el = fork.newElement({
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
      });
      scene.insertElement(el);
      expect(scene.getNonDeletedElements().length).toBe(1);

      // Mutate through the fork, then prove the CRDT bytes round-trip on a fresh CJS doc.
      scene.mutateElement(el, { x: 42 });
      const update = Y.encodeStateAsUpdateV2(doc);

      const doc2 = new Y.Doc();
      Y.applyUpdateV2(doc2, update);
      const scene2 = new fork.Scene(undefined, { doc: doc2 });
      const els2 = scene2.getNonDeletedElements();
      expect(els2.length).toBe(1);
      expect(els2[0].id).toBe(el.id);
      expect(els2[0].x).toBe(42);

      // No cross-instance diagnostic from the loader + write OPERATION itself (the spied
      // window). NB: under the full isolate:false suite a sibling spec may have already
      // loaded yjs.mjs, so a module-load-time `[yjs#438]` can appear BEFORE these spies —
      // that is a harness artifact of the shared graph, not attributable to this loader,
      // and it is deliberately outside this assertion's window.
      expect(logs.join('\n')).not.toMatch(CROSS_INSTANCE);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
