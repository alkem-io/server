import { createRequire } from 'node:module';
import type * as Yjs from 'yjs';
import { EMPTY_WHITEBOARD_CONTENT } from '../empty.whiteboard.content';
import { loadWhiteboardFork } from '../whiteboard.fork';
import {
  parseLegacyWhiteboardScene,
  whiteboardSceneToYjsV2State,
} from './whiteboard.scene.to.yjs.v2.state';

/**
 * Native-CJS `yjs` — the SAME single instance the real CJS headless fork resolves, in prod and
 * under the Vitest ESM runner. Decoding fixtures on this one instance keeps the spec's `Y.Doc`s
 * and the fork's `Scene` on one runtime, so `loadWhiteboardFork` runs for real (no ESM-import
 * spy, no `[yjs#509]` dual-instance split, and nothing to leak under `isolate:false`).
 */
const Y = createRequire(__filename)('yjs') as typeof import('yjs');

/**
 * Applies a V2 snapshot into a fresh server-side `Y.Doc` (the native-CJS `yjs` instance the
 * server shares with its headless fork) and reads the scene root `Y.Map`s back — so the test
 * asserts the snapshot the server writes is openable + lossless against the wire schema
 * (id-keyed `elements` map, `files` map, allow-listed `appState`) shared with the editor fork.
 * The V2 bytes are wire-compatible with the collaboration-service's Go `go-yjs` `ApplyUpdateV2`
 * (a separate runtime — there is no shared JS instance with the collaboration-service).
 */
const decode = (snapshot: Uint8Array) => {
  const ydoc = new Y.Doc();
  Y.applyUpdateV2(ydoc, snapshot);
  const elements = ydoc.getMap<Yjs.Map<unknown>>('elements');
  const files = ydoc.getMap<unknown>('files');
  const appState = ydoc.getMap<unknown>('appState');
  return {
    elementIds: [...elements.keys()],
    element: (id: string) => elements.get(id) as Yjs.Map<unknown> | undefined,
    fileIds: [...files.keys()],
    file: (id: string) => files.get(id),
    appState: Object.fromEntries(appState.entries()),
  };
};

