import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { createJsonBodyParserMiddleware } from '@core/middleware/json-body-parser.middleware';
import { vi } from 'vitest';
import { WhiteboardExecutorParent } from '../executor/whiteboard-executor.parent';
import { ImportWhiteboardSceneTool } from './import-whiteboard-scene.tool';

function setup(allowed = true) {
  const actor = Object.assign(new ActorContext(), { actorID: randomUUID() });
  const bucket = randomUUID();
  const scene = {
    type: 'excalidraw',
    version: 2,
    source: 'editor',
    elements: [{ type: 'image', fileId: 'asset' }],
    files: {
      asset: {
        id: 'asset',
        mimeType: 'image/png',
        dataURL: 'data:image/png;base64,YQ==',
      },
    },
  };
  const args = { whiteboardId: randomUUID(), scene };
  const board = {
    getWhiteboardOrFail: vi.fn().mockResolvedValue({
      authorization: {},
      profile: { storageBucket: { id: bucket } },
    }),
    materializeImportAssetsIntoBucket: vi
      .fn()
      .mockResolvedValue({ targetFileIDs: { asset: randomUUID() } }),
    deleteMaterializedContentDocuments: vi.fn().mockResolvedValue(undefined),
  };
  const auth = { isAccessGranted: vi.fn().mockReturnValue(allowed) };
  const executor = {
    execute: vi.fn().mockResolvedValue({ outcome: 'unavailable' }),
  };
  const tool = new ImportWhiteboardSceneTool(
    board as any,
    auth as any,
    executor as any
  );
  return { tool, args, actor, board, auth, executor, bucket };
}

