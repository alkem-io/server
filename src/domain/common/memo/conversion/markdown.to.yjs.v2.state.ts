import * as Y from 'yjs';
import { MarkdownParser } from 'prosemirror-markdown';
import markdownIt from 'markdown-it';
import { prosemirrorJSONToYDoc } from '@tiptap/y-tiptap';
import { schema } from './schema';

/**
 * Converts a markdown string to a Yjs state update, encoded in binary.
 * @param markdown
 */
export const markdownToYjsV2State = (markdown: string): Uint8Array => {
  const mdParser = new MarkdownParser(schema, markdownIt(), parserRules);
  const pmDoc = mdParser.parse(markdown);
  const pmJson = pmDoc.toJSON();

  const ydoc = prosemirrorJSONToYDoc(schema, pmJson, 'default');
  return Y.encodeStateAsUpdateV2(ydoc);
};

const parserRules = {
  // Block Nodes
  paragraph: { block: 'paragraph' },
  blockquote: { block: 'blockquote' },
  heading: {
    block: 'heading',
    getAttrs: (tok: any) => ({
      level: +tok.tag.slice(1),
    }),
  },
  code_block: {
    block: 'codeBlock',
    noCloseToken: true,
  },
  fence: {
    block: 'codeBlock',
    getAttrs: (tok: any) => ({
      language: tok.info,
    }),
  },
  hr: { node: 'horizontalRule' },
  bullet_list: { block: 'bulletList' },
  ordered_list: {
    block: 'orderedList',
    getAttrs: (tok: any) => ({
      start: +tok.attrGet('start') || 1,
    }),
  },
  list_item: { block: 'listItem' },
  hardbreak: { node: 'hardBreak' },

  // Inline Nodes
  image: {
    node: 'image',
    getAttrs: (tok: any) => ({
      src: tok.attrGet('src'),
      alt: tok.attrGet('alt'),
      title: tok.attrGet('title'),
    }),
  },

  // Marks
  link: {
    mark: 'link',
    getAttrs: (tok: any) => ({
      href: tok.attrGet('href'),
      title: tok.attrGet('title'),
      target: '_blank', // Set a default target based on your schema
      rel: 'noopener noreferrer nofollow', // Set a default rel based on your schema
    }),
  },
  strong: { mark: 'bold' },
  em: { mark: 'italic' },
  code_inline: { mark: 'code' },
  s: { mark: 'strike' },
  // Note: 'highlight' mark has no standard markdown equivalent, so it is omitted from these rules.
};
