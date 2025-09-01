import * as Y from 'yjs';
import { MarkdownParser } from 'prosemirror-markdown';
import markdownIt, { Token } from 'markdown-it';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { markdownSchema } from './markdown.schema';
import { newLineReplacement } from './const';

/**
 * Converts a markdown string to a Yjs state update, encoded in binary.
 * @param _markdown
 */
export const markdownToYjsV2State = (_markdown: string): Uint8Array => {
  // Convert <strong>...</strong> to **...** for Markdown bold
  // it is something to do with the schema or the rules that I cannot solve
  const processed = _markdown
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    // Only replace <br> tags with a single empty paragraph
    .replace(/<br\s*\/?>(\r?\n)?/gm, newLineReplacement);

  const mdParser = new MarkdownParser(
    markdownSchema,
    markdownIt(),
    parserRules
  );
  const pmDoc = mdParser.parse(processed);
  const ydoc = prosemirrorToYDoc(pmDoc, 'default');

  return Y.encodeStateAsUpdateV2(ydoc);
};

const parserRules: MarkdownParser['tokens'] = {
  // Block Nodes
  paragraph: { block: 'paragraph' },
  blockquote: { block: 'blockquote' },
  heading: {
    block: 'heading',
    getAttrs: (token: Token) => ({
      level: Number(token.tag.slice(1)),
    }),
  },
  code_block: {
    block: 'codeBlock',
    noCloseToken: true,
  },
  fence: {
    block: 'codeBlock',
    getAttrs: (token: Token) => ({
      language: token.info,
    }),
  },
  hr: { node: 'horizontalRule' },
  bullet_list: { block: 'bulletList' },
  ordered_list: {
    block: 'orderedList',
    getAttrs: (token: Token) => ({
      start: Number(token.attrGet('start') || 1),
    }),
  },
  list_item: { block: 'listItem' },
  hardbreak: { node: 'hardBreak' },

  // Inline Nodes
  image: {
    node: 'image',
    getAttrs: (token: Token) => ({
      src: token.attrGet('src'),
      alt: token.attrGet('alt'),
      title: token.attrGet('title'),
    }),
  },

  // Marks
  link: {
    mark: 'link',
    getAttrs: (token: Token) => ({
      href: token.attrGet('href'),
      title: token.attrGet('title'),
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
