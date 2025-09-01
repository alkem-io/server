import * as Y from 'yjs';
import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { renderToMarkdown } from '@tiptap/static-renderer';
import { Iframe } from './Iframe';
import { ImageExtension } from './image.extension';
import { markdownSchema } from '@domain/common/memo/conversion/markdown.schema';
import { Fragment, Node as ProseMirrorNode } from 'prosemirror-model';
import { newLineReplacement } from './const';

/**
 * Converts binary Y.Doc state update v2 to markdown string
 * @param state
 */
export const yjsStateToMarkdown = (state: Buffer) => {
  const binaryV2State = new Uint8Array(state);

  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, new Uint8Array(binaryV2State));
  // Convert the Yjs document to a ProseMirror document
  const pmDoc = yXmlFragmentToProseMirrorRootNode(
    doc.getXmlFragment('default'),
    markdownSchema
  );
  // Build a new array of child nodes, replacing empty paragraphs with paragraphs containing a non-breaking space
  // This ensures that empty paragraphs are preserved in the markdown output
  // (ProseMirror and TipTap tend to ignore completely empty paragraphs)
  const newContent: ProseMirrorNode[] = [];
  // use the built-in forEach method of the ProseMirror Fragment
  pmDoc.content.forEach(child => {
    // we only target paragraphs without content
    if (child.type.name !== 'paragraph') {
      newContent.push(child);
      return;
    }

    if (child.content.size > 0) {
      newContent.push(child);
      return;
    }
    // Overwrite this paragraph with a new one, containing a non-breaking space
    const newNode = markdownSchema.nodes.paragraph.create(
      null,
      markdownSchema.text(newLineReplacement)
    );
    newContent.push(newNode);
  });
  const newDoc = pmDoc.copy(Fragment.fromArray(newContent));

  return renderToMarkdown({
    extensions: [StarterKit, ImageExtension, /*Link,*/ Highlight, Iframe],
    content: newDoc,
    // options,
  }).trim();
};
