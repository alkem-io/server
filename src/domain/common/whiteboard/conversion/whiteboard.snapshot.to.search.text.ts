import type { WhiteboardFork } from '../whiteboard.fork';

/**
 * Derives the searchable text of a whiteboard from its stored Yjs-V2 snapshot:
 * the text of every live (non-deleted) Excalidraw text element, joined with a
 * single space, truncated to `maxLength` characters.
 *
 * `originalText` is used rather than `text` because `text` carries the editor's
 * soft-wrap line breaks, which would split words that the author typed whole.
 *
 * The decode is delegated to the headless fork passed in (load it once with
 * `loadWhiteboardFork()` and reuse it across a batch). Malformed bytes make
 * `decodeSnapshot` throw; this function lets that propagate so the caller can
 * decide how to degrade. An empty scene, or one with no text, yields `''`.
 */
export const whiteboardSnapshotToSearchText = (
  fork: WhiteboardFork,
  snapshot: Uint8Array,
  maxLength: number
): string => {
  const { elements } = fork.decodeSnapshot(snapshot);
  const text = elements
    .filter(element => element.isDeleted !== true && element.type === 'text')
    .map(element => element.originalText)
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0
    )
    .join(' ');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};
