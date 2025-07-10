import {
  afterUnloadDocumentPayload,
  onConnectPayload,
  Server,
} from '@hocuspocus/server';
import Authentication from '@src/hocuspocus/extensions/authentication';
import Storage from './extensions/storage';

const server = new Server({
  address: 'localhost',
  port: 1234,
  extensions: [new Authentication(), new Storage()],

  /**
   * Called once, when a client is connecting.
   * @param data
   */
  onConnect(data: onConnectPayload): Promise<any> {
    console.log('onConnect');
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
});

const start = async () =>
  await server
    .listen(1234)
    .catch(() => console.error('Failed to start Hocuspocus server'));

export default start;
