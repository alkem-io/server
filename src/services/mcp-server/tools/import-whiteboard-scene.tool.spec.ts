import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { createJsonBodyParserMiddleware } from '@core/middleware/json-body-parser.middleware';
import { StorageServiceUnavailableException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import {
  grantAccessRefusal,
  policyGranting,
  realAuthorizationService,
  testActor,
} from '@test/utils/authorization.refusal';
import { vi } from 'vitest';
import { WhiteboardExecutorParent } from '../executor/whiteboard-executor.parent';
import { ImportWhiteboardSceneTool } from './import-whiteboard-scene.tool';

function setup(allowed = true) {
  const actor = testActor();
  const bucket = randomUUID();
  const policy = policyGranting(
    allowed ? [AuthorizationPrivilege.UPDATE_CONTENT] : []
  );
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
      authorization: policy,
      profile: { storageBucket: { id: bucket } },
    }),
    materializeImportAssetsIntoBucket: vi
      .fn()
      .mockResolvedValue({ targetFileIDs: { asset: randomUUID() } }),
    deleteMaterializedContentDocuments: vi.fn().mockResolvedValue(undefined),
  };
  const auth = realAuthorizationService();
  vi.spyOn(auth, 'grantAccessOrFail');
  const executor = {
    execute: vi.fn().mockResolvedValue({ outcome: 'unavailable' }),
  };
  const logger = { error: vi.fn(), warn: vi.fn(), verbose: vi.fn() };
  const tool = new ImportWhiteboardSceneTool(
    board as any,
    auth,
    executor as any,
    logger as any
  );
  return { tool, args, actor, board, auth, executor, bucket, logger, policy };
}

const outcomeOf = (result: { content: Array<{ text?: string }> }) =>
  JSON.parse(result.content[0].text!);

describe('scene import target that is missing or refused', () => {
  it('answers a missing board with forbidden and its errorId, and logs which it was', async () => {
    const h = setup();
    const missing = new EntityNotFoundException(
      'Whiteboard not found',
      LogContext.COLLABORATION
    );
    h.board.getWhiteboardOrFail.mockRejectedValue(missing);

    const result = await h.tool.execute(h.args, h.actor);

    expect(outcomeOf(result)).toEqual({
      outcome: 'forbidden',
      errorId: missing.errorId,
    });
    expect(h.logger.error).toHaveBeenCalledOnce();
    expect(h.logger.error.mock.calls[0][0]).toEqual({
      errorId: missing.errorId,
      exceptionName: 'EntityNotFoundException',
      code: 'ENTITY_NOT_FOUND',
      operation: 'import_whiteboard_scene',
      actorID: h.actor.actorID,
    });
    expect(h.executor.execute).not.toHaveBeenCalled();
  });

  it('answers a refused board the same way, with privilege and policy in the log', async () => {
    const h = setup(false);

    const result = await h.tool.execute(h.args, h.actor);

    const outcome = outcomeOf(result);
    expect(outcome).toEqual({
      outcome: 'forbidden',
      errorId: expect.any(String),
    });
    expect(h.logger.error).toHaveBeenCalledOnce();
    expect(h.logger.error.mock.calls[0][0]).toEqual({
      errorId: outcome.errorId,
      exceptionName: 'ForbiddenAuthorizationPolicyException',
      code: 'FORBIDDEN_POLICY',
      privilege: AuthorizationPrivilege.UPDATE_CONTENT,
      policyId: h.policy.id,
      operation: 'import_whiteboard_scene',
      actorID: h.actor.actorID,
    });
  });

  it('lets a storage failure while loading the board propagate', async () => {
    const h = setup();
    const failure = new Error('db down');
    h.board.getWhiteboardOrFail.mockRejectedValue(failure);

    await expect(h.tool.execute(h.args, h.actor)).rejects.toBe(failure);
    expect(h.logger.error).not.toHaveBeenCalled();
  });

  it('answers a board with no policy with forbidden', async () => {
    const h = setup();
    h.board.getWhiteboardOrFail.mockResolvedValue({
      authorization: undefined,
      profile: { storageBucket: { id: h.bucket } },
    });

    const result = await h.tool.execute(h.args, h.actor);

    expect(outcomeOf(result)).toEqual({
      outcome: 'forbidden',
      errorId: expect.any(String),
    });
  });

  it('keeps invalid and unauthorized without an errorId', async () => {
    const h = setup();

    const invalid = await h.tool.execute({ ...h.args, scene: {} }, h.actor);
    const unauthorized = await h.tool.execute(
      h.args,
      Object.assign(new ActorContext(), { actorID: 'not-a-uuid' })
    );

    expect(outcomeOf(invalid)).toEqual({ outcome: 'invalid' });
    expect(outcomeOf(unauthorized)).toEqual({ outcome: 'unauthorized' });
    expect(h.logger.error).not.toHaveBeenCalled();
  });
});

