import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  artifact,
  board,
  call,
  loadManifest,
  mcp,
  native,
  prerequisite,
  readRoom,
  room,
  sha256,
  uuid,
} from './harness.mjs';

const fixtureURL = new URL(
  '../../../fixtures/mcp-recovery/workflow.excalidraw',
  import.meta.url
);
const source = () => JSON.parse(readFileSync(fixtureURL, 'utf8'));
const same = (actual, expected) =>
  assert.ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    'scene/state mismatch (payload redacted)'
  );
const success = result => {
  assert.equal(result.error, false);
  assert.equal(result.data.outcome, 'durable-success');
  return result.data;
};

test('US1-AS1/AS2: concurrent real MCP imports preserve graph, assets and independent edits', async t => {
  const manifest = loadManifest();
  const id = board(manifest, 'collision');
  const client = await mcp(manifest);
  const peer = await mcp(manifest, 'secondAuthor');
  t.after(async () => {
    await client.close();
    await peer.close();
  });
  const before = await readRoom(manifest, id);
  const scene = source();
  prerequisite(
    scene.elements.every(el => before.elements.some(old => old.id === el.id)),
    'collision destination must contain every source identity'
  );
  const observer = await room(manifest, id);
  t.after(() => observer.close());
  const { fork } = native(manifest);
  const view = new fork.Scene(undefined, { doc: observer.doc });
  const original = view.getNonDeletedElements()[0];
  const concurrentX = original.x + 13;
  const pending = [client, peer].map(connection =>
    call(connection, 'import_whiteboard_scene', { whiteboardId: id, scene })
  );
  observer.sendMutation(() =>
    view.mutateElement(view.getElement(original.id), { x: concurrentX })
  );
  await observer.requestDurability(30000);
  const results = (await Promise.all(pending)).map(success);
  const after = await readRoom(manifest, id);
  same(after.appState, before.appState);
  assert.equal(after.elements.find(el => el.id === original.id).x, concurrentX);
  for (const old of before.elements.filter(el => el.id !== original.id))
    same(
      after.elements.find(el => el.id === old.id),
      old
    );
  const allAdded = results.flatMap(result => result.addedElementIds);
  assert.equal(new Set(allAdded).size, scene.elements.length * 2);
  for (const result of results) {
    assert.equal(result.addedElementIds.length, scene.elements.length);
    const added = result.addedElementIds.map(key =>
      after.elements.find(el => el.id === key)
    );
    assert.ok(added.every(Boolean));
    const ids = new Set(result.addedElementIds);
    const oldIds = new Set(before.elements.map(el => el.id));
    assert.ok(added.every(el => !oldIds.has(el.id)));
    same(
      added.map(({ type, x, y, width, height }) => ({
        type,
        x,
        y,
        width,
        height,
      })),
      scene.elements.map(({ type, x, y, width, height }) => ({
        type,
        x,
        y,
        width,
        height,
      }))
    );
    for (let index = 0; index < added.length; index++) {
      const el = added[index];
      assert.ok(
        el.index >
          (index ? added[index - 1].index : before.elements.at(-1).index)
      );
      assert.ok(
        el.groupIds.every(
          group => !scene.elements.some(item => item.groupIds.includes(group))
        )
      );
      for (const ref of [
        el.frameId,
        el.containerId,
        el.startBinding?.elementId,
        el.endBinding?.elementId,
        ...(el.boundElements ?? []).map(edge => edge.id),
      ].filter(Boolean))
        assert.ok(ids.has(ref));
      if (el.type === 'text')
        assert.equal(el.originalText, scene.elements[index].originalText);
      if (el.type === 'image') {
        assert.notEqual(el.fileId, scene.elements[index].fileId);
        assert.match(after.files[el.fileId], /^[a-f\d-]{36}$/i);
      }
    }
  }
  for (const [key, value] of Object.entries(before.files))
    assert.equal(after.files[key], value);
});

