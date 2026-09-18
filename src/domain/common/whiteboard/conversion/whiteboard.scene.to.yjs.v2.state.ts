import { loadWhiteboardFork } from '../whiteboard.fork';

/**
 * Server-side `Excalidraw scene JSON → Yjs-V2 state snapshot` — the single stored
 * content representation (R1/R2, FR-005). The element↔`Y.Map` schema, fractional
 * z-index seeding, `files` asset map and V2 encoding are ALL owned by the
 * excalidraw-yjs headless fork (`@excalidraw-yjs/element/headless`): this adapter
 * does NOT reimplement any of them. It parses the legacy scene, seeds fractional
 * legacy element order/bindings through the fork's canonical compatibility
 * helpers, and hands
 * `{ elements, assets, appState }` to the fork's `encodeSnapshot`. The result is
 * therefore STRUCTURALLY identical to what an editor produces for the same scene
 * (FR-002 — one representation everywhere): same root types, per-property element
 * schema and fractional-index scheme. The raw Yjs update bytes are NOT identical
 * across docs (each `Y.Doc` mints its own clientID, embedded once structs exist),
 * but that does not affect how the collaboration-service rehydrates them via
 * `ApplyUpdateV2`. (An EMPTY doc carries no structs, so an empty encode IS
 * byte-identical to a bare empty V2 doc — the create path relies on this.)
 *
 * `loadWhiteboardFork` loads the fork's `require`/CJS build, which shares the server's
 * single `yjs.cjs` runtime instance (see `whiteboard.fork.ts`), so no cross-`yjs`-instance
 * split arises here. (The `yjs` peerDependency alone only pins one VERSION, not one
 * runtime INSTANCE — the `require`-condition load is what guarantees the single instance.)
 * This conversion is additionally self-contained: it builds and encodes inside the fork's
 * own doc and returns bytes, so it would be instance-safe regardless.
 *
 * Assets are NOT read from the scene's own `files` (legacy `BinaryFileData`
 * objects, which the unified schema does not store): the caller passes an already
 * resolved `assetLocators` map of `fileId -> opaque file-service locator string`,
 * which the fork writes into the `FILES` `Y.Map`. The migration resolves those from
 * the legacy `BinaryFileData` (its `url`, or up-homed `dataURL` bytes); the create
 * path seeds an empty map.
 *
 * An empty / unparseable scene yields the canonical empty fork doc (no elements, no
 * assets) rather than throwing — this is how the CREATE path seeds a genuinely empty
 * whiteboard (empty stays empty + editable, FR-010). The converter is deliberately
 * TOLERANT and does NOT itself distinguish "genuinely empty" from "nonempty but corrupt".
 * The MIGRATION must therefore not lean on that tolerance for real content: it gates a
 * malformed NONEMPTY legacy scene BEFORE calling this (`parseLegacyWhiteboardScene`
 * returns `undefined` on a non-blank blob → the record FAILS and stays re-runnable, never
 * aborting the batch), rather than silently emptying it. Only a blank / whitespace legacy
 * value, or the historical `{}` empty-scene sentinel, reaches here as
 * canonical-empty.
 */
