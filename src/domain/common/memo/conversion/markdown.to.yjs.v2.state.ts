import * as Y from 'yjs';
import { MarkdownParser } from 'prosemirror-markdown';
import markdownIt, { Token } from 'markdown-it';
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model';
import { JSDOM } from 'jsdom';
import { prosemirrorToYDoc } from '@tiptap/y-tiptap';
import { markdownSchema } from './markdown.schema';
import { newLineReplacement } from './const';
import { Node as ProseMirrorNode } from 'prosemirror-model';

/**

 * Converts a markdown string to a Yjs state update, encoded in binary.
 * @param _markdown
 */
export const markdownToYjsV2State = (_markdown: string): Uint8Array => {
  // Convert <strong>...</strong> to **...** for Markdown bold
  // it is something to do with the schema or the rules that I cannot solve
  const strongProcessed = _markdown.replace(
    /<strong>(.*?)<\/strong>/g,
    '**$1**'
  );

  // Check if markdown contains a table BEFORE applying newLineReplacement
  // newLineReplacement contains newlines which would break markdown table structure
  // (markdown tables require each row to be on a single line)
  const hasTable =
    /\|.*\|/.test(strongProcessed) &&
    /(^|\n)\s*\|(\s*[-:]+\s*\|)+\s*($|\n)/.test(strongProcessed);

  let pmDoc: ProseMirrorNode;

  if (hasTable) {
    // Use HTML-based parsing for content with tables
    // Don't apply newLineReplacement - it would break table row structure
    // <br> tags in cells will be handled by parseMarkdownViaHtml
    pmDoc = parseMarkdownViaHtml(strongProcessed);
  } else {
    // For non-table content, apply <br> replacement for paragraph breaks
    const processed = strongProcessed.replace(
      /<br\s*\/?>(\r?\n)?/gm,
      newLineReplacement
    );
    const mdParser = new MarkdownParser(
      markdownSchema,
      markdownIt().enable('table'),
      parserRules
    );
    pmDoc = mdParser.parse(processed);
  }

  const ydoc = prosemirrorToYDoc(pmDoc, 'default');
  return Y.encodeStateAsUpdateV2(ydoc);
};

/**
 * Parses markdown to ProseMirror document via HTML conversion.
 * This approach properly handles table cells by wrapping content in paragraphs.
 */
const parseMarkdownViaHtml = (markdown: string): ProseMirrorNode => {
  const md = markdownIt().enable('table');
  let html = md.render(markdown);

  // Remove <br> tags from table cells - they don't translate to markdown table format
  // (markdown tables are line-based and can't have line breaks within cells)
  // This handles cells that contain only <br> or <br> mixed with content
  html = html
    .replace(/<(t[dh])>\s*<br\s*\/?>\s*<\/\1>/g, '<$1></$1>') // cells with only <br>
    .replace(/<(t[dh])>([^<]*)<br\s*\/?>\s*<\/\1>/g, '<$1>$2</$1>') // <br> at end
    .replace(/<(t[dh])>\s*<br\s*\/?>([^<]*)<\/\1>/g, '<$1>$2</$1>'); // <br> at start

  // Also handle escaped &lt;br&gt; (literal "<br>" text that was HTML-escaped)
  // This happens when markdown contains literal "<br>" as cell placeholder text
  // Only match cells where &lt;br&gt; is the ONLY content (with optional whitespace)
  // Using [^<]* instead of [\s\S]*? to prevent matching across cell boundaries
  html = html.replace(/<(t[dh])>\s*&lt;br&gt;\s*<\/\1>/g, '<$1></$1>');
  // For <br> in non-table content (paragraphs), convert to paragraph breaks
  // This splits <p>text<br>more</p> into <p>text</p><p>more</p>
  html = html.replace(
    /<p>([^<]*)<br\s*\/?>([^<]*)<\/p>/g,
    '<p>$1</p><p>$2</p>'
  );

  // Handle escaped &lt;br&gt; in paragraphs (literal "<br>" text)
  // Convert <p>&lt;br&gt;</p> to empty paragraph
  html = html.replace(/<p>\s*&lt;br&gt;\s*<\/p>/g, '<p></p>');

  // Wrap table cell content in paragraphs to match schema expectations
  // The schema expects tableCell to contain block+ content (paragraphs)
  html = html
    .replace(/<td>([\s\S]*?)<\/td>/g, '<td><p>$1</p></td>')
    .replace(/<th>([\s\S]*?)<\/th>/g, '<th><p>$1</p></th>')
    // Handle empty cells
    .replace(/<td><p><\/p><\/td>/g, '<td><p></p></td>')
    .replace(/<th><p><\/p><\/th>/g, '<th><p></p></th>');

  // Parse HTML using JSDOM and ProseMirror's DOMParser
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const parser = ProseMirrorDOMParser.fromSchema(markdownSchema);

  return parser.parse(dom.window.document.body);
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

  // Tables
  table: { block: 'table' },
  thead: { ignore: true },
  tbody: { ignore: true },
  tr: { block: 'tableRow' },
  th: {
    block: 'tableHeader',
    getAttrs: (token: Token) => ({
      colspan: Number(token.attrGet('colspan') || 1),
      rowspan: Number(token.attrGet('rowspan') || 1),
    }),
  },
  td: {
    block: 'tableCell',
    getAttrs: (token: Token) => ({
      colspan: Number(token.attrGet('colspan') || 1),
      rowspan: Number(token.attrGet('rowspan') || 1),
    }),
  },

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
