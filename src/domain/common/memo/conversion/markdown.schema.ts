import { Schema } from 'prosemirror-model';

type HTMLElement = any;

/** copy-pasted from the frontend
 *  const serializableSchema = {
 *   nodes: schema.spec.nodes,
 *   marks: schema.spec.marks,
 * };
 */
export const markdownSchema = new Schema({
  nodes: {
    doc: {
      content: 'block+',
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [
        {
          tag: 'p',
        },
      ],
    },
    blockquote: {
      content: 'block+',
      group: 'block',
      defining: true,
      parseDOM: [
        {
          tag: 'blockquote',
        },
      ],
    },
    bulletList: {
      content: 'listItem+',
      group: 'block list',
      parseDOM: [
        {
          tag: 'ul',
        },
      ],
    },
    codeBlock: {
      content: 'text*',
      marks: '',
      group: 'block',
      code: true,
      defining: true,
      attrs: {
        language: {
          default: null,
        },
      },
      parseDOM: [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
        },
      ],
    },
    hardBreak: {
      group: 'inline',
      inline: true,
      selectable: false,
      linebreakReplacement: true,
      parseDOM: [
        {
          tag: 'br',
        },
      ],
    },
    heading: {
      content: 'inline*',
      group: 'block',
      defining: true,
      attrs: {
        level: {
          default: 1,
        },
      },
      parseDOM: [
        {
          tag: 'h1',
          attrs: {
            level: 1,
          },
        },
        {
          tag: 'h2',
          attrs: {
            level: 2,
          },
        },
        {
          tag: 'h3',
          attrs: {
            level: 3,
          },
        },
        {
          tag: 'h4',
          attrs: {
            level: 4,
          },
        },
        {
          tag: 'h5',
          attrs: {
            level: 5,
          },
        },
        {
          tag: 'h6',
          attrs: {
            level: 6,
          },
        },
      ],
    },
    horizontalRule: {
      group: 'block',
      parseDOM: [
        {
          tag: 'hr',
        },
      ],
    },
    listItem: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [
        {
          tag: 'li',
        },
      ],
    },
    orderedList: {
      content: 'listItem+',
      group: 'block list',
      attrs: {
        start: {
          default: 1,
        },
        type: {
          default: null,
        },
      },
      parseDOM: [
        {
          tag: 'ol',
        },
      ],
    },
    text: {
      group: 'inline',
    },
    image: {
      group: 'inline',
      inline: true,
      draggable: true,
      attrs: {
        src: {
          default: null,
        },
        alt: {
          default: null,
        },
        title: {
          default: null,
        },
      },
      parseDOM: [
        {
          tag: 'img[src]:not([src^="data:"])',
        },
      ],
    },
    iframe: {
      group: 'block',
      atom: true,
      attrs: {
        src: {
          default: null,
        },
        position: {
          default: 'absolute',
        },
        top: {
          default: 0,
        },
        left: {
          default: 0,
        },
        width: {
          default: '100%',
        },
        height: {
          default: '100%',
        },
        frameborder: {
          default: 0,
        },
        allowFullScreen: {
          default: 1,
        },
        allowfullscreen: {
          default: true,
        },
      },
      parseDOM: [
        {
          tag: 'iframe',
        },
      ],
    },
  },
  marks: {
    link: {
      inclusive: true,
      attrs: {
        href: {
          default: null,
        },
        target: {
          default: '_blank',
        },
        rel: {
          default: 'noopener noreferrer nofollow',
        },
        class: {
          default: null,
        },
      },
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (dom: HTMLElement | string) => {
            if (typeof dom === 'string') return false;

            const href = (dom as HTMLElement).getAttribute('href');
            if (!href) return false;

            // Allow only safe URL schemes
            const safeSchemePattern = /^(https?:|mailto:|tel:)/i;
            if (!safeSchemePattern.test(href)) {
              return false; // Reject dangerous schemes like javascript:, data:, file:, etc.
            }

            return {
              href,
              target: (dom as HTMLElement).getAttribute('target') || '_blank',
              rel:
                (dom as HTMLElement).getAttribute('rel') ||
                'noopener noreferrer nofollow',
              class: (dom as HTMLElement).getAttribute('class') || null,
            };
          },
        },
      ],
    },
    bold: {
      parseDOM: [
        {
          tag: 'strong',
        },
        {
          tag: 'b',
        },
        {
          style: 'font-weight',
          getAttrs: (value: string) => {
            return /^(bold(er)?|[5-9]\d{2})$/.test(value) ? null : false;
          },
        },
      ],
    },
    code: {
      excludes: '_',
      code: true,
      parseDOM: [
        {
          tag: 'code',
        },
      ],
    },
    italic: {
      parseDOM: [
        {
          tag: 'em',
        },
        {
          tag: 'i',
        },
        {
          style: 'font-style',
          getAttrs: (value: string) => (value === 'italic' ? null : false),
        },
      ],
    },
    strike: {
      parseDOM: [
        {
          tag: 's',
        },
        {
          tag: 'del',
        },
        {
          tag: 'strike',
        },
        {
          style: 'text-decoration',
          consuming: false,
          getAttrs: (value: string) =>
            /\bline-through\b/.test(value) ? null : false,
        },
      ],
    },
    highlight: {
      parseDOM: [
        {
          tag: 'mark',
        },
      ],
    },
  },
});
