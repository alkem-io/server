const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const Y = require('yjs');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const sync = require('y-protocols/sync');
const { CollaborationDocumentSession } = require('../../src/services/collaboration-client/collaboration-document.session');
const { WhiteboardExecutorChild } = require('../../src/services/mcp-server/executor/whiteboard-executor.child');
const { Scene } = require('@excalidraw-yjs/excalidraw/headless');

async function run(invalid) {
  const session = new CollaborationDocumentSession('ws://unused', {}, randomUUID());
  session.connect = async () => {};
  const room = new Y.Doc();
  let publications = 0;
  const replies = [];
  session.ws = {
    close() {},
    send(bytes) {
      const decoder = decoding.createDecoder(bytes);
      const type = decoding.readVarUint(decoder);
      if (type === 4) {
        const request = JSON.parse(new TextDecoder().decode(decoding.readTailAsUint8Array(decoder)));
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 3);
        encoding.writeUint8Array(encoder, new TextEncoder().encode(JSON.stringify({ kind: 'persisted', requestId: request.requestId })));
        session.onMessage(encoding.toUint8Array(encoder));
      } else {
        const subtype = decoding.readVarUint(decoder);
        if (subtype === 2) { publications++; Y.applyUpdate(room, decoding.readVarUint8Array(decoder)); }
        else replies.push(bytes);
      }
    },
  };
  const messages = [];
  const before = Y.encodeStateAsUpdate(session.doc);
  let exited = false;
  const child = new WhiteboardExecutorChild(message => messages.push(message), () => { exited = true; }, () => session);
  const jobId = randomUUID();
  const operations = [{ op: 'addText', text: 'multiline\nÄé日本語' }];
  if (invalid) operations.push({ op: 'remove', elementId: 'missing' });
  child.receive({ type: 'START', operations, childLaunchGrant: { jobId, documentId: randomUUID(), actorId: randomUUID(), deadline: Date.now() + 10000, intent: 'edit-whiteboard-elements' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(publications, 0);
  if (invalid) {
    assert.equal(messages.at(-1).typedOutcome, 'invalid');
    assert.equal(messages.some(m => m.type === 'PREPARED'), false);
    assert.equal(exited, true);
  } else {
    assert.equal(messages.at(-1).type, 'PREPARED');
    assert.deepEqual(Y.encodeStateAsUpdate(session.doc), before);
    const peer = new Y.Doc();
    const request = encoding.createEncoder();
    encoding.writeVarUint(request, 0);
    sync.writeSyncStep1(request, peer);
    session.onMessage(encoding.toUint8Array(request));
    const response = decoding.createDecoder(replies.at(-1));
    assert.equal(decoding.readVarUint(response), 0);
    sync.readSyncMessage(response, encoding.createEncoder(), peer, null);
    assert.equal(new Scene(undefined, { doc: peer }).getNonDeletedElements().length, 0);
    child.receive({ type: 'GO', jobId, generationId: 1 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages.at(-1).type, 'DURABLE');
    assert.equal(publications, 1);
    const cold = new Y.Doc();
    Y.applyUpdate(cold, Y.encodeStateAsUpdate(room));
    const elements = new Scene(undefined, { doc: cold }).getNonDeletedElements();
    assert.equal(elements.length, 1);
    assert.equal(elements[0].originalText, operations[0].text);
    cold.destroy(); peer.destroy();
  }
  room.destroy();
}
run(false).then(() => run(true)).then(() => process.exit(0)).catch(error => { process.stderr.write(String(error.stack)); process.exit(1); });