test('US1-AS1: externally evicted room reconnects from durable checkpoint', async () => {
  const manifest = loadManifest();
  prerequisite(
    manifest.observations?.coldRead,
    'separate stack-runner stage must close all observers, restart only owned collaboration, and supply expected scene plus checkpoint/version evidence; warm read is insufficient'
  );
  const cold = JSON.parse(artifact(manifest, manifest.observations.coldRead));
  assert.equal(cold.runId, manifest.runId);
  const id = board(manifest, 'cold');
  assert.equal(cold.boardId, id);
  assert.equal(
    cold.collaborationContainerId,
    manifest.services.collaboration.containerId
  );
  assert.ok(
    cold.observersClosedAt < cold.restartAt &&
      cold.restartAt < cold.reconnectedAt
  );
  assert.ok(
    cold.durableVersion > 0 && /^[a-f\d]{64}$/.test(cold.checkpointSha256)
  );
  assert.ok(
    cold.restartAt > cold.durableAt && cold.reconnectedAt <= Date.now()
  );
  const after = await readRoom(manifest, id);
  assert.equal(
    cold.sceneSha256,
    sha256(
      Buffer.from(
        JSON.stringify({
          elements: after.elements,
          files: after.files,
          appState: after.appState,
        })
      )
    )
  );
});

test('US1-AS3/AS4, US2-AS2: invalid-last, broken graph, media and height fail without room effects', async t => {
  const manifest = loadManifest();
  const id = board(manifest, 'negative');
  const client = await mcp(manifest);
  t.after(() => client.close());
  const valid = source();
  const invalidLast = structuredClone(valid);
  invalidLast.elements.push({
    ...invalidLast.elements[0],
    id: 'invalid-last',
    width: -1,
  });
  const duplicate = structuredClone(valid);
  duplicate.elements.push(structuredClone(duplicate.elements[0]));
  const dangling = structuredClone(valid);
  dangling.elements.find(el => el.type === 'arrow').startBinding.elementId =
    'missing';
  const missingMedia = structuredClone(valid);
  missingMedia.files = {};
  const unsupported = structuredClone(valid);
  unsupported.elements.at(-1).type = 'future-unsupported-element';
  for (const scene of [
    invalidLast,
    duplicate,
    dangling,
    missingMedia,
    unsupported,
    { ...valid, version: 999 },
    { ...valid, elements: [] },
  ]) {
    const before = await readRoom(manifest, id);
    const result = await call(client, 'import_whiteboard_scene', {
      whiteboardId: id,
      scene,
    });
    assert.equal(result.error, true);
    assert.equal(result.data.outcome, 'invalid');
    same(await readRoom(manifest, id), before);
  }
  for (const height of [null, 0, 30])
    for (const dimensions of [{ height }, { height, width: 100 }]) {
      const before = await readRoom(manifest, id);
      assert.equal(
        (
          await call(client, 'edit_whiteboard_elements', {
            whiteboardId: id,
            operations: [
              { op: 'addText', text: 'reject height', ...dimensions },
            ],
          })
        ).error,
        true
      );
      same(await readRoom(manifest, id), before);
    }
});