describe('whiteboardSceneToYjsV2State (fork-based encoder)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // No `loadWhiteboardFork` spy: the loader uses `createRequire(__filename)`, which resolves
    // the REAL CJS headless fork under vitest's module runner too (the same `yjs.cjs` this spec
    // decodes with), so the encoder exercises the real fork with no dual-instance split.
  });

  it('produces a decodable V2 snapshot for a scene with elements', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        {
          id: 'el-1',
          type: 'rectangle',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          index: 'a0',
        },
      ],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    });

    const snapshot = await whiteboardSceneToYjsV2State(scene);

    expect(snapshot).toBeInstanceOf(Uint8Array);
    const decoded = decode(snapshot);
    expect(decoded.elementIds).toEqual(['el-1']);
    expect(decoded.element('el-1')?.get('type')).toBe('rectangle');
    expect(decoded.element('el-1')?.get('width')).toBe(100);
  });

  it('seeds the allow-listed appState keys only', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [],
      appState: {
        viewBackgroundColor: '#abcdef',
        // not on the allow-list -> must not be synced into the doc
        zoom: 2,
        selectedElementIds: { a: true },
      },
      files: {},
    });

    const decoded = decode(await whiteboardSceneToYjsV2State(scene));

    expect(decoded.appState).toEqual({ viewBackgroundColor: '#abcdef' });
  });

  it('round-trips multiple elements preserving ids', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        { id: 'a', type: 'rectangle', x: 0, y: 0, index: 'a0' },
        { id: 'b', type: 'ellipse', x: 5, y: 5, index: 'a1' },
      ],
      appState: {},
      files: {},
    });

    const decoded = decode(await whiteboardSceneToYjsV2State(scene));

    expect(decoded.elementIds.sort()).toEqual(['a', 'b']);
  });

  it('does NOT sync reconciliation metadata (version/versionNonce/updated)', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        {
          id: 'r',
          type: 'rectangle',
          x: 0,
          y: 0,
          index: 'a0',
          version: 42,
          versionNonce: 99,
          updated: 1700000000000,
        },
      ],
      appState: {},
      files: {},
    });

    const el = decode(await whiteboardSceneToYjsV2State(scene)).element('r');
    expect(el?.has('version')).toBe(false);
    expect(el?.has('versionNonce')).toBe(false);
    expect(el?.has('updated')).toBe(false);
    expect(el?.get('type')).toBe('rectangle');
  });

  it('seeds fractional indices for elements that lack them (no throw)', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        { id: 'a', type: 'rectangle', x: 0, y: 0 },
        { id: 'b', type: 'ellipse', x: 5, y: 5 },
      ],
      appState: {},
      files: {},
    });

    const decoded = decode(await whiteboardSceneToYjsV2State(scene));
    expect(decoded.elementIds.sort()).toEqual(['a', 'b']);
    // every element ends up with a string fractional index (fork's syncInvalidIndices)
    expect(typeof decoded.element('a')?.get('index')).toBe('string');
    expect(typeof decoded.element('b')?.get('index')).toBe('string');
  });

  it('moves legacy bound text after its container before seeding indices', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        {
          id: 'label',
          type: 'text',
          containerId: 'container',
          text: 'Label',
          originalText: 'Label',
          x: 10,
          y: 10,
          index: 'a0',
        },
        {
          id: 'container',
          type: 'rectangle',
          boundElements: [{ id: 'label', type: 'text' }],
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          index: 'a1',
        },
      ],
      appState: {},
      files: {},
    });

    const fork = await loadWhiteboardFork();
    const snapshot = fork.decodeSnapshot(
      await whiteboardSceneToYjsV2State(scene)
    );

    expect(snapshot.elements.map(element => element.id)).toEqual([
      'container',
      'label',
    ]);
    expect(() =>
      fork.validateFractionalIndices(snapshot.elements as never, {
        shouldThrow: true,
        includeBoundTextValidation: true,
        ignoreLogs: true,
      })
    ).not.toThrow();
  });

  it('drops only stale text bindings that contradict the child container id', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        {
          id: 'owner',
          type: 'rectangle',
          boundElements: [{ id: 'label', type: 'text' }],
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          index: 'a0',
        },
        {
          id: 'label',
          type: 'text',
          containerId: 'owner',
          text: 'Label',
          originalText: 'Label',
          x: 10,
          y: 10,
          index: 'a1',
        },
        {
          id: 'stale-parent',
          type: 'rectangle',
          boundElements: [
            { id: 'label', type: 'text' },
            { id: 'arrow', type: 'arrow' },
          ],
          x: 200,
          y: 0,
          width: 100,
          height: 50,
          index: 'a2',
        },
        {
          id: 'arrow',
          type: 'arrow',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          points: [
            [0, 0],
            [10, 10],
          ],
          index: 'a3',
        },
      ],
      appState: {},
      files: {},
    });

    const fork = await loadWhiteboardFork();
    const snapshot = fork.decodeSnapshot(
      await whiteboardSceneToYjsV2State(scene)
    );
    const staleParent = snapshot.elements.find(
      element => element.id === 'stale-parent'
    );

    expect(staleParent?.boundElements).toEqual([
      { id: 'arrow', type: 'arrow' },
    ]);
    expect(snapshot.elements.map(element => element.id).sort()).toEqual([
      'arrow',
      'label',
      'owner',
      'stale-parent',
    ]);
    expect(() =>
      fork.validateFractionalIndices(snapshot.elements as never, {
        shouldThrow: true,
        includeBoundTextValidation: true,
        ignoreLogs: true,
      })
    ).not.toThrow();
  });

  it('does NOT store the immutable input scene (no mutation of the caller records)', async () => {
    const elements = [{ id: 'a', type: 'rectangle', x: 0, y: 0 }] as const;
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements,
      appState: {},
      files: {},
    });
    // Re-parse a fresh copy to compare against; the encoder must not mutate its
    // own parsed elements' identity in a way that leaks (it works on copies).
    await whiteboardSceneToYjsV2State(scene);
    // The literal above has no `index`; encoding twice is deterministic + safe.
    const decoded = decode(await whiteboardSceneToYjsV2State(scene));
    expect(typeof decoded.element('a')?.get('index')).toBe('string');
  });

  it('writes the provided asset locators into the files map as strings (NOT the scene files)', async () => {
    // The scene carries a legacy BinaryFileData object; the encoder must IGNORE it
    // and instead write the resolved locator string passed separately.
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        { id: 'img', type: 'image', x: 0, y: 0, index: 'a0', fileId: 'file-1' },
      ],
      appState: {},
      files: {
        'file-1': {
          id: 'file-1',
          mimeType: 'image/png',
          url: 'http://x/y.png',
        },
      },
    });

    const decoded = decode(
      await whiteboardSceneToYjsV2State(scene, { 'file-1': 'DOC-123' })
    );

    expect(decoded.fileIds).toEqual(['file-1']);
    // A locator STRING (unified schema), never the legacy BinaryFileData object.
    expect(decoded.file('file-1')).toBe('DOC-123');
    expect(typeof decoded.file('file-1')).toBe('string');
  });

  it('writes no assets when none are provided (scene BinaryFileData is dropped)', async () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [],
      appState: {},
      files: {
        'file-1': {
          id: 'file-1',
          mimeType: 'image/png',
          url: 'http://x/y.png',
        },
      },
    });

    const decoded = decode(await whiteboardSceneToYjsV2State(scene));
    expect(decoded.fileIds).toEqual([]);
  });

  it('encodes the canonical empty whiteboard content without throwing', async () => {
    const decoded = decode(
      await whiteboardSceneToYjsV2State(EMPTY_WHITEBOARD_CONTENT)
    );
    expect(decoded.elementIds).toHaveLength(0);
  });

  it('treats an empty string as an empty scene (FR-010)', async () => {
    expect(
      decode(await whiteboardSceneToYjsV2State('')).elementIds
    ).toHaveLength(0);
  });

  it('treats non-JSON content as an empty scene rather than throwing', async () => {
    expect(
      decode(await whiteboardSceneToYjsV2State('not-json{')).elementIds
    ).toHaveLength(0);
  });

  it('treats structurally-invalid JSON (no elements array) as empty', async () => {
    expect(
      decode(await whiteboardSceneToYjsV2State('{"foo":"bar"}')).elementIds
    ).toHaveLength(0);
  });

  it('encodes an empty scene byte-identically to a bare empty V2 doc', async () => {
    // The empty-create seed must materialize an empty, openable board — the same
    // canonical empty the collaboration-service applies via ApplyUpdateV2.
    const empty = await whiteboardSceneToYjsV2State('');
    const bare = Y.encodeStateAsUpdateV2(new Y.Doc());
    expect(Buffer.from(empty).equals(Buffer.from(bare))).toBe(true);
  });
});

describe('parseLegacyWhiteboardScene', () => {
  it('returns the structural parts of a valid scene', () => {
    const parsed = parseLegacyWhiteboardScene(
      JSON.stringify({
        elements: [{ id: 'a', type: 'rectangle' }],
        files: { f1: { id: 'f1', url: 'http://x/y.png' } },
        appState: { viewBackgroundColor: '#fff' },
      })
    );
    expect(parsed?.elements).toHaveLength(1);
    expect(parsed?.files?.f1?.url).toBe('http://x/y.png');
    expect(parsed?.appState?.viewBackgroundColor).toBe('#fff');
  });

  it('recognizes the historical empty-object sentinel as an empty scene', () => {
    expect(parseLegacyWhiteboardScene(' {} ')).toEqual({ elements: [] });
  });

  it('returns undefined for empty / non-JSON / structurally-invalid content', () => {
    expect(parseLegacyWhiteboardScene('')).toBeUndefined();
    expect(parseLegacyWhiteboardScene('   ')).toBeUndefined();
    expect(parseLegacyWhiteboardScene('not-json{')).toBeUndefined();
    // no `elements` array
    expect(parseLegacyWhiteboardScene('{"foo":"bar"}')).toBeUndefined();
  });
});
