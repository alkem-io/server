import {
  afterUnloadDocumentPayload,
  onAuthenticatePayload,
  onConnectPayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
  Server,
} from '@hocuspocus/server';
import * as Y from 'yjs';

const storage = new Map<string, Y.Doc>();

const server = new Server({
  address: 'localhost',
  port: 1234,
  /**
   * Called once, when the first client connects to the server, during the creation of a new document.
   * Called after onAuthenticate
   * https://tiptap.dev/docs/hocuspocus/server/extensions/database
   * @param data
   */
  onLoadDocument(data: onLoadDocumentPayload): Promise<any> {
    console.log('onLoadDocument');
    return Promise.resolve(storage.get(data.documentName) ?? new Y.Doc());
  },
  /**
   * Called once, when a client is connecting.
   * @param data
   */
  onConnect(data: onConnectPayload): Promise<any> {
    console.log('onConnect');
    return Promise.resolve();
  },
  /**
   * Called once, after the client has connected.
   * Called after onConnect
   * @param data
   */
  onAuthenticate(data: onAuthenticatePayload): Promise<any> {
    console.log('onAuthenticate');
    return Promise.resolve();
  },
  /**
   * Called once, after the room and the document have been destroyed.
   * @param data
   */
  afterUnloadDocument(data: afterUnloadDocumentPayload): Promise<any> {
    console.log('afterUnloadDocument');
    return Promise.resolve();
  },
  /**
   * The onStoreDocument hooks are called after the document has been changed (after the onChange hook)
   * and can be used to store the changed document to a persistent storage.
   * Calls to onStoreDocument are debounced by default (see debounce and maxDebounce configuration options).
   *
   * The easiest way to implement this functionality is by extending the extension `extension-database`
   * and implementing fetch() and store() methods, as we did that in extension-sqlite.
   * You can implement the onStoreDocument yourself with the hook directly,
   * just make sure to apply / encode the states of the yDoc as we did in extension-database.
   * https://tiptap.dev/docs/hocuspocus/server/extensions/database
   * @param data
   */
  onStoreDocument(data: onStoreDocumentPayload): Promise<any> {
    console.log('onStoreDocument');
    storage.set(data.documentName, data.document);
    return Promise.resolve();
  },
});

const start = async () =>
  await server
    .listen(1234)
    .catch(() => console.error('Failed to start Hocuspocus server'));

export default start;