test('US1-AS4/US4-AS1: real denied actor and canary reject arbitrary URL media', async t => {
  const manifest = loadManifest();
  const id = board(manifest, 'negative');
  const author = await mcp(manifest);
  const denied = await mcp(manifest, 'denied');
  t.after(async () => {
    await author.close();
    await denied.close();
  });
  const before = await readRoom(manifest, id);
  assert.equal(
    (
      await call(denied, 'import_whiteboard_scene', {
        whiteboardId: id,
        scene: source(),
      })
    ).data.outcome,
    'forbidden'
  );
  await assert.rejects(
    denied.callTool({
      name: 'analyze_whiteboard',
      arguments: { whiteboardId: id, analysisType: 'elements' },
    }),
    error =>
      error instanceof McpError &&
      error.code === -32603 &&
      error.message.includes("Authorization: unable to grant 'read' privilege")
  );
  const viewer = await room(manifest, id, 'reader');
  try {
    assert.equal(viewer.isReadOnly(), true);
  } finally {
    viewer.close();
  }
  const counter = async () => {
    const response = await fetch(
      new URL('/count', manifest.services.canary.endpoint),
      { redirect: 'error', signal: AbortSignal.timeout(5000) }
    );
    assert.equal(response.status, 200);
    return response.json();
  };
  assert.equal((await counter()).requests, 0);
  for (const url of [
    `${manifest.services.canary.endpoint}/direct`,
    `${manifest.services.canary.endpoint}/redirect`,
    'http://169.254.169.254/metadata',
    'http://10.0.0.1/private',
    'https://127.0.0.1/private',
  ]) {
    const scene = source();
    scene.files['source-image'].dataURL = url;
    assert.equal(
      (
        await call(author, 'import_whiteboard_scene', {
          whiteboardId: id,
          scene,
        })
      ).error,
      true
    );
  }
  assert.equal((await counter()).requests, 0);
  same(await readRoom(manifest, id), before);
});

test('US1-AS5: complete decoded JSON-RPC envelopes at 262144 and 262145 bytes', async t => {
  const manifest = loadManifest();
  const client = await mcp(manifest);
  t.after(() => client.close());
  const transport = client.transport;
  prerequisite(
    transport?.sessionId && transport.protocolVersion,
    'initialized SDK session and negotiated protocol required'
  );
  const id = board(manifest, 'negative');
  const before = await readRoom(manifest, id);
  for (const size of [262144, 262145]) {
    const request = {
      jsonrpc: '2.0',
      id: size,
      method: 'tools/call',
      params: {
        name: 'import_whiteboard_scene',
        arguments: {
          whiteboardId: id,
          scene: { ...source(), version: 999, source: '' },
        },
      },
    };
    const base = JSON.stringify(request);
    request.params.arguments.scene.source = 'a'.repeat(
      size - Buffer.byteLength(base)
    );
    const body = JSON.stringify(request);
    assert.equal(Buffer.byteLength(body), size);
    const response = await fetch(
      new URL('/rest/mcp', manifest.services.mcp.endpoint),
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${manifest.fixtures.actors.author.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': transport.sessionId,
          'mcp-protocol-version': transport.protocolVersion,
        },
        body,
      }
    );
    if (size === 262145) assert.equal(response.status, 413);
    else {
      assert.equal(response.status, 200);
      assert.match(await response.text(), /invalid|Invalid/);
    }
    await response.body?.cancel().catch(() => {});
    same(await readRoom(manifest, id), before);
  }
});

test('US1-AS3: malformed legacy destination fails without repair or publication', async t => {
  const manifest = loadManifest();
  const id = board(manifest, 'legacy');
  const client = await mcp(manifest);
  t.after(() => client.close());
  const raw = async () => {
    const session = await room(manifest, id);
    try {
      const { Y, fork } = native(manifest);
      const texts = [...session.doc.getMap(fork.ELEMENTS).values()].filter(
        element => element.get('type') === 'text'
      );
      prerequisite(
        texts.some(element => !element.has('originalText')),
        'manifest legacy fixture must contain actual malformed historical text'
      );
      return Buffer.from(Y.encodeStateAsUpdate(session.doc));
    } finally {
      session.close();
    }
  };
  const before = await raw();
  const result = await call(client, 'import_whiteboard_scene', {
    whiteboardId: id,
    scene: source(),
  });
  assert.equal(result.error, true);
  assert.equal(result.data.outcome, 'invalid');
  assert.ok(
    (await raw()).equals(before),
    'malformed destination changed (payload redacted)'
  );
});