describe('scene import sources that are missing or refused', () => {
  const run = async (
    failure: (abort: () => void) => Promise<never>,
    abortable = false
  ) => {
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_ENABLED', 'true');
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN', '4');
    vi.stubEnv(
      'MCP_WHITEBOARD_EXECUTOR_MAX_CONCURRENT_CHILDREN_PER_ACTOR',
      '1'
    );
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_HEAP_MB', '256');
    vi.stubEnv('MCP_WHITEBOARD_EXECUTOR_DEADLINE_MS', '10000');
    const executorLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
    const executor = new WhiteboardExecutorParent(
      {} as any,
      executorLogger as any
    );
    const launch = vi
      .spyOn(executor as any, 'launch')
      .mockImplementation(() => {
        throw new Error('child launch failed');
      });
    try {
      const h = setup();
      const controller = new AbortController();
      h.board.materializeImportAssetsIntoBucket.mockImplementation(() =>
        failure(() => controller.abort())
      );
      const tool = new ImportWhiteboardSceneTool(
        h.board as any,
        h.auth,
        executor,
        h.logger as any
      );
      const args = {
        ...h.args,
        sourceFiles: { asset: { fileID: randomUUID() } },
      };
      const first = outcomeOf(
        await tool.execute(
          args,
          h.actor,
          abortable ? controller.signal : undefined
        )
      );
      // Entries written for the first call only.
      const loud = [
        ...executorLogger.error.mock.calls,
        ...executorLogger.warn.mock.calls,
      ].map(call => call[0]);
      const second = outcomeOf(await tool.execute(args, h.actor));
      return { first, second, actor: h.actor, loud, launch };
    } finally {
      executor.onModuleDestroy();
      launch.mockRestore();
      vi.unstubAllEnvs();
    }
  };

  it('answers a refused source with forbidden, its errorId and one log entry', async () => {
    const policy = policyGranting([]);
    const refusal = grantAccessRefusal(
      AuthorizationPrivilege.READ,
      'read whiteboard import image source',
      testActor(),
      policy
    );

    const r = await run(async () => {
      throw refusal;
    });

    expect(r.first).toEqual({ outcome: 'forbidden', errorId: refusal.errorId });
    expect(r.loud).toEqual([
      {
        errorId: refusal.errorId,
        exceptionName: 'ForbiddenAuthorizationPolicyException',
        code: 'FORBIDDEN_POLICY',
        privilege: AuthorizationPrivilege.READ,
        policyId: policy.id,
        operation: 'import whiteboard scene: sources',
        actorID: r.actor.actorID,
      },
    ]);
    expect(r.second.outcome).not.toBe('busy');
    expect(r.launch).not.toHaveBeenCalled();
  });

  it('answers a missing source like a refused one', async () => {
    const missing = new EntityNotFoundException(
      'Document not found',
      LogContext.COLLABORATION
    );

    const r = await run(async () => {
      throw missing;
    });

    expect(r.first).toEqual({ outcome: 'forbidden', errorId: missing.errorId });
    expect(r.loud).toHaveLength(1);
    expect(r.loud[0]).toEqual({
      errorId: missing.errorId,
      exceptionName: 'EntityNotFoundException',
      code: 'ENTITY_NOT_FOUND',
      operation: 'import whiteboard scene: sources',
      actorID: r.actor.actorID,
    });
    expect(r.second.outcome).not.toBe('busy');
    expect(r.launch).not.toHaveBeenCalled();
  });

  it.each([
    [
      'invalid',
      () => new ValidationException('bad source', LogContext.COLLABORATION),
    ],
    ['unavailable', () => new StorageServiceUnavailableException('down')],
  ])('keeps %s without an errorId or a log entry', async (expected, make) => {
    const r = await run(async () => {
      throw make();
    });

    expect(r.first).toEqual({ outcome: expected });
    expect(r.loud).toEqual([]);
    expect(r.second.outcome).not.toBe('busy');
    expect(r.launch).not.toHaveBeenCalled();
  });

  it('keeps a cancellation that lands before the refusal', async () => {
    const r = await run(async abort => {
      abort();
      throw grantAccessRefusal(AuthorizationPrivilege.READ);
    }, true);

    expect(r.first).toEqual({ outcome: 'cancelled-before-go' });
    expect(r.loud).toEqual([]);
    expect(r.second.outcome).not.toBe('busy');
    expect(r.launch).not.toHaveBeenCalled();
  });
});

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
        executor,
        h.logger as any
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
    expect(h.auth.grantAccessOrFail).toHaveBeenCalledWith(
      h.actor,
      h.policy,
      AuthorizationPrivilege.UPDATE_CONTENT,
      'import whiteboard scene'
    );
    expect(JSON.parse(result.content[0].text!)).toEqual({
      outcome: 'forbidden',
      errorId: expect.any(String),
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
        executor,
        h.logger as any
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
