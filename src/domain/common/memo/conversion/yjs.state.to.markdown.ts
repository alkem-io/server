import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from '@tiptap/y-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { renderToMarkdown } from '@tiptap/static-renderer';
import { Iframe } from './Iframe';
import { ImageExtension } from './image.extension';

/**
 * Converts binary Y.Doc state update v2 to markdown string
 * @param state
 */
export const yjsStateToMarkdown = (state: Buffer) => {
  const binaryV2State = new Uint8Array(state);

  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, new Uint8Array(binaryV2State));

  // use the deprecated method until a schema is defined that would replace the extensions
  // https://tiptap.dev/docs/editor/core-concepts/schema
  const pmJson = yDocToProsemirrorJSON(doc, 'default');
  // const pmJson = yXmlFragmentToProseMirrorRootNode(
  //   doc.getXmlFragment('default'),
  //   schema
  // );
  return renderToMarkdown({
    extensions: [StarterKit, ImageExtension, /*Link,*/ Highlight, Iframe],
    content: pmJson,
    // options,
  });
};
