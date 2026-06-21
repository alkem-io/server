import {
  exportSceneJSON,
  populateYDoc,
  type SceneJSON,
} from '@alkemio/excalidraw-yjs-binding';
import * as Y from 'yjs';

/**
 * Server-side `Excalidraw scene JSON → Yjs-V2 state snapshot` — the single stored
 * content representation (R1/R2, FR-005).
 *
 * This delegates straight to `@alkemio/excalidraw-yjs-binding` (`populateYDoc`),
 * so the server and the editor (client-web) encode a whiteboard scene through the
 * SAME code — one source of truth, no drift (FR-002, one representation everywhere).
 * The binding now declares `yjs`/`y-protocols`/`lib0` as peers and inlines none,
 * so the `Y.Doc` it seeds is built on the server's own `yjs` instance and can be
 * `encodeStateAsUpdateV2`-ed here without the cross-copy `instanceof` failure that
 * once forced this module to re-port the binding (yjs#438 — now fixed). The wire
 * format is therefore byte-compatible with an editor-produced room, and the
 * collaboration-service rehydrates the snapshot via `ApplyUpdateV2`.
 *
 * An empty / unparseable scene yields the encoding of an empty `Y.Doc` rather than
 * throwing, so an empty-on-create whiteboard stays empty + editable (FR-010) and a
 * never-decodable legacy blob is flagged by the caller (migration) without aborting
 * the batch.
 */
export const whiteboardSceneToYjsV2State = (sceneJSON: string): Uint8Array => {
  const ydoc = new Y.Doc();
  const scene = parseScene(sceneJSON);
  if (scene) {
    populateYDoc(scene, ydoc);
  }
  return Y.encodeStateAsUpdateV2(ydoc);
};

/**
 * Inverse of `whiteboardSceneToYjsV2State`: applies a Yjs-V2 snapshot into a fresh
 * `Y.Doc` and reads the scene back via the binding's `exportSceneJSON`. Used by the
 * server-side duplicate/export path (input-creator) to seed a copied whiteboard from
 * the source's stored snapshot, since content is no longer a JSON column. Returns the
 * canonical empty-scene JSON for an empty / undecodable snapshot.
 */
export const whiteboardYjsV2StateToScene = (snapshot: Uint8Array): string => {
  const ydoc = new Y.Doc();
  try {
    Y.applyUpdateV2(ydoc, snapshot);
  } catch {
    return JSON.stringify(emptyScene());
  }
  const { elements, appState, files } = exportSceneJSON(ydoc);
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: '',
    elements,
    appState,
    files,
  });
};

const emptyScene = () => ({
  type: 'excalidraw',
  version: 2,
  source: '',
  elements: [] as SceneJSON['elements'],
  appState: {},
  files: {},
});

/**
 * Parses the stored scene JSON into the binding's `SceneJSON` shape. Returns
 * `undefined` for empty / non-JSON / structurally-absent (`elements` missing)
 * content so the caller seeds an empty doc instead of throwing.
 */
const parseScene = (raw: string): SceneJSON | undefined => {
  if (!raw || raw.trim() === '') {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as { elements?: unknown }).elements)
  ) {
    return undefined;
  }
  return parsed as SceneJSON;
};