export const whiteboardSceneToYjsV2State = async (
  sceneJSON: string,
  assetLocators: Record<string, string> = {}
): Promise<Uint8Array> => {
  const fork = await loadWhiteboardFork();
  const scene = parseLegacyWhiteboardScene(sceneJSON);

  // Work on copies so the compatibility repair and `syncInvalidIndices` (which
  // mutate element arrays/records) never touch the caller's scene.
  const copiedElements: Record<string, unknown>[] = scene
    ? scene.elements.map(
        (element): Record<string, unknown> => ({
          ...element,
          // Old/minimal scenes can predate this required Excalidraw collection.
          // The fork's order normalizer reads it unconditionally.
          groupIds: Array.isArray(element.groupIds)
            ? [...element.groupIds]
            : [],
          ...(Array.isArray(element.boundElements)
            ? {
                boundElements: element.boundElements.map(boundElement =>
                  boundElement && typeof boundElement === 'object'
                    ? { ...boundElement }
                    : boundElement
                ),
              }
            : {}),
        })
      )
    : [];

  // Some legacy scenes contain a stale text reference on one container while
  // the text child points at another. The child's typed `containerId` is the
  // canonical owner, so remove only the contradictory parent-side text ref.
  // Non-text bindings (arrows, etc.) are deliberately preserved.
  const elementsById = new Map(
    copiedElements.flatMap(element =>
      typeof element.id === 'string' ? [[element.id, element] as const] : []
    )
  );
  const consistentElements = copiedElements.map(element => {
    if (!Array.isArray(element.boundElements)) {
      return element;
    }
    const boundElements = element.boundElements.filter(boundElement => {
      if (
        !boundElement ||
        typeof boundElement !== 'object' ||
        !('type' in boundElement) ||
        boundElement.type !== 'text'
      ) {
        return true;
      }
      const boundId = 'id' in boundElement ? boundElement.id : undefined;
      const child =
        typeof boundId === 'string' ? elementsById.get(boundId) : undefined;
      return (
        child?.type === 'text' &&
        typeof element.id === 'string' &&
        child.containerId === element.id
      );
    });
    return { ...element, boundElements };
  });

  // The fork owns the compatibility ordering rule. In particular, old scenes
  // may place bound text before its container, which strict bound-text index
  // validation rejects even though the scene is otherwise valid.
  const elements = [...fork.normalizeElementOrder(consistentElements as never)];
  if (elements.length > 0) {
    // The fork's canonical fractional-index repair: seeds/repairs invalid indices
    // in the array's (z-)order, leaving already-valid indices untouched — the same
    // ordering the editor's Scene maintains, so the stored doc orders identically
    // to an editor-produced one. Headless-safe (only mutates `index`; never routes
    // through DOM text measurement).
    fork.syncInvalidIndices(elements as never);
  }

  return fork.encodeSnapshot({
    elements,
    assets: assetLocators,
    // `encodeSnapshot` (via `writeAppState`) writes only the allow-listed appState
    // keys and ignores the rest, so passing the whole legacy appState is safe.
    appState: (scene?.appState ?? {}) as never,
  });
};

/**
 * The pre-006 embedded-media descriptor (the Excalidraw `BinaryFileData` subset
 * the migration reads). `url` points at an Alkemio file-service document and is
 * the real reference producer; `dataURL` is the inline-bytes fallback.
 */
export type LegacyBinaryFileData = {
  id?: string;
  mimeType?: string;
  url?: string;
  dataURL?: string;
  [key: string]: unknown;
};

/** The stored legacy scene shape: elements + optional files + optional appState. */
export type LegacyWhiteboardScene = {
  elements: Record<string, unknown>[];
  files?: Record<string, LegacyBinaryFileData>;
  appState?: Record<string, unknown>;
};

/**
 * Parses a stored legacy Excalidraw scene JSON into its structural parts. Returns
 * `undefined` for empty / non-JSON / structurally-absent (`elements` missing)
 * content so the caller seeds the canonical empty doc instead of throwing. The
 * historical exact-empty-object sentinel (`{}`) is normalized to an empty scene.
 * Shared
 * by the encoder (reads `elements` + `appState`) and the migration (reads `files`
 * to resolve asset locators), so both agree on what a valid scene is.
 */
export const parseLegacyWhiteboardScene = (
  raw: string
): LegacyWhiteboardScene | undefined => {
  if (!raw || raw.trim() === '') {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }
  if (Object.keys(parsed).length === 0) {
    return { elements: [] };
  }
  if (!Array.isArray((parsed as { elements?: unknown }).elements)) {
    return undefined;
  }
  return parsed as LegacyWhiteboardScene;
};
