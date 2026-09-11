import { markdownSchema } from '@domain/common/memo/conversion/markdown.schema';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import { renderToMarkdown } from '@tiptap/static-renderer';
import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import * as Y from 'yjs';
import { blankLineReplacement } from './const';
import { Iframe } from './Iframe';
import { ImageExtension } from './image.extension';

/**
 * Converts binary Y.Doc state update v2 to markdown string
 * @param state
 */
export const yjsStateToMarkdown = (state: Buffer) => {
  const binaryV2State = new Uint8Array(state);

  // Decode into a scratch Y.Doc, extract the ProseMirror tree, and destroy the doc
  // immediately (try/finally so a decode/convert throw still frees it). This helper is
  // called per row by the migration verifier and several read paths, so a leaked doc per
  // call would accumulate — the doc is not needed once `pmDoc` is materialized.
  const doc = new Y.Doc();
  let pmDoc: ProseMirrorNode;
  try {
    Y.applyUpdateV2(doc, binaryV2State);
    // Convert the Yjs document to a ProseMirror document
    pmDoc = yXmlFragmentToProseMirrorRootNode(
      doc.getXmlFragment('default'),
      markdownSchema
    );
  } finally {
    doc.destroy();
  }
  if (
    pmDoc.childCount === 1 &&
    pmDoc.firstChild?.type.name === 'paragraph' &&
    pmDoc.firstChild.content.size === 0
  )
    return '';

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
        const items: string[] = [];
        node.content.forEach(child => {
          items.push(serializeNode(child, depth, node.type.name));
        });
        return items.join('\n');
      }

      case 'listItem': {
        const blocks: { nested: boolean; value: string }[] = [];

        node.content.forEach(child => {
          if (child.type.name === 'paragraph') {
            const paragraphMarkdown = renderToMarkdown({
              extensions: [StarterKit, ImageExtension, Highlight, Iframe],
              content: child,
            }).trim();
            blocks.push({
              nested: false,
              value: paragraphMarkdown || blankLineReplacement,
            });
          } else if (
            child.type.name === 'bulletList' ||
            child.type.name === 'orderedList'
          ) {
            blocks.push({
              nested: true,
              value: serializeNode(child, depth + 1, child.type.name),
            });
          } else {
            // Handle other node types (images, code blocks, etc.) using renderToMarkdown
            const otherContent = renderToMarkdown({
              extensions: [StarterKit, ImageExtension, Highlight, Iframe],
              content: child,
            }).trim();
            blocks.push({ nested: false, value: otherContent });
          }
        });

        const bullet = parentType === 'orderedList' ? '1.' : '-';
        const continuationIndent = `${indent}${' '.repeat(bullet.length + 1)}`;
        const indentContinuation = (value: string) =>
          value
            .split('\n')
            .map(line => `${continuationIndent}${line}`)
            .join('\n');
        const [firstBlock, ...remainingBlocks] = blocks;
        let itemOutput = `${indent}${bullet}`;
        if (firstBlock)
          itemOutput += firstBlock.nested
            ? `\n${firstBlock.value}`
            : ` ${firstBlock.value.replaceAll('\n', `\n${continuationIndent}`)}`;
        for (const block of remainingBlocks)
          itemOutput += `\n\n${block.nested ? block.value : indentContinuation(block.value)}`;
        return itemOutput;
      }

      case 'table': {
        // Custom table serialization - TipTap StarterKit doesn't include Table extension
        let tableOutput = '';
        let isFirstRow = true;

        node.content.forEach(row => {
          if (row.type.name === 'tableRow') {
            const cells: string[] = [];

            row.content.forEach(cell => {
              // Serialize cell content (paragraphs inside the cell)
              let cellContent = '';
              cell.content.forEach(cellChild => {
                if (cellChild.type.name === 'paragraph') {
                  // Check if paragraph only contains a hardBreak (empty cell placeholder)
                  const isHardBreakPlaceholder =
                    cellChild.content.childCount === 1 &&
                    cellChild.content.firstChild?.type.name === 'hardBreak';

                  // Check if paragraph only contains literal "<br>" text (escaped placeholder)
                  const isLiteralBrPlaceholder =
                    cellChild.content.childCount === 1 &&
                    cellChild.content.firstChild?.type.name === 'text' &&
                    cellChild.content.firstChild?.text === '<br>';

                  if (!isHardBreakPlaceholder && !isLiteralBrPlaceholder) {
                    const paragraphContent = renderToMarkdown({
                      extensions: [
                        StarterKit,
                        ImageExtension,
                        Highlight,
                        Iframe,
                      ],
                      content: cellChild,
                    }).trim();
                    cellContent += paragraphContent;
                  }
                }
              });
              // Ensure cell has at least a space if empty
              cells.push(cellContent || ' ');
            });

            tableOutput += '| ' + cells.join(' | ') + ' |\n';

            // Add separator row after the first row (header)
            if (isFirstRow) {
              tableOutput +=
                '| ' + cells.map(() => '----').join(' | ') + ' |\n';
              isFirstRow = false;
            }
          }
        });

        return tableOutput.trimEnd();
      }

      case 'paragraph': {
        if (node.content.size === 0) return blankLineReplacement;

        // Check if paragraph only contains literal "<br>" text (empty line placeholder)
        const isLiteralBrPlaceholder =
          node.content.childCount === 1 &&
          node.content.firstChild?.type.name === 'text' &&
          node.content.firstChild?.text === '<br>';

        if (isLiteralBrPlaceholder) {
          return blankLineReplacement;
        }

        // Use TipTap's default for regular paragraphs
        return renderToMarkdown({
          extensions: [StarterKit, ImageExtension, Highlight, Iframe],
          content: node,
        });
      }

      default:
        // Use TipTap's default for other node types
        return renderToMarkdown({
          extensions: [StarterKit, ImageExtension, Highlight, Iframe],
          content: node,
        });
    }
  };

  const blocks: string[] = [];
  pmDoc.content.forEach(child => {
    blocks.push(serializeNode(child));
  });

  return blocks.join('\n\n').trim();
};
