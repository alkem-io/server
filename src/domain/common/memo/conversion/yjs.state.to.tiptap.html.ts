import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { renderToHTMLString } from '@tiptap/static-renderer';
import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import * as Y from 'yjs';
import { memoExtensions, memoSchema } from './memo.extensions';

export const MAX_MEMO_EDITOR_CONTENT_BYTES = 1_000_000;

const assertWithinEditorContentLimit = (bytes: number) => {
  if (bytes > MAX_MEMO_EDITOR_CONTENT_BYTES)
    throw new ValidationException(
      `Signing preview supports at most ${MAX_MEMO_EDITOR_CONTENT_BYTES.toLocaleString('en-US')} bytes of memo editor content`,
      LogContext.MEMOS
    );
};

export const yjsStateToTiptapHtml = (state: Buffer): string => {
  assertWithinEditorContentLimit(state.byteLength);
  const doc = new Y.Doc();
  try {
    Y.applyUpdateV2(doc, new Uint8Array(state));
    const content = yXmlFragmentToProseMirrorRootNode(
      doc.getXmlFragment('default'),
      memoSchema
    );
    const json = content.toJSON();
    assertWithinEditorContentLimit(Buffer.byteLength(JSON.stringify(json)));
    return renderToHTMLString({
      extensions: memoExtensions,
      content: json,
    });
  } finally {
    doc.destroy();
  }
};