test('US1-AS4: standard sourceFiles copies readable foreign files and rejects denied/missing/dual sources', async t => {
  const manifest = loadManifest();
  const media = manifest.fixtures.media;
  prerequisite(
    media &&
      ['readableForeignFileId', 'deniedFileId', 'missingFileId'].every(key =>
        uuid(media[key])
      ),
    'run-owned readable foreign, denied and reserved missing logical file IDs required'
  );
  const id = board(manifest, 'negative');
  const client = await mcp(manifest);
  t.after(() => client.close());
  const scene = source();
  scene.files = {};
  const sourceFiles = {
    'source-image': { fileID: media.readableForeignFileId },
  };
  const imported = success(
    await call(client, 'import_whiteboard_scene', {
      whiteboardId: id,
      scene,
      sourceFiles,
    })
  );
  const after = await readRoom(manifest, id);
  const image = after.elements.find(
    el => imported.addedElementIds.includes(el.id) && el.type === 'image'
  );
  assert.ok(image && uuid(after.files[image.fileId]));
  assert.notEqual(after.files[image.fileId], media.readableForeignFileId);
  for (const args of [
    { scene, sourceFiles: { 'source-image': { fileID: media.deniedFileId } } },
    { scene, sourceFiles: { 'source-image': { fileID: media.missingFileId } } },
    { scene: source(), sourceFiles },
    {
      scene,
      sourceFiles: {
        ...sourceFiles,
        unreferenced: { fileID: media.readableForeignFileId },
      },
    },
  ]) {
    const before = await readRoom(manifest, id);
    assert.equal(
      (
        await call(client, 'import_whiteboard_scene', {
          whiteboardId: id,
          ...args,
        })
      ).error,
      true
    );
    same(await readRoom(manifest, id), before);
  }
});

test('US2-AS1/AS2/AS3: canonical text geometry and elements projection over MCP', async t => {
  const manifest = loadManifest();
  const id = board(manifest, 'text');
  const client = await mcp(manifest);
  t.after(() => client.close());
  const definition = (await client.listTools()).tools.find(
    tool => tool.name === 'edit_whiteboard_elements'
  );
  const textSchema =
    definition.inputSchema.properties.operations.items.oneOf.find(
      item => item.properties.op.const === 'addText'
    );
  assert.ok(!Object.hasOwn(textSchema.properties, 'height'));
  assert.ok(Object.hasOwn(textSchema.properties, 'width'));
  const text =
    'A useful workflow explanation wraps without shrinking the requested font size';
  const result = success(
    await call(client, 'edit_whiteboard_elements', {
      whiteboardId: id,
      operations: [
        { op: 'addText', text: 'natural', fontSize: 24 },
        { op: 'addShape', shape: 'rectangle', label: 'Review' },
        { op: 'addText', text, fontSize: 24, width: 100 },
      ],
    })
  );
  const persisted = await readRoom(manifest, id);
  const texts = persisted.elements.filter(el => el.type === 'text');
  assert.ok(texts.every(el => el.width > 0 && el.height > 0));
  const wrapped = texts.find(el => el.originalText === text);
  assert.equal(wrapped.fontSize, 24);
  assert.equal(wrapped.autoResize, false);
  assert.equal(wrapped.width, 100);
  assert.ok(wrapped.height > 24 && wrapped.text.includes('\n'));
  const natural = texts.find(el => el.originalText === 'natural');
  success(
    await call(client, 'edit_whiteboard_elements', {
      whiteboardId: id,
      operations: [
        {
          op: 'setText',
          elementId: natural.id,
          text: 'a much longer natural text value',
        },
      ],
    })
  );
  assert.ok(
    (await readRoom(manifest, id)).elements.find(el => el.id === natural.id)
      .width > natural.width
  );
  const projection = await call(client, 'analyze_whiteboard', {
    whiteboardId: id,
    analysisType: 'elements',
  });
  assert.equal(projection.error, false);
  for (const el of texts) {
    const actual = projection.data.elements.find(item => item.id === el.id);
    assert.equal(actual.fontSize, el.fontSize);
    assert.equal(actual.containerId, el.containerId ?? null);
  }
  assert.ok(result.addedElementIds.length >= 3);
});

