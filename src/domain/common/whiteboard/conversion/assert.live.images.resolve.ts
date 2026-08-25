import type { WhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import type * as Y from 'yjs';

/** One LIVE (non-deleted) image element's asset reference. `locator` is the FILES entry. */
export interface LiveImageRef {
  elementId: string;
  fileId: string;
  locator: string | undefined;
}

/**
 * Enumerate every LIVE (non-deleted) `image` element that names a `fileId`, as
 * `{ elementId, fileId, locator }` (locator = the FILES asset-map entry, or `undefined`).
 * Deleted images and non-image / no-fileId elements are excluded — only the references that
 * must cold-load. This is the SINGLE source of live-image→asset semantics, shared by the
 * live update/clone path (`WhiteboardService`) and the Release-A migration verifier, so
 * `findUnresolvedLiveImage` (structural presence) and the verifier's byte-resolution gate
 * enumerate identically.
 */
export const enumerateLiveImageRefs = (
  doc: Y.Doc,
  fork: WhiteboardFork,
  assets: Record<string, string>
): LiveImageRef[] => {
  const refs: LiveImageRef[] = [];
  const elementsMap = doc.getMap<Y.Map<unknown>>(fork.ELEMENTS);
  for (const [id, ymap] of elementsMap.entries()) {
    const element = fork.yMapToElement(ymap) as Record<string, unknown> & {
      id?: string;
    };
    if (element.isDeleted || element.type !== 'image') {
      continue;
    }
    const fileId = element.fileId;
    if (fileId == null) {
      continue;
    }
    refs.push({
      elementId: (element.id ?? id) as string,
      fileId: fileId as string,
      locator: assets[fileId as string],
    });
  }
  return refs;
};

/**
 * The cold-load image→asset STRUCTURAL integrity invariant: every live image must have a
 * non-empty locator string in the snapshot's asset map. Derived from
 * {@link enumerateLiveImageRefs}. Pure + throw-free — returns the FIRST offending
 * `{ elementId, fileId }` (or `undefined`). Existence-in-file-service is a SEPARATE gate
 * (the verifier resolves each live locator's bytes); this only proves the reference is
 * present, so a live image never cold-loads a missing file-map entry.
 */
export const findUnresolvedLiveImage = (
  doc: Y.Doc,
  fork: WhiteboardFork,
  assets: Record<string, string>
): { elementId: string; fileId: string } | undefined => {
  for (const ref of enumerateLiveImageRefs(doc, fork, assets)) {
    if (typeof ref.locator !== 'string' || ref.locator.length === 0) {
      return { elementId: ref.elementId, fileId: ref.fileId };
    }
  }
  return undefined;
};
