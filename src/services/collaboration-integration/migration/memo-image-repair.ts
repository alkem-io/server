import * as Y from 'yjs';

const MEMO_ROOT = 'default';

type MemoXmlParent = Y.XmlFragment | Y.XmlElement;

const visitMemoElements = (
  parent: MemoXmlParent,
  visitor: (parent: MemoXmlParent, child: Y.XmlElement, index: number) => void,
  reverse = false
): void => {
  const children = parent.toArray();
  const indexes = children.map((_child, index) => index);
  if (reverse) {
    indexes.reverse();
  }
  for (const index of indexes) {
    const child = children[index];
    if (!(child instanceof Y.XmlElement)) {
      continue;
    }
    visitor(parent, child, index);
    if (child.parent) {
      visitMemoElements(child, visitor, reverse);
    }
  }
};

/** Collect image source occurrence counts from the canonical memo root. */
export const collectMemoImageSources = (doc: Y.Doc): Map<string, number> => {
  const sources = new Map<string, number>();
  visitMemoElements(doc.getXmlFragment(MEMO_ROOT), (_parent, child) => {
    if (child.nodeName !== 'image') {
      return;
    }
    const source = child.getAttribute('src');
    if (typeof source === 'string' && source.length > 0) {
      sources.set(source, (sources.get(source) ?? 0) + 1);
    }
  });
  return sources;
};

/** Remove only image nodes whose exact source was confirmed unrecoverable. */
export const removeMemoImagesBySource = (
  doc: Y.Doc,
  sources: ReadonlySet<string>
): number => {
  let removed = 0;
  visitMemoElements(
    doc.getXmlFragment(MEMO_ROOT),
    (parent, child, index) => {
      if (
        child.nodeName === 'image' &&
        sources.has(child.getAttribute('src') as string)
      ) {
        parent.delete(index, 1);
        removed++;
      }
    },
    true
  );
  return removed;
};