describe('scene import public boundary', () => {
  it('the actual default-disabled execution owner performs no materialization or launch', async () => {
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_ENABLED', 'false');
    try {
      const h = setup();
      const executor = new WhiteboardExecutorParent(
        {} as any,
        { log: vi.fn() } as any
      );
      const launch = vi.spyOn(executor as any, 'launch');
      const tool = new ImportWhiteboardSceneTool(
        h.board as any,
        h.auth as any,
        executor
      );
      const result = await tool.execute(h.args, h.actor);
      expect(JSON.parse(result.content[0].text!)).toEqual({
        outcome: 'unavailable',
      });
      expect(h.board.materializeImportAssetsIntoBucket).not.toHaveBeenCalled();
      expect(launch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it.each([
    false,
    true,
  ])('enforces complete decoded envelope bytes before tool execution (gzip=%s)', async gzip => {
    for (const length of [262144, 262145]) {
      const h = setup();
      const envelope = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'import_whiteboard_scene', arguments: h.args },
      };
      const initial = JSON.stringify(envelope);
      h.args.scene.source += 'x'.repeat(length - Buffer.byteLength(initial));
      const body = Buffer.from(JSON.stringify(envelope));
      expect(body.length).toBe(length);
      const encoded = gzip ? gzipSync(body) : body;
      const req = Object.assign(Readable.from([encoded]), {
        path: '/rest/mcp',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(encoded.length),
          ...(gzip ? { 'content-encoding': 'gzip' } : {}),
        },
      });
      const error = await new Promise<any>(resolve =>
        createJsonBodyParserMiddleware('1mb')(req as any, {} as any, resolve)
      );
      if (length === 262145) {
        expect(error.getStatus()).toBe(413);
        expect(h.executor.execute).not.toHaveBeenCalled();
        expect(
          h.board.materializeImportAssetsIntoBucket
        ).not.toHaveBeenCalled();
      } else {
        expect(error).toBeUndefined();
        const parsed = (req as any).body;
        await h.tool.execute(parsed.params.arguments, h.actor);
        expect(h.executor.execute).toHaveBeenCalledOnce();
      }
    }
  });
  it.each([
    'mode',
    'replace',
    'content',
    'targetFileIDs',
    'url',
  ])('rejects unknown %s before lookup or execution', async key => {
    const h = setup();
    const result = await h.tool.execute(
      { ...h.args, [key]: 'unexpected' },
      h.actor
    );
    expect(result.isError).toBe(true);
    expect(h.board.getWhiteboardOrFail).not.toHaveBeenCalled();
    expect(h.executor.execute).not.toHaveBeenCalled();
  });
  it.each([
    null,
    'encoded scene',
    {},
    { type: 'excalidraw', version: 3, elements: [{}] },
    { type: 'excalidraw', version: 2, elements: [] },
    {
      type: 'excalidraw',
      version: 2,
      elements: [{ type: 'rectangle', isDeleted: true }],
    },
  ])('rejects malformed/empty scene before admission: %j', async scene => {
    const h = setup();
    await h.tool.execute({ ...h.args, scene }, h.actor);
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(h.board.materializeImportAssetsIntoBucket).not.toHaveBeenCalled();
  });
  it('requires the resolved actor UPDATE_CONTENT before admission or media work', async () => {
    const h = setup(false);
    const result = await h.tool.execute(h.args, h.actor);
    expect(h.auth.isAccessGranted).toHaveBeenCalledWith(
      h.actor,
      {},
      AuthorizationPrivilege.UPDATE_CONTENT
    );
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'forbidden',
    });
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(h.board.materializeImportAssetsIntoBucket).not.toHaveBeenCalled();
  });
  it('keeps media lazy under the executor, strips bytes/source locators, and reports disabled without success', async () => {
    const h = setup();
    const result = await h.tool.execute(h.args, h.actor);
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'unavailable',
    });
    expect(h.board.materializeImportAssetsIntoBucket).not.toHaveBeenCalled();
    const [id, actor, payload, , callbacks] = h.executor.execute.mock.calls[0];
    expect([id, actor]).toEqual([h.args.whiteboardId, h.actor.actorID]);
    expect(payload.import.scene).toEqual({
      type: 'excalidraw',
      version: 2,
      source: 'editor',
      elements: h.args.scene.elements,
    });
    const context = {
      signal: new AbortController().signal,
      deadlineAt: Date.now() + 1000,
    };
    const prepared = await callbacks.prepare(context);
    expect(
      h.board.materializeImportAssetsIntoBucket
    ).toHaveBeenCalledExactlyOnceWith(
      h.args.scene,
      h.bucket,
      {},
      { ...context, actorContext: h.actor }
    );
    expect(prepared).toEqual({
      scene: payload.import.scene,
      targetFileIDs:
        h.board.materializeImportAssetsIntoBucket.mock.results[0].value &&
        (await h.board.materializeImportAssetsIntoBucket.mock.results[0].value)
          .targetFileIDs,
    });
    expect(JSON.stringify(prepared)).not.toContain('data:');
    expect(Object.keys(callbacks)).toEqual(['prepare']);
    expect(h.board.deleteMaterializedContentDocuments).not.toHaveBeenCalled();
  });
  it('returns only the durable public metadata', async () => {
    const h = setup();
    h.executor.execute.mockResolvedValue({
      outcome: 'durable-success',
      result: {
        addedElementIds: ['fresh'],
        summary: [{ op: 'importScene', elementIds: ['fresh'] }],
      },
    } as any);
    const result = await h.tool.execute(h.args, h.actor);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'durable-success',
      whiteboardId: h.args.whiteboardId,
      addedElementIds: ['fresh'],
      summary: [{ op: 'importScene', elementIds: ['fresh'] }],
    });
  });
  it('retains a shared target binding when the actual parent fails before GO', async () => {
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_ENABLED', 'true');
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN', '4');
    vi.stubEnv(
      'MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR',
      '1'
    );
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_HEAP_MB', '256');
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_DEADLINE_MS', '10000');
    const executor = new WhiteboardExecutorParent(
      {} as any,
      { log: vi.fn() } as any
    );
    const launch = vi
      .spyOn(executor as any, 'launch')
      .mockImplementation(() => {
        throw new Error('child launch failed');
      });
    try {
      const h = setup();
      const shared = randomUUID();
      h.board.materializeImportAssetsIntoBucket.mockResolvedValue({
        targetFileIDs: { asset: shared },
      });
      const tool = new ImportWhiteboardSceneTool(
        h.board as any,
        h.auth as any,
        executor
      );
      const result = await tool.execute(h.args, h.actor);
      expect(JSON.parse(result.content[0].text!)).toEqual({
        outcome: 'resource-exhausted-before-go',
      });
      expect(h.board.materializeImportAssetsIntoBucket).toHaveBeenCalledOnce();
      expect(launch).toHaveBeenCalledOnce();
      expect(h.board.deleteMaterializedContentDocuments).not.toHaveBeenCalled();
    } finally {
      executor.onModuleDestroy();
      launch.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
