import { WhiteboardFork } from '@domain/common/whiteboard/whiteboard.fork';
import * as Y from 'yjs';

/** A materialized Excalidraw element read from the live Y.Doc (schema-owned by the fork). */
export type WhiteboardElement = Record<string, unknown> & { id: string };

/**
 * Read the live scene from a synced whiteboard `Y.Doc` using the fork's element↔Y.Map
 * schema (`yMapToElement`) — NOT the server's own reimplementation, and NOT a
 * decode→rebuild (which would mint fresh lineage). Tombstoned (`isDeleted`) elements
 * are skipped. Files are returned as the raw `fileId → locator` map, where each value
 * is the opaque file-service locator string (the blob-ownership invariant), not a
 * decoded blob or descriptor.
 */
export function readWhiteboardScene(
  doc: Y.Doc,
  fork: WhiteboardFork
): { elements: WhiteboardElement[]; files: Record<string, unknown> } {
  const elementsMap = doc.getMap<Y.Map<unknown>>(fork.ELEMENTS);
  const elements: WhiteboardElement[] = [];
  for (const [id, ymap] of elementsMap.entries()) {
    const element = fork.yMapToElement(ymap) as WhiteboardElement;
    if (element.id === undefined) {
      element.id = id;
    }
    if (!element.isDeleted) {
      elements.push(element);
    }
  }

  const filesMap = doc.getMap<unknown>(fork.FILES);
  const files: Record<string, unknown> = {};
  for (const [fileId, locator] of filesMap.entries()) {
    files[fileId] = locator;
  }

  return { elements, files };
}
