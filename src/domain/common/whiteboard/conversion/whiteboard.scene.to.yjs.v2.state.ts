import { generateNKeysBetween } from 'fractional-indexing';
import * as Y from 'yjs';

/**
 * Server-side `Excalidraw scene JSON → Yjs-V2 state snapshot` — the single stored
 * content representation (R1/R2, FR-005). This is a faithful port of the
 * `@alkemio/excalidraw-yjs-binding` `populateYDoc` + scene `Y.Map` schema
 * (`schema.ts` / `migrate.ts` / `order.ts` in `excalidraw-fork`), reproduced here
 * because the published binding bundles its OWN copy of `yjs` (it does NOT
 * externalise it), so a `Y.Doc` it builds cannot be `encodeStateAsUpdateV2`-ed by
 * the server's `yjs` instance — the two yjs copies fail each other's `instanceof`
 * checks ("Unexpected content type", yjs#438). Once the fork's binding externalises
 * `yjs`/`lib0`/`y-protocols` as peers, the body below collapses back to a single
 * `populateYDoc(scene, ydoc)` call against the shared instance.
 *
 * The wire format is byte-compatible with the binding (same root-type names, same
 * per-property tiering, same `fractional-indexing` key scheme — the fork notes the
 * package is byte-for-byte identical to the editor's vendored copy), so a snapshot
 * the server writes here seeds an identical room to one an editor produces
 * (FR-002 — one representation everywhere), and the collaboration-service rehydrates
 * it via `ApplyUpdateV2`.
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
 * Inverse of `whiteboardSceneToYjsV2State`: applies a Yjs-V2 snapshot into a
 * fresh `Y.Doc` and reads the scene back to Excalidraw JSON (a port of the
 * binding's `exportSceneJSON` + `yMapToElement`). Used by the server-side
 * duplicate/export path (input-creator) to seed a copied whiteboard from the
 * source's stored snapshot, since content is no longer a JSON column. Returns
 * the canonical empty-scene JSON for an empty / undecodable snapshot.
 */
export const whiteboardYjsV2StateToScene = (snapshot: Uint8Array): string => {
  const ydoc = new Y.Doc();
  try {
    Y.applyUpdateV2(ydoc, snapshot);
  } catch {
    return JSON.stringify(emptyScene());
  }
  const elementsMap = ydoc.getMap<Y.Map<unknown>>(ELEMENTS);
  const filesMap = ydoc.getMap<unknown>(FILES);
  const appStateMap = ydoc.getMap<unknown>(APPSTATE);

  const elements: ElementRecord[] = [];
  for (const [id, ymap] of elementsMap.entries()) {
    const element = yMapToElement(ymap);
    element.id = id;
    elements.push(element);
  }

  const appState: Record<string, unknown> = {};
  for (const key of APPSTATE_ALLOW_LIST) {
    if (appStateMap.has(key)) {
      appState[key] = appStateMap.get(key);
    }
  }

  const files: Record<string, unknown> = {};
  for (const [id, file] of filesMap.entries()) {
    files[id] = file;
  }

  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: '',
    elements: orderByIndex(elements),
    appState,
    files,
  });
};

const emptyScene = () => ({
  type: 'excalidraw',
  version: 2,
  source: '',
  elements: [] as ElementRecord[],
  appState: {},
  files: {},
});

/** The binding's scene shape: elements + optional files + optional appState. */
type SceneJSON = {
  elements: ElementRecord[];
  files?: Record<string, unknown>;
  appState?: Record<string, unknown>;
};

type ElementRecord = Record<string, unknown>;

// ── Root-type names (binding schema.ts) ────────────────────────────────────────
const ELEMENTS = 'elements';
const FILES = 'files';
const APPSTATE = 'appState';

/** appState keys synced through the doc; everything else stays per-client. */
const APPSTATE_ALLOW_LIST = ['viewBackgroundColor', 'name'] as const;

/**
 * Per-property tiering (binding schema.ts §4): these keys are stored as the whole
 * JSON value (deep-cloned); every other non-`boundElements` key is a scalar.
 */
const JSON_LEAF_KEYS: ReadonlySet<string> = new Set([
  'points',
  'pressures',
  'groupIds',
  'roundness',
  'startBinding',
  'endBinding',
  'fixedSegments',
  'scale',
  'crop',
  'customData',
]);

const BOUND_ELEMENTS_KEY = 'boundElements';

/**
 * Reconciliation metadata each peer derives locally and that is NEVER synced
 * through the doc (binding OPEN-3) — excluded from the encoded snapshot.
 */
const RECONCILE_META_KEYS: ReadonlySet<string> = new Set([
  'version',
  'versionNonce',
  'updated',
]);

/**
 * Port of the binding's `populateYDoc` (migrate.ts): seed the scene / files /
 * appState root `Y.Map`s from the scene JSON, repairing missing/invalid z-indices
 * first, all inside one `BINDING_ORIGIN` transaction so a live binding would not
 * echo the load.
 */
const BINDING_ORIGIN = 'excalidraw-binding';

const populateYDoc = (sceneJSON: SceneJSON, ydoc: Y.Doc): void => {
  const elementsMap = ydoc.getMap<Y.Map<unknown>>(ELEMENTS);
  const filesMap = ydoc.getMap<unknown>(FILES);
  const appStateMap = ydoc.getMap<unknown>(APPSTATE);

  const working: ElementRecord[] = sceneJSON.elements.map(el => ({ ...el }));
  seedMissingIndices(working);
  const ordered = repairIndices(working);

  ydoc.transact(() => {
    for (const element of ordered) {
      elementsMap.set(element.id as string, elementToYMap(element));
    }
    if (sceneJSON.files) {
      for (const [id, file] of Object.entries(sceneJSON.files)) {
        filesMap.set(id, file);
      }
    }
    if (sceneJSON.appState) {
      for (const key of APPSTATE_ALLOW_LIST) {
        const value = sceneJSON.appState[key];
        if (value !== undefined) {
          appStateMap.set(key, value);
        }
      }
    }
  }, BINDING_ORIGIN);
};

