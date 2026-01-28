# Memo Conversion: Markdown ↔ Yjs

This document describes the conversion process between Markdown and Yjs state for Memos in the Alkemio platform.

## Overview

Memos store rich text content using **Yjs** (a CRDT library) for real-time collaboration. When memos are created or retrieved via GraphQL, the content is converted between:

- **Markdown** (API input/output format)
- **Yjs binary state** (storage format)

```
┌─────────────┐     save      ┌─────────────┐     store     ┌──────────┐
│  Markdown   │ ───────────►  │  Yjs State  │ ───────────►  │ Database │
│  (string)   │               │  (binary)   │               │  (blob)  │
└─────────────┘               └─────────────┘               └──────────┘
       ▲                            │
       │         retrieve           │
       └────────────────────────────┘
```

## File Structure

All conversion logic is in `src/domain/common/memo/conversion/`:

| File                          | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `markdown.to.yjs.v2.state.ts` | Markdown → Yjs conversion                     |
| `yjs.state.to.markdown.ts`    | Yjs → Markdown conversion                     |
| `markdown.schema.ts`          | ProseMirror schema definition                 |
| `const.ts`                    | Shared constants (e.g., `newLineReplacement`) |
| `image.extension.ts`          | TipTap image extension for serialization      |
| `Iframe.ts`                   | TipTap iframe extension for serialization     |

## Conversion Flow

### Markdown → Yjs (`markdownToYjsV2State`)

1. **Pre-processing**
   - Convert `<strong>...</strong>` to `**...**` (bold normalization)
   - Detect if content contains tables

2. **Parsing** (two paths)

   **For content WITHOUT tables:**
   - Replace `<br>` tags with `newLineReplacement` (preserves empty paragraphs)
   - Use `prosemirror-markdown`'s `MarkdownParser` with custom token rules

   **For content WITH tables:**
   - Use HTML-based parsing via `parseMarkdownViaHtml()`
   - markdown-it renders to HTML
   - Clean up `<br>` tags and escaped `&lt;br&gt;` in table cells
   - Wrap cell content in `<p>` tags (schema requirement)
   - JSDOM parses HTML to DOM
   - ProseMirror's `DOMParser` creates the document

3. **Encoding**
   - Convert ProseMirror document to Yjs document via `prosemirrorToYDoc()`
   - Encode as Yjs v2 state update (binary)

### Yjs → Markdown (`yjsStateToMarkdown`)

1. **Decoding**
   - Apply Yjs v2 state update to new `Y.Doc`
   - Convert Yjs XML fragment to ProseMirror document via `yXmlFragmentToProseMirrorRootNode()`

2. **Empty paragraph handling**
   - Replace empty paragraphs with paragraphs containing `newLineReplacement`
   - Ensures empty lines are preserved in output

3. **Serialization** (custom `serializeNode` function)

   | Node Type                   | Handling                                                        |
   | --------------------------- | --------------------------------------------------------------- |
   | `bulletList`, `orderedList` | Custom indentation (2 spaces for bullets, 4 for ordered)        |
   | `listItem`                  | Proper bullet/number prefix with nested list support            |
   | `table`                     | Custom markdown table format with `\|` separators               |
   | `paragraph`                 | TipTap's `renderToMarkdown()`, with `<br>` placeholder handling |
   | Others                      | TipTap's `renderToMarkdown()`                                   |

4. **Table cell handling**
   - Skip cells containing only `hardBreak` nodes (empty cell placeholders)
   - Skip cells containing literal `<br>` text
   - Empty cells output as single space

## Special Cases

### Empty Table Cells

The frontend uses `<br>` as a placeholder for empty table cells. The conversion handles this by:

1. **On save (Markdown → Yjs):**
   - Removes `<br>` and `&lt;br&gt;` from table cells
   - Cells become truly empty

2. **On retrieve (Yjs → Markdown):**
   - Detects `hardBreak` nodes or literal `<br>` text in cells
   - Outputs as empty cell (single space)

### Tables and Line Breaks

Markdown tables require each row on a single line. The `newLineReplacement` constant (which contains newlines) cannot be used within table content, hence the separate HTML-based parsing path for tables.

### JSDOM Dependency

JSDOM is required because:

- ProseMirror's `DOMParser` needs an actual DOM document
- Node.js has no native DOM
- JSDOM provides browser-like DOM environment for HTML parsing

## Schema

The ProseMirror schema (`markdown.schema.ts`) defines supported node types:

**Block nodes:** `doc`, `paragraph`, `blockquote`, `heading`, `codeBlock`, `horizontalRule`, `bulletList`, `orderedList`, `listItem`, `table`, `tableRow`, `tableCell`, `tableHeader`, `image`

**Marks:** `bold`, `italic`, `code`, `link`, `strike`, `highlight`

## Debugging

To debug conversion issues, add console logs in the conversion functions:

```typescript
// In markdownToYjsV2State
console.log('[markdownToYjsV2State] input:', markdown);
console.log('[markdownToYjsV2State] hasTable:', hasTable);

// In yjsStateToMarkdown
console.log(
  '[yjsStateToMarkdown] pmDoc:',
  JSON.stringify(pmDoc.toJSON(), null, 2)
);
```

## Common Issues

| Issue                               | Cause                                                  | Solution                                                 |
| ----------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `<br>` appearing in markdown output | Literal `<br>` text stored instead of `hardBreak` node | Check `parseMarkdownViaHtml` cleanup regexes             |
| Table cells losing content          | Regex matching across cell boundaries                  | Use `\s*` instead of `[\s\S]*?` in cell content patterns |
| Empty paragraphs disappearing       | ProseMirror ignores empty nodes                        | `newLineReplacement` adds non-breaking space             |
| Bold not rendering                  | `<strong>` tags in input                               | Pre-processing converts to `**...**`                     |
