const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const Y = require('yjs');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const sync = require('y-protocols/sync');
const { CollaborationDocumentSession } = require('../../src/services/collaboration-client/collaboration-document.session');
const { WhiteboardExecutorChild } = require('../../src/services/mcp-server/executor/whiteboard-executor.child');
const headless = require('@excalidraw-yjs/excalidraw/headless');
const { Scene } = headless;
const { createNodeTextMetricsProvider } = require('@excalidraw-yjs/excalidraw/node-metrics');

async function run(invalid, imported = false) {
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
  let payload = { operations };
  if (imported) {
    assert.equal(typeof headless.prepareSceneImport, 'function', 'Published package must export prepareSceneImport');
    const source = new Y.Doc();
    const seeded = headless.prepareSemanticBatch(source, operations.slice(0, 1), { textMetricsProvider: createNodeTextMetricsProvider() });
    assert.equal(seeded.ok, true);
    Y.applyUpdate(source, seeded.update);
    const elements = new Scene(undefined, { doc: source }).getNonDeletedElements().map(element => ({ ...element }));
    if (invalid) elements.push({ ...elements[0], id: randomUUID(), width: -1 });
    payload = { import: { scene: { type: 'excalidraw', version: 2, elements }, targetFileIDs: {} } };
    source.destroy();
  }
  child.receive({ type: 'START', ...payload, childLaunchGrant: { jobId, documentId: randomUUID(), actorId: randomUUID(), deadline: Date.now() + 10000, intent: 'edit-whiteboard-elements' } });
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
    if (imported) assert.equal(messages.at(-1).result.summary[0].op, 'importScene');
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
async function textControls(widthContract = false) {
  const doc = new Y.Doc();
  const options = { textMetricsProvider: createNodeTextMetricsProvider() };
  const prepare = operations => {
    const result = headless.prepareSemanticBatch(doc, operations, options);
    assert.equal(result.ok, true);
    Y.applyUpdate(doc, result.update);
    return result;
  };
  prepare([{ op: 'addText', text: 'natural', fontSize: 24 }, { op: 'addShape', shape: 'rectangle', label: 'label' }]);
  let elements = new Scene(undefined, { doc }).getNonDeletedElements();
  const natural = elements.find(element => element.originalText === 'natural');
  assert.ok(natural.width > 0 && natural.height > 0);
  const label = elements.find(element => element.originalText === 'label');
  assert.ok(label.width > 0 && label.height > 0 && label.containerId);
  prepare([{ op: 'setText', elementId: natural.id, text: 'a much longer natural text value' }]);
  elements = new Scene(undefined, { doc }).getNonDeletedElements();
  assert.ok(elements.find(element => element.id === natural.id).width > natural.width);
  if (widthContract) {
    const text = 'long text that must wrap across multiple lines at the requested width';
    const added = prepare([{ op: 'addText', text, width: 100, fontSize: 24 }]);
    const wrapped = new Scene(undefined, { doc }).getNonDeletedElements().find(element => element.id === added.addedElementIds[0]);
    assert.equal(wrapped.fontSize, 24);
    assert.equal(wrapped.autoResize, false);
    assert.equal(wrapped.width, 100);
    assert.ok(wrapped.height > 24);
    for (const height of [null, 0, 10]) {
      for (const dimensions of [{ height }, { height, width: 100 }]) {
        const before = Y.encodeStateAsUpdate(doc);
        const result = headless.prepareSemanticBatch(doc, [{ op: 'addText', text: 'unsupported', ...dimensions }], options);
        assert.equal(result.ok, false);
        assert.equal(result.error.category, 'invalid-operation');
        assert.deepEqual(Y.encodeStateAsUpdate(doc), before);
      }
    }
  }
  doc.destroy();
}
const mode = process.argv[2];
const task = mode === '--import' ? run(false, true).then(() => run(true, true)) : mode === '--text-width' ? textControls(true) : run(false).then(() => run(true)).then(() => textControls());
task.then(() => process.exit(0)).catch(error => { process.stderr.write(String(error.stack)); process.exit(1); });