/** Port of the binding's `elementToYMap` (schema.ts §4). */
const elementToYMap = (element: ElementRecord): Y.Map<unknown> => {
  const ymap = new Y.Map<unknown>();
  for (const key of Object.keys(element)) {
    if (RECONCILE_META_KEYS.has(key)) {
      continue;
    }
    const value = element[key];
    if (value === undefined) {
      continue;
    }
    if (key === BOUND_ELEMENTS_KEY) {
      ymap.set(key, boundElementsToYMap(value));
    } else if (JSON_LEAF_KEYS.has(key)) {
      ymap.set(key, cloneJSON(value));
    } else {
      ymap.set(key, value);
    }
  }
  return ymap;
};

/** Port of the binding's `boundElementsToYMap` (schema.ts §4.1). */
const boundElementsToYMap = (boundElements: unknown): Y.Map<string> => {
  const map = new Y.Map<string>();
  if (Array.isArray(boundElements)) {
    for (const bound of boundElements) {
      if (
        bound &&
        typeof bound === 'object' &&
        typeof (bound as { id?: unknown }).id === 'string'
      ) {
        map.set((bound as { id: string }).id, (bound as { type: string }).type);
      }
    }
  }
  return map;
};

/** Port of the binding's `yMapToElement` (schema.ts) — inverse of `elementToYMap`. */
const yMapToElement = (ymap: Y.Map<unknown>): ElementRecord => {
  const element: ElementRecord = {};
  for (const [key, value] of ymap.entries()) {
    if (key === BOUND_ELEMENTS_KEY) {
      element[key] = yMapToBoundElements(value as Y.Map<string>);
    } else if (JSON_LEAF_KEYS.has(key)) {
      element[key] = cloneJSON(value);
    } else {
      element[key] = value;
    }
  }
  return element;
};

/** Port of the binding's `yMapToBoundElements` (schema.ts §4.1). */
const yMapToBoundElements = (
  map: Y.Map<string> | undefined
): { id: string; type: string }[] | null => {
  if (!map || map.size === 0) {
    return null;
  }
  const entries: { id: string; type: string }[] = [];
  for (const [id, type] of map.entries()) {
    entries.push({ id, type });
  }
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return entries;
};

const cloneJSON = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

// ── Z-order (port of order.ts) ─────────────────────────────────────────────────

const readIndex = (el: ElementRecord): string | null => {
  const idx = el.index;
  return typeof idx === 'string' ? idx : null;
};

const readId = (el: ElementRecord): string => {
  const id = el.id;
  return typeof id === 'string' ? id : String(id);
};

const orderByIndex = (elements: readonly ElementRecord[]): ElementRecord[] =>
  [...elements].sort((a, b) => {
    const ai = readIndex(a);
    const bi = readIndex(b);
    const aid = readId(a);
    const bid = readId(b);
    if (ai != null && bi != null) {
      if (ai < bi) return -1;
      if (ai > bi) return 1;
      return aid < bid ? -1 : aid > bid ? 1 : 0;
    }
    if (ai == null && bi == null) {
      return aid < bid ? -1 : aid > bid ? 1 : 0;
    }
    return ai == null ? 1 : -1;
  });

const keysBetween = (
  prev: string | null,
  next: string | null,
  n: number
): string[] => generateNKeysBetween(prev, next, n);

/** Port of the binding's `repairIndices` (order.ts) — ordering only (no `repaired` set needed server-side). */
const repairIndices = (elements: readonly ElementRecord[]): ElementRecord[] => {
  const ordered = orderByIndex(elements);
  let accepted: string | null = null;
  let i = 0;
  while (i < ordered.length) {
    const current = readIndex(ordered[i]);
    if (current != null && current > (accepted ?? '')) {
      accepted = current;
      i++;
      continue;
    }
    let j = i;
    let runPrev = accepted;
    while (j < ordered.length) {
      const candidate = readIndex(ordered[j]);
      if (candidate != null && candidate > (runPrev ?? '')) {
        break;
      }
      runPrev = candidate;
      j++;
    }
    const upper = j < ordered.length ? readIndex(ordered[j]) : null;
    const keys = keysBetween(accepted, upper, j - i);
    for (let k = i; k < j; k++) {
      ordered[k].index = keys[k - i];
    }
    accepted = keys[keys.length - 1] ?? accepted;
    i = j;
  }
  return ordered;
};

/** Port of the binding's `seedMissingIndices` (migrate.ts). */
const seedMissingIndices = (elements: ElementRecord[]): void => {
  const n = elements.length;
  let i = 0;
  while (i < n) {
    if (readIndex(elements[i]) != null) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && readIndex(elements[j]) == null) {
      j++;
    }
    const lower = i > 0 ? readIndex(elements[i - 1]) : null;
    const upper = j < n ? readIndex(elements[j]) : null;
    const runLength = j - i;
    let keys: string[];
    try {
      keys = generateNKeysBetween(lower, upper, runLength);
    } catch {
      keys = generateNKeysBetween(lower, null, runLength);
    }
    for (let k = 0; k < runLength; k++) {
      elements[i + k].index = keys[k];
    }
    i = j;
  }
};

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
