import { updateYFragment } from '@tiptap/y-tiptap';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type * as Y from 'yjs';

/**
 * Replace a memo's live content in place so its default `Y.XmlFragment` matches
 * `desiredNode` exactly. `updateYFragment` is the y-prosemirror binding's OWN sync
 * operation: it DIFFS the live fragment against the desired ProseMirror node and applies
 * the minimal delta — nodes present live but absent in the desired doc are DELETED (true
 * replacement, old nodes gone), NOT a union/merge (`applyUpdateV2` would merge). It emits
 * ordinary CRDT ops — exactly what the editor binding does when a human edits — so a server
 * collaborator applying it through the live room fans out and persists normally, and any
 * genuinely concurrent edit observed after sync still survives per-property.
 *
 * Wrapped in a single `doc.transact` so it emits ONE update frame (one rate-limit token).
 * `updateYFragment` is designed to run inside a transaction; if it opens its own, Yjs nests
 * it into this one — still a single update either way (asserted by the replacement RED).
 */
export const replaceMemoDocContent = (
  doc: Y.Doc,
  desiredNode: ProseMirrorNode
): void => {
  const fragment = doc.getXmlFragment('default');
  doc.transact(() => {
    updateYFragment(doc, fragment, desiredNode, {
      mapping: new Map(),
      isOMark: new Map(),
    });
  });
};
