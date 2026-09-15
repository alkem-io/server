import { createRequire } from 'node:module';

/**
 * Loads the excalidraw-yjs HEADLESS fork — the single source of truth for
 * Excalidraw element semantics (the element↔Y.Map schema, `Scene` doc-adoption,
 * element construction/mutation). The server does NOT reimplement any of this;
 * the same fork client-web consumes owns it.
 *
 * The server is CommonJS (`tsconfig module: commonjs`), so this loads the fork with
 * a CommonJS `require`, which resolves the fork's `require` export condition →
 * `dist/cjs/headless.cjs`. That CJS build `require('yjs')`s the SAME `yjs.cjs`
 * instance the server uses, so every `Y.Doc` the fork mutates shares the server's Yjs
 * runtime — one set of content-type constructors, no cross-instance split.
 *
 * The `yjs` peerDependency only pins one VERSION; it does NOT by itself guarantee one
 * runtime INSTANCE. The dual-package (CJS/ESM) hazard is real and was live: a dynamic
 * ESM `import()` of this module resolves the fork's non-`require` conditions → the ESM
 * headless + `yjs.mjs`, a SECOND Yjs instance whose types the server's `yjs.cjs` cannot
 * decode (`[yjs#509] Not same Y.Doc` → `Unexpected content type` on the first write).
 * Loading the `require` condition is what collapses both onto one instance — proven by
 * `whiteboard.fork.cjs-boundary.spec.ts`, which fails if this loader regresses to the
 * dynamic import.
 *
 * `createRequire(__filename)` is used (rather than a bare `require`) so resolution goes
 * through Node's native CommonJS resolver in every context — including under the Vitest
 * module runner, where the boundary spec must observe the real `.cjs` resolution.
 */
export type WhiteboardFork = typeof import('@excalidraw-yjs/element/headless');

const nodeRequire = createRequire(__filename);

let cached: WhiteboardFork | undefined;

/**
 * Load + cache the headless fork module (idempotent). The underlying `require` is
 * synchronous; the `Promise` return type is kept so callers (`await
 * loadWhiteboardFork()`) are unchanged.
 */
export function loadWhiteboardFork(): Promise<WhiteboardFork> {
  if (!cached) {
    cached = nodeRequire('@excalidraw-yjs/element/headless') as WhiteboardFork;
  }
  return Promise.resolve(cached);
}
