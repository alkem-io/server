import { JSDOM } from 'jsdom';
import markdownIt from 'markdown-it';

/**
 * Converts markdown content to plain text by rendering to HTML
 * and extracting the text content.
 *
 * This is useful for contexts that require plain text output,
 * such as calendar event descriptions, email subjects, or notifications.
 *
 * @param markdown - The markdown string to convert
 * @returns Plain text with HTML tags and entities properly decoded
 */
export const convertMarkdownToPlainText = (markdown: string): string => {
  if (!markdown || markdown.trim().length === 0) {
    return '';
  }

  const md = markdownIt();
  const html = md.render(markdown);

  // Use JSDOM to properly parse HTML and extract text content
  // Security: explicitly disable script execution and external resource loading
  // since we're processing user-provided content
  const dom = new JSDOM(html, {
    runScripts: undefined, // Never execute scripts
    resources: undefined, // Don't load external resources
    pretendToBeVisual: false, // We don't need layout/rendering
  });
  const text = dom.window.document.body.textContent || '';

  // Normalize whitespace: collapse multiple newlines and trim
  return text.replace(/\n\s*\n/g, '\n').trim();
};
