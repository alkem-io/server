import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  markdownToProseMirrorNode,
  markdownToYjsV2State,
} from './markdown.to.yjs.v2.state';
import { replaceMemoDocContent } from './replace.memo.doc';
import { yjsStateToMarkdown } from './yjs.state.to.markdown';

/**
 * Proves `replaceMemoDocContent` performs a true in-place REPLACEMENT of a live memo's
 * default Y.XmlFragment (via the y-prosemirror `updateYFragment` diff), NOT an
 * `applyUpdateV2` merge — the semantic the write-path fix relies on so a template/framing
 * memo edit, applied by the server as a live-room collaborator, overwrites the document
 * rather than unioning with it.
 */
describe('replaceMemoDocContent — in-place memo replacement', () => {
  const readMarkdown = (doc: Y.Doc): string =>
    yjsStateToMarkdown(Buffer.from(Y.encodeStateAsUpdateV2(doc)));

  /** A fresh doc built straight from markdown — the "desired" reference. */
  const freshDoc = (markdown: string): Y.Doc => {
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, markdownToYjsV2State(markdown));
    return doc;
  };

  const OLD_MD =
    '# Old heading\n\nold paragraph\n\n- old bullet one\n- old bullet two';
  // Rich desired content: heading, bold + italic marks, a hard break, a table.
  const NEW_MD =
    '## Fresh title\n\nA **bold** and *italic* line.\n\n' +
    '| A | B |\n| --- | --- |\n| 1 | 2 |';

  it('replaces exactly — old nodes gone, desired matches a fresh build, marks/table preserved, ONE update', () => {
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, markdownToYjsV2State(OLD_MD));
    expect(readMarkdown(doc)).toContain('Old heading');

    let updates = 0;
    doc.on('update', () => {
      updates += 1;
    });
    replaceMemoDocContent(doc, markdownToProseMirrorNode(NEW_MD));

    const after = readMarkdown(doc);
    // Old-only content is gone (true replacement, not a merge).
    expect(after).not.toContain('Old heading');
    expect(after).not.toContain('old bullet');
    // Desired is exact: identical to a doc built straight from NEW_MD (pins marks + table fidelity).
    expect(after).toBe(readMarkdown(freshDoc(NEW_MD)));
    // Exactly one emitted update frame (one rate-limit token).
    expect(updates).toBe(1);
  });

  it('is a true no-op when the content is unchanged (zero updates)', () => {
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, markdownToYjsV2State(NEW_MD));

    let updates = 0;
    doc.on('update', () => {
      updates += 1;
    });
    replaceMemoDocContent(doc, markdownToProseMirrorNode(NEW_MD));

    expect(updates).toBe(0);
  });

  it('converges remotely — a peer at the same state applies the single delta and matches', () => {
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, markdownToYjsV2State(OLD_MD));
    // Peer starts identical to doc (full state), as a real remote collaborator would after sync.
    const peer = new Y.Doc();
    Y.applyUpdateV2(peer, Y.encodeStateAsUpdateV2(doc));

    let delta: Uint8Array | undefined;
    doc.on('updateV2', (u: Uint8Array) => {
      delta = u;
    });
    replaceMemoDocContent(doc, markdownToProseMirrorNode(NEW_MD));

    expect(delta).toBeDefined();
    Y.applyUpdateV2(peer, delta as Uint8Array);
    expect(readMarkdown(peer)).toBe(readMarkdown(doc));
  });
});
