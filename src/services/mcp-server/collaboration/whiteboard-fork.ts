/**
 * Loads the excalidraw-yjs HEADLESS fork — the single source of truth for
 * Excalidraw element semantics (the element↔Y.Map schema, `Scene` doc-adoption,
 * element construction/mutation). The server does NOT reimplement any of this;
 * the same fork client-web consumes owns it.
 *
 * `yjs` is the fork's peerDependency, so the `Y.Doc` the fork mutates is the
 * server's single `yjs` instance — proven: the server's yjs `encodeStateAsUpdateV2`
 * a doc the fork wrote (no cross-instance `instanceof` split, yjs#438).
 *
 * The fork ships built ESM and the server is CommonJS, so it is loaded via a
 * runtime dynamic `import()` and cached. tsc(module:commonjs) would otherwise
 * downlevel a literal `import()` to `require()`, which cannot load ESM — the
 * `Function` indirection preserves a real dynamic import at runtime (ed-yjs
 * verified the bundle has no top-level await / import.meta).
 */
export type WhiteboardFork = typeof import('@excalidraw-yjs/element/headless');

const importEsm = Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<unknown>;

let cached: Promise<WhiteboardFork> | undefined;

/** Load + cache the headless fork module (idempotent). */
export function loadWhiteboardFork(): Promise<WhiteboardFork> {
  if (!cached) {
    cached = importEsm(
      '@excalidraw-yjs/element/headless'
    ) as Promise<WhiteboardFork>;
  }
  return cached;
}
