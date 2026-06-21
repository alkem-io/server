import * as Y from 'yjs';
import { EMPTY_WHITEBOARD_CONTENT } from '../empty.whiteboard.content';
import { whiteboardSceneToYjsV2State } from './whiteboard.scene.to.yjs.v2.state';

/**
 * Applies a V2 snapshot into a fresh server-side `Y.Doc` (the same `yjs` instance
 * the collaboration-service uses via `ApplyUpdateV2`) and reads the scene root
 * `Y.Map`s back — so the test asserts the snapshot the server writes is openable +
 * lossless against the wire schema (id-keyed `elements` map, `files` map,
 * allow-listed `appState`).
 */
const decode = (snapshot: Uint8Array) => {
  const ydoc = new Y.Doc();
  Y.applyUpdateV2(ydoc, snapshot);
  const elements = ydoc.getMap<Y.Map<unknown>>('elements');
  const files = ydoc.getMap<unknown>('files');
  const appState = ydoc.getMap<unknown>('appState');
  return {
    elementIds: [...elements.keys()],
    element: (id: string) => elements.get(id) as Y.Map<unknown> | undefined,
    fileIds: [...files.keys()],
    appState: Object.fromEntries(appState.entries()),
  };
};

describe('whiteboardSceneToYjsV2State', () => {
  it('produces a non-empty V2 snapshot for a scene with elements', () => {
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

    const snapshot = whiteboardSceneToYjsV2State(scene);

    expect(snapshot).toBeInstanceOf(Uint8Array);
    const decoded = decode(snapshot);
    expect(decoded.elementIds).toEqual(['el-1']);
    expect(decoded.element('el-1')?.get('type')).toBe('rectangle');
    expect(decoded.element('el-1')?.get('width')).toBe(100);
  });

  it('seeds the allow-listed appState keys only', () => {
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

    const decoded = decode(whiteboardSceneToYjsV2State(scene));

    expect(decoded.appState).toEqual({ viewBackgroundColor: '#abcdef' });
  });

  it('round-trips multiple elements preserving ids', () => {
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

    const decoded = decode(whiteboardSceneToYjsV2State(scene));

    expect(decoded.elementIds.sort()).toEqual(['a', 'b']);
  });

  it('stores JSON-leaf keys (points) as a whole value, not a scalar', () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        {
          id: 'line',
          type: 'line',
          x: 0,
          y: 0,
          index: 'a0',
          points: [
            [0, 0],
            [10, 10],
          ],
        },
      ],
      appState: {},
      files: {},
    });

    const decoded = decode(whiteboardSceneToYjsV2State(scene));
    expect(decoded.element('line')?.get('points')).toEqual([
      [0, 0],
      [10, 10],
    ]);
  });

  it('encodes boundElements as a nested id->type Y.Map', () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [
        {
          id: 'rect',
          type: 'rectangle',
          x: 0,
          y: 0,
          index: 'a0',
          boundElements: [{ id: 'arrow-1', type: 'arrow' }],
        },
      ],
      appState: {},
      files: {},
    });

    const decoded = decode(whiteboardSceneToYjsV2State(scene));
    const bound = decoded.element('rect')?.get('boundElements');
    expect(bound).toBeInstanceOf(Y.Map);
    expect((bound as Y.Map<string>).get('arrow-1')).toBe('arrow');
  });

  it('does NOT sync reconciliation metadata (version/versionNonce/updated)', () => {
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

    const el = decode(whiteboardSceneToYjsV2State(scene)).element('r');
    expect(el?.has('version')).toBe(false);
    expect(el?.has('versionNonce')).toBe(false);
    expect(el?.has('updated')).toBe(false);
    expect(el?.get('type')).toBe('rectangle');
  });

  it('seeds fractional indices for elements that lack them (no throw)', () => {
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

    const decoded = decode(whiteboardSceneToYjsV2State(scene));
    expect(decoded.elementIds.sort()).toEqual(['a', 'b']);
    // every element ends up with a string fractional index
    expect(typeof decoded.element('a')?.get('index')).toBe('string');
    expect(typeof decoded.element('b')?.get('index')).toBe('string');
  });

  it('carries scene files into the files map', () => {
    const scene = JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [],
      appState: {},
      files: {
        'file-1': { id: 'file-1', mimeType: 'image/png', dataURL: 'data:...' },
      },
    });

    const decoded = decode(whiteboardSceneToYjsV2State(scene));
    expect(decoded.fileIds).toEqual(['file-1']);
  });

  it('encodes the canonical empty whiteboard content without throwing', () => {
    const decoded = decode(
      whiteboardSceneToYjsV2State(EMPTY_WHITEBOARD_CONTENT)
    );
    expect(decoded.elementIds).toHaveLength(0);
  });

  it('treats an empty string as an empty scene (FR-010)', () => {
    expect(decode(whiteboardSceneToYjsV2State('')).elementIds).toHaveLength(0);
  });

  it('treats non-JSON content as an empty scene rather than throwing', () => {
    expect(
      decode(whiteboardSceneToYjsV2State('not-json{')).elementIds
    ).toHaveLength(0);
  });

  it('treats structurally-invalid JSON (no elements array) as empty', () => {
    expect(
      decode(whiteboardSceneToYjsV2State('{"foo":"bar"}')).elementIds
    ).toHaveLength(0);
  });
});
