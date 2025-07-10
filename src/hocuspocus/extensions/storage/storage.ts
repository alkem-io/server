import * as Y from 'yjs';
import {
  Extension,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
} from '@hocuspocus/server';

const storage = new Map<string, Y.Doc>();

class Storage implements Extension {
  /**
   * Called once, when the first client connects to the server, during the creation of a new document.
   * Called after onAuthenticate
   * @param data
   */
  onLoadDocument(data: onLoadDocumentPayload): Promise<any> {
    return Promise.resolve(storage.get(data.documentName) ?? new Y.Doc());
  }
  /**
   * The onStoreDocument hooks are called after the document has been changed (after the onChange hook)
   * Calls to onStoreDocument are debounced by default (see debounce and maxDebounce configuration options).
   */
  onStoreDocument(data: onStoreDocumentPayload): Promise<any> {
    storage.set(data.documentName, data.document);
    return Promise.resolve();
  }
}

export default Storage;
