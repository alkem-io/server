import { CommandProps, Node } from '@tiptap/core';

// We need to declare it explicitly since the iframe option is still in experimental phase.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      setIframe: (options: { src: string }) => ReturnType;
    };
  }
}

const defaultIframeAttributes = {
  src: { default: null },
  position: { default: 'absolute' },
  top: { default: 0 },
  left: { default: 0 },
  width: { default: '100%' },
  height: { default: '100%' },
  frameborder: { default: 0 },
  allowFullScreen: { default: 1 },
};

export type IframeOptions = {
  allowFullscreen: boolean;
  HTMLAttributes: {
    [key: string]: string;
  };
};

export const Iframe = Node.create<IframeOptions>({
  name: 'iframe',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      allowFullscreen: true,
      mozallowfullscreen: true,
      webkitallowfullscreen: true,
      HTMLAttributes: {
        class: 'iframe-wrapper',
        style: 'position: relative; height: 442px; width: 100%;', // This `height` is applied to the iframe in the edit dialog. Without it the iframe video is short in height and it might misslead the user that it will look the same after submitting it.
      },
    };
  },

  addAttributes() {
    return {
      ...defaultIframeAttributes,
      allowfullscreen: {
        default: this.options.allowFullscreen,
        parseHTML: () => this.options.allowFullscreen,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', this.options.HTMLAttributes, ['iframe', HTMLAttributes]];
  },

  addCommands() {
    return {
      setIframe:
        (options: { src: string }) =>
        ({ tr, dispatch }: CommandProps) => {
          const { selection } = tr;
          const node = this.type.create(options);

          if (dispatch) {
            tr.replaceRangeWith(selection.from, selection.to, node);
          }

          return true;
        },
    };
  },
});
