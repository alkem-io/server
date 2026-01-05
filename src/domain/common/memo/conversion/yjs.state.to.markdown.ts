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

  // Manually serialize with proper indentation by traversing the tree
  const serializeNode = (
    node: ProseMirrorNode,
    depth = 0,
    parentType = ''
  ): string => {
    // Ordered lists need 4 spaces per level, bullet lists need 2
    const indentSize = parentType === 'orderedList' ? 4 : 2;
    const indent = ' '.repeat(depth * indentSize);

    switch (node.type.name) {
      case 'bulletList':
      case 'orderedList': {
        let listOutput = '';
        node.content.forEach(child => {
          listOutput += serializeNode(child, depth, node.type.name);
        });
        return listOutput;
      }

      case 'listItem': {
        let itemText = '';
        let nestedLists = '';

        node.content.forEach(child => {
          if (child.type.name === 'paragraph') {
            const paragraphMarkdown = renderToMarkdown({
              extensions: [StarterKit, ImageExtension, Highlight, Iframe],
              content: child,
            }).trim();
            itemText += paragraphMarkdown;
          } else if (
            child.type.name === 'bulletList' ||
            child.type.name === 'orderedList'
          ) {
            nestedLists += serializeNode(child, depth + 1);
          }
        });

        const bullet = parentType === 'orderedList' ? '1.' : '-';
        const mainLine = itemText
          ? `${indent}${bullet} ${itemText}\n`
          : `${indent}${bullet}\n`;
        return mainLine + nestedLists;
      }

      default:
        // Use TipTap's default for other node types
        return renderToMarkdown({
          extensions: [StarterKit, ImageExtension, Highlight, Iframe],
          content: node,
        });
    }
  };

  let result = '';
  newDoc.content.forEach(child => {
    result += serializeNode(child);
  });

  return result.trim();
};