test('US3-AS4: disabled API executor is unavailable while real authorization remains denied', async t => {
  const manifest = loadManifest();
  prerequisite(
    manifest.fixtures.disabledApiMcp === true,
    'ordinary API must expose MCP with executor explicitly disabled for this check'
  );
  const id = board(manifest, 'negative');
  const client = await mcp(manifest, 'author', 'api');
  const denied = await mcp(manifest, 'denied');
  t.after(async () => {
    await client.close();
    await denied.close();
  });
  const before = await readRoom(manifest, id);
  const args = { whiteboardId: id, scene: source() };
  const disabled = await call(client, 'import_whiteboard_scene', args);
  assert.equal(disabled.error, true);
  assert.equal(disabled.data.outcome, 'unavailable');
  assert.equal(
    (await call(denied, 'import_whiteboard_scene', args)).data.outcome,
    'forbidden'
  );
  same(await readRoom(manifest, id), before);
});

test('US3-AS1/AS2/AS3: actual creation, two-space contributions and loaded search profiles', async t => {
  const manifest = loadManifest();
  prerequisite(
    manifest.fixtures.domain,
    'ordinary API-created callout/template/two-space/search fixtures required'
  );
  const fixtures = manifest.fixtures.domain;
  prerequisite(
    fixtures.visibleContributionIds?.length &&
      fixtures.otherSpaceContributionIds?.length &&
      fixtures.searchMatches?.length,
    'nonempty discriminating cross-space and search profile fixtures required'
  );
  const client = await mcp(manifest);
  const denied = await mcp(manifest, 'denied');
  t.after(async () => {
    await client.close();
    await denied.close();
  });
  for (const [name, args] of [
    [
      'create_whiteboard',
      { calloutId: fixtures.calloutId, displayName: `Blank ${manifest.runId}` },
    ],
    [
      'create_whiteboard',
      {
        calloutId: fixtures.calloutId,
        fromTemplateId: fixtures.templateId,
        displayName: `Template ${manifest.runId}`,
      },
    ],
    [
      'create_whiteboard_in_space',
      { spaceId: fixtures.spaceId, displayName: `Space ${manifest.runId}` },
    ],
  ]) {
    const result = await call(client, name, args);
    assert.equal(result.error, false);
    assert.equal(result.data.created, true);
    assert.ok(result.data.whiteboard?.id);
    assert.equal(
      (await call(client, name, { ...args, content: '{}' })).error,
      true
    );
  }
  for (const actor of [client, denied]) {
    const result = await call(actor, 'analyze_contributions', {
      scope: `space:${fixtures.spaceId}`,
      analysisType: 'content',
      limit: 50,
    });
    assert.equal(result.error, false);
    const ids = result.data.contributions.map(item => item.id);
    for (const id of fixtures.otherSpaceContributionIds)
      assert.ok(!ids.includes(id));
    if (actor === client)
      for (const id of fixtures.visibleContributionIds)
        assert.ok(ids.includes(id));
    else
      for (const id of fixtures.visibleContributionIds)
        assert.ok(!ids.includes(id));
  }
  const result = await call(client, 'search_content', {
    query: fixtures.searchQuery,
  });
  assert.equal(result.error, false);
  for (const expected of fixtures.searchMatches)
    assert.equal(
      result.data.matches.find(item => item.id === expected.id)?.displayName,
      expected.displayName
    );
  const protectedSearch = await call(denied, 'search_content', {
    query: fixtures.searchQuery,
  });
  assert.equal(protectedSearch.error, false);
  for (const expected of fixtures.searchMatches.filter(item => item.private))
    assert.ok(
      !protectedSearch.data.matches.some(item => item.id === expected.id)
    );
});
