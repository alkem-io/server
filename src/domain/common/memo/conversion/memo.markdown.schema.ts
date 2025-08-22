import { Schema } from 'prosemirror-model';
import { NodeProps } from '@tiptap/static-renderer';

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    text: { group: 'inline' },
    iframe: {
      group: 'block',
      atom: true,
      attrs: {
        src: { default: '' },
        allowfullscreen: { default: true },
        mozallowfullscreen: { default: true },
        webkitallowfullscreen: { default: true },
        class: { default: 'iframe-wrapper' },
        style: {
          default: 'position: relative; height: 442px; width: 100%;',
        },
      },
      parseDOM: [
        {
          tag: 'iframe',
          getAttrs(dom) {
            return {
              src: dom.getAttribute('src'),
              allowfullscreen: dom.hasAttribute('allowfullscreen'),
              mozallowfullscreen: dom.hasAttribute('mozallowfullscreen'),
              webkitallowfullscreen: dom.hasAttribute('webkitallowfullscreen'),
            };
          },
        },
      ],
      toDOM(node) {
        const {
          src,
          allowfullscreen,
          mozallowfullscreen,
          webkitallowfullscreen,
          class: cls,
          style,
        } = node.attrs;

        const iframeAttrs = {
          src,
          allowfullscreen: allowfullscreen ? 'true' : null,
          mozallowfullscreen: mozallowfullscreen ? 'true' : null,
          webkitallowfullscreen: webkitallowfullscreen ? 'true' : null,
        };
        const wrapperAttrs = { class: cls, style };

        return ['div', wrapperAttrs, ['iframe', iframeAttrs]];
      },
    },
  },
  marks: {},
});

// mapping for iframe nodes
export const nodeMapping = {
  iframe({ node }: NodeProps) {
    const attrs = node.attrs;
    const wrapperAttrs = [];

    if (attrs.class) wrapperAttrs.push(`class="${attrs.class}"`);
    if (attrs.style) wrapperAttrs.push(`style="${attrs.style}"`);

    const iframeAttrs = [];
    if (attrs.position) iframeAttrs.push(`position="${attrs.position}"`);
    if (attrs.height) iframeAttrs.push(`height="${attrs.height}"`);
    if (attrs.width) iframeAttrs.push(`width="${attrs.width}"`);
    if (attrs.src) iframeAttrs.push(`src="${attrs.src}"`);
    // position
    if (attrs.top) iframeAttrs.push(`top="${attrs.top}"`);
    if (attrs.left) iframeAttrs.push(`left="${attrs.left}"`);
    if (attrs.frameborder)
      iframeAttrs.push(`frameborder="${attrs.frameborder}"`);
    if (attrs.allowFullScreen)
      iframeAttrs.push(`allowFullScreen="${attrs.allowFullScreen}"`);
    if (attrs.allowfullscreen)
      iframeAttrs.push(`allowfullscreen="${attrs.allowfullscreen}"`);

    return `\n<div ${wrapperAttrs.join(' ')}><iframe ${iframeAttrs.join(' ')}></iframe></div>\n`;
  },
};

export const options = {
  nodeMapping,
  unhandledNode({ node }: NodeProps) {
    return `\n[unhandled node: ${node.type.name}]\n`;
  },
};
