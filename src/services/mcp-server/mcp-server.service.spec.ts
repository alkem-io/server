import { EventEmitter } from 'node:events';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutAllowedActors } from '@common/enums/callout.allowed.contributors';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { NEUTRAL_ERROR_MESSAGE } from '@core/error-handling/public.error.result';
import { CalloutResolverMutations } from '@domain/collaboration/callout/callout.resolver.mutations';
import { CalloutsSetResolverMutations } from '@domain/collaboration/callouts-set/callouts.set.resolver.mutations';
import {
  policyGranting,
  realAuthorizationService,
  testActor,
} from '@test/utils/authorization.refusal';
import { QueryFailedError } from 'typeorm';
import { vi } from 'vitest';
import { AssistantCapabilityGateService } from './capabilities/assistant.capability.gate.service';
import { MCP_CONSTANTS } from './dto/mcp.types';
import { McpServerService } from './mcp-server.service';
import { CalloutResourceProvider } from './resources/callout.resource';
import { ResourceRegistry } from './resources/resource.registry';
import { ContributionsAnalyzeTool } from './tools/contributions-analyze.tool';
import { CreateWhiteboardTool } from './tools/create-whiteboard.tool';
import { CreateWhiteboardInSpaceTool } from './tools/create-whiteboard-in-space.tool';
import { EditWhiteboardElementsTool } from './tools/edit-whiteboard-elements.tool';
import { ImportWhiteboardSceneTool } from './tools/import-whiteboard-scene.tool';
import { TemplateNavigatorTool } from './tools/template-navigator.tool';
import { ToolRegistry } from './tools/tool.registry';

describe('McpServerService registered tool schema rejection', () => {
  it('returns typed invalid for whiteboard execution tools before dispatch', async () => {
    const whiteboard = { getWhiteboardOrFail: vi.fn() };
    const executor = { execute: vi.fn() };
    const edit = new EditWhiteboardElementsTool(
      whiteboard as any,
      {} as any,
      executor as any,
      {} as any
    );
    const editExecute = vi.spyOn(edit, 'execute');
    const importer = new ImportWhiteboardSceneTool(
      whiteboard as any,
      {} as any,
      executor as any,
      {} as any
    );
    const importExecute = vi.spyOn(importer, 'execute');
    const other = {
      getDefinition: () => ({
        name: 'other_tool',
        description: 'Schema rejection control',
        inputSchema: {
          type: 'object' as const,
          properties: { requiredValue: { type: 'string' } },
          required: ['requiredValue'],
        },
      }),
      execute: vi.fn(),
    };
    const logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };
    const gate = { checkToolAllowed: vi.fn() };
    const service = new McpServerService(
      {} as any,
      new ToolRegistry([edit, importer, other], logger),
      {} as any,
      {} as any,
      gate as any,
      logger as any,
      {} as any
    );
    const server = (service as any).createMcpServer(
      () => new ActorContext(),
      () => [{ operations: ['tools'] }]
    );
    const handler = server.server._requestHandlers.get('tools/call');
    const call = (name: string, args: object) =>
      handler(
        { method: 'tools/call', params: { name, arguments: args } },
        { signal: new AbortController().signal }
      );
    const rejected = await call('edit_whiteboard_elements', {
      whiteboardId: '22222222-2222-4222-8222-222222222222',
      operations: [{ op: 'setText' }],
    });
    expect(rejected.isError).toBe(true);
    expect(rejected.content[0].text).toBe(
      JSON.stringify({ outcome: 'invalid' })
    );
    const invalidImport = await call('import_whiteboard_scene', {
      whiteboardId: '22222222-2222-4222-8222-222222222222',
      scene: {},
      mode: 'replace',
    });
    expect(invalidImport.content[0].text).toBe(
      JSON.stringify({ outcome: 'invalid' })
    );
    expect(importExecute).not.toHaveBeenCalled();
    const unrelated = await call('other_tool', {});
    expect(unrelated.isError).toBe(true);
    expect(unrelated.content[0].text).toMatch(
      /^Invalid arguments for tool 'other_tool':/
    );
    expect(editExecute).not.toHaveBeenCalled();
    expect(other.execute).not.toHaveBeenCalled();
    expect(whiteboard.getWhiteboardOrFail).not.toHaveBeenCalled();
    expect(executor.execute).not.toHaveBeenCalled();
    expect(gate.checkToolAllowed).not.toHaveBeenCalled();
  });
});

describe('McpServerService HTTP caller cancellation', () => {
  it('propagates response disconnect through actual SDK tool dispatch', async () => {
    const execute = vi.fn(async (_args, _actor, signal: AbortSignal) => {
      await new Promise<void>(resolve =>
        signal.addEventListener('abort', () => resolve(), { once: true })
      );
      return { content: [{ type: 'text', text: 'cancelled' }] };
    });
    const tool = {
      execute,
      getDefinition: () => ({
        name: 'edit_whiteboard_elements',
        inputSchema: { type: 'object', properties: {} },
      }),
    };
    const service = new McpServerService(
      {} as any,
      { getTool: () => tool } as any,
      {} as any,
      {} as any,
      { checkToolAllowed: async () => null } as any,
      { verbose: vi.fn() } as any,
      {} as any
    );
    const server = (service as any).createMcpServer(
      () => new ActorContext(),
      () => [{ operations: ['tools'] }]
    );
    const handler = server.server._requestHandlers.get('tools/call');
    const req = new EventEmitter();
    const res = Object.assign(new EventEmitter(), { writableFinished: false });
    const transport = {
      handleRequest: () =>
        handler(
          {
            method: 'tools/call',
            params: { name: 'edit_whiteboard_elements', arguments: {} },
          },
          { signal: new AbortController().signal }
        ),
    };
    const pending = (service as any).handleTransport(transport, req, res);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledOnce());
    const signal = execute.mock.calls[0][2];
    expect(signal.aborted).toBe(false);
    res.emit('close');
    await pending;
    expect(signal.aborted).toBe(true);
    expect(req.listenerCount('aborted')).toBe(0);
    expect(res.listenerCount('close')).toBe(0);
  });
});

/**
 * Guards the resource-read authorization gate (R1): the MCP resource surface
 * must enforce the entity's read policy before returning content, not just the
 * API-key scope.
 */
describe('McpServerService.readResource — authorization', () => {
  const uri = 'alkemio://whiteboards/wb-1';

  const setup = (opts: { noProvider?: boolean; granted?: boolean } = {}) => {
    const policy = policyGranting(
      opts.granted === false ? [] : [AuthorizationPrivilege.READ]
    );
    const provider = {
      getResourceDefinitions: () => [],
      matches: () => true,
      getAuthorizationPolicy: vi.fn().mockResolvedValue(policy),
      read: vi.fn().mockResolvedValue({
        contents: [{ uri, mimeType: 'application/json', text: '{"ok":true}' }],
      }),
    };
    const resourceRegistry = {
      getProvider: vi
        .fn()
        .mockReturnValue(opts.noProvider ? undefined : provider),
    };
    const authorizationService = realAuthorizationService();
    vi.spyOn(authorizationService, 'grantAccessOrFail');
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    const capabilityGateService = {
      checkToolAllowed: vi.fn().mockResolvedValue(null),
    };
    const service = new McpServerService(
      {} as any,
      {} as any,
      resourceRegistry as any,
      authorizationService as any,
      capabilityGateService as any,
      logger as any,
      {} as any
    );
    return { service, provider, authorizationService, logger, policy };
  };

  it('throws "Resource not found" when no provider matches the URI', async () => {
    const { service } = setup({ noProvider: true });
    await expect(service.readResource(uri, testActor())).rejects.toThrow(
      /Resource not found/
    );
  });

  it('refuses the read when READ access is not granted, and never calls read()', async () => {
    const { service, provider, logger } = setup({ granted: false });
    await expect(service.readResource(uri, testActor())).rejects.toThrow(
      /^\[FORBIDDEN_POLICY\] /
    );
    expect(provider.read).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('checks READ on the provider policy and returns content when granted', async () => {
    const { service, provider, authorizationService, policy } = setup({
      granted: true,
    });
    const actor = testActor();
    const result = await service.readResource(uri, actor);
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      policy,
      AuthorizationPrivilege.READ,
      'read MCP resource'
    );
    expect(provider.read).toHaveBeenCalledWith(uri, actor);
    expect(result.contents[0].text).toBe('{"ok":true}');
  });
});

const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MCP_TEXT = new RegExp(`^\\[([A-Z_]+)\\] (.+) errorId=(${UUID_PATTERN})$`);
const NEUTRAL_TEXT = new RegExp(
  `^\\[FORBIDDEN_POLICY\\] ${NEUTRAL_ERROR_MESSAGE.replace(/\./g, '\\.')} errorId=(${UUID_PATTERN})$`
);
const UNSPECIFIED_TEXT = new RegExp(
  `^\\[UNSPECIFIED\\] Internal Server Error errorId=(${UUID_PATTERN})$`
);

const makeLogger = () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
});
type TestLogger = ReturnType<typeof makeLogger>;

/** Every argument of every error and warn call, serialized. */
const loudLogText = (logger: TestLogger) =>
  JSON.stringify([...logger.error.mock.calls, ...logger.warn.mock.calls]);

/** The error/warn entries that carry the given errorId. */
const entriesFor = (logger: TestLogger, errorId: string) =>
  [...logger.error.mock.calls, ...logger.warn.mock.calls]
    .map(call => call[0])
    .filter(entry => entry?.errorId === errorId);

const errorIdOf = (text: string) => {
  const match = MCP_TEXT.exec(text);
  expect(match).not.toBeNull();
  return match![3];
};

const withoutErrorId = (text: string) => text.replace(/errorId=\S+$/, '');

const buildService = (opts: {
  logger: TestLogger;
  tools?: any[];
  providers?: any[];
  gate?: any;
}) =>
  new McpServerService(
    {} as any,
    new ToolRegistry(opts.tools ?? [], opts.logger),
    new ResourceRegistry(opts.providers ?? [], opts.logger as any),
    realAuthorizationService(),
    opts.gate ?? { checkToolAllowed: vi.fn().mockResolvedValue(null) },
    opts.logger as any,
    {} as any
  );

const toolCaller = (
  service: McpServerService,
  actor: ActorContext,
  scopes: unknown = [{ operations: ['tools', 'read'] }]
) => {
  const server = (service as any).createMcpServer(
    () => actor,
    () => scopes
  );
  const handler = server.server._requestHandlers.get('tools/call');
  return (name: string, args: object) =>
    handler(
      { method: 'tools/call', params: { name, arguments: args } },
      { signal: new AbortController().signal }
    );
};

const onlyText = (result: any): string => {
  expect(result.isError).toBe(true);
  expect(result.content).toHaveLength(1);
  return result.content[0].text;
};

const queryFailed = () =>
  new QueryFailedError('SELECT 1 WHERE "id" = $1', ['ARG-MARKER'], {
    message: 'invalid input syntax for type uuid: "ARG-MARKER"',
  });

class TestResourceProvider {
  constructor(
    readonly getAuthorizationPolicy: (uri: string) => Promise<unknown>,
    readonly read: (uri: string) => Promise<unknown>
  ) {}
  getResourceDefinitions() {
    return [];
  }
  matches() {
    return true;
  }
}

const failingTool = (error: unknown) => ({
  getDefinition: () => ({
    name: 'failing_tool',
    description: 'Throws',
    inputSchema: {
      type: 'object' as const,
      properties: { marker: { type: 'string' } },
    },
  }),
  execute: vi.fn().mockRejectedValue(error),
});

describe('McpServerService — failure answers', () => {
  const originalDebug = process.env.ERROR_RESPONSE_DEBUG;
  afterEach(() => {
    if (originalDebug === undefined) {
      delete process.env.ERROR_RESPONSE_DEBUG;
    } else {
      process.env.ERROR_RESPONSE_DEBUG = originalDebug;
    }
  });

  describe('tools/call', () => {
    it('answers a thrown error with the unspecified text and logs its entry', async () => {
      delete process.env.ERROR_RESPONSE_DEBUG;
      const logger = makeLogger();
      const tool = failingTool(new Error('boom'));
      const actor = testActor();
      const call = toolCaller(buildService({ logger, tools: [tool] }), actor);

      const text = onlyText(
        await call('failing_tool', { marker: 'ARG-MARKER' })
      );

      expect(text).toMatch(UNSPECIFIED_TEXT);
      expect(text).not.toContain('boom');
      const errorId = errorIdOf(text);
      expect(entriesFor(logger, errorId)).toEqual([
        {
          errorId,
          exceptionName: 'Error',
          operation: 'failing_tool',
          actorID: actor.actorID,
        },
      ]);
      expect(loudLogText(logger)).not.toContain('boom');
      expect(loudLogText(logger)).not.toContain('ARG-MARKER');
    });

    it('appends the original message when the switch is on', async () => {
      process.env.ERROR_RESPONSE_DEBUG = 'true';
      const logger = makeLogger();
      const call = toolCaller(
        buildService({ logger, tools: [failingTool(new Error('boom'))] }),
        testActor()
      );

      const text = onlyText(await call('failing_tool', {}));

      expect(text).toMatch(
        new RegExp(
          `^\\[UNSPECIFIED\\] Internal Server Error errorId=${UUID_PATTERN} detail=boom$`
        )
      );
    });

    it('answers a failure of the capability gate like a failure in the tool', async () => {
      delete process.env.ERROR_RESPONSE_DEBUG;
      const logger = makeLogger();
      const tool = failingTool(new Error('never'));
      const gate = new AssistantCapabilityGateService(
        { findOne: vi.fn().mockRejectedValue(new Error('db down')) } as any,
        {} as any,
        logger as any
      );
      const actor = testActor();
      actor.delegationContext = {
        assistantActorId: 'assistant-1',
        onBehalfOfUserId: actor.actorID,
      };
      const call = toolCaller(
        buildService({ logger, tools: [tool], gate }),
        actor
      );

      const text = onlyText(await call('failing_tool', {}));

      expect(text).toMatch(UNSPECIFIED_TEXT);
      const errorId = errorIdOf(text);
      expect(entriesFor(logger, errorId)).toHaveLength(1);
      expect(loudLogText(logger)).not.toContain('db down');
      expect(tool.execute).not.toHaveBeenCalled();
    });

    it('keeps the gate refusal, argument and scope answers as they are', async () => {
      const logger = makeLogger();
      const tool = failingTool(new Error('never'));
      const refusingGate = {
        checkToolAllowed: vi.fn().mockResolvedValue('capability_disabled'),
      };
      const service = buildService({
        logger,
        tools: [tool],
        gate: refusingGate,
      });

      const refused = await toolCaller(service, testActor())(
        'failing_tool',
        {}
      );
      expect(refused).toEqual({
        content: [{ type: 'text', text: 'capability_disabled' }],
        isError: true,
      });

      const invalid = await toolCaller(service, testActor())('failing_tool', {
        marker: 42,
      });
      expect(onlyText(invalid)).toMatch(
        /^Invalid arguments for tool 'failing_tool':/
      );

      const outOfScope = await toolCaller(service, testActor(), [
        { operations: ['read'] },
      ])('failing_tool', {});
      expect(onlyText(outOfScope)).not.toContain('errorId');

      await expect(
        toolCaller(service, testActor())('no_such_tool', {})
      ).rejects.toThrow('Tool not found');
      expect(tool.execute).not.toHaveBeenCalled();
    });

    it('answers a database failure in create_whiteboard without the caller input', async () => {
      delete process.env.ERROR_RESPONSE_DEBUG;
      const logger = makeLogger();
      const tool = new CreateWhiteboardTool(
        {
          createContributionOnCallout: vi.fn().mockRejectedValue(queryFailed()),
        } as any,
        {} as any,
        {} as any,
        {} as any,
        realAuthorizationService(),
        logger as any
      );
      const actor = testActor();
      const call = toolCaller(buildService({ logger, tools: [tool] }), actor);

      const text = onlyText(
        await call('create_whiteboard', {
          calloutId: 'ARG-MARKER',
          displayName: 'Board',
        })
      );

      expect(text).toMatch(UNSPECIFIED_TEXT);
      const errorId = errorIdOf(text);
      const entries = entriesFor(logger, errorId);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        exceptionName: 'QueryFailedError',
        operation: 'create_whiteboard',
        actorID: actor.actorID,
      });
      expect(loudLogText(logger)).not.toContain('ARG-MARKER');
      expect(loudLogText(logger)).not.toContain('Board');
    });

    it('carries the code of a client-actionable refusal from create_whiteboard', async () => {
      delete process.env.ERROR_RESPONSE_DEBUG;
      const logger = makeLogger();
      const authorizationService = realAuthorizationService();
      const callout = {
        id: 'callout-1',
        calloutsSet: { id: 'set-1' },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.ADMINS,
          },
        },
        authorization: policyGranting([AuthorizationPrivilege.CONTRIBUTE]),
      };
      const calloutService = {
        getCalloutOrFail: vi.fn().mockResolvedValue(callout),
      };
      const collaborators: any[] = Array(23).fill({});
      collaborators[0] = logger;
      collaborators[6] = authorizationService;
      collaborators[8] = calloutService;
      const mutations = new (CalloutResolverMutations as any)(...collaborators);
      const tool = new CreateWhiteboardTool(
        mutations,
        {} as any,
        {} as any,
        {} as any,
        authorizationService,
        logger as any
      );
      const call = toolCaller(
        buildService({ logger, tools: [tool] }),
        testActor()
      );

      const text = onlyText(
        await call('create_whiteboard', {
          calloutId: 'callout-1',
          displayName: 'Board',
        })
      );

      expect(text).toMatch(
        new RegExp(
          `^\\[CALLOUT_CLOSED\\] Only admins are allowed to contribute to this Callout errorId=${UUID_PATTERN}$`
        )
      );
      const errorId = errorIdOf(text);
      expect(entriesFor(logger, errorId)).toEqual([
        expect.objectContaining({
          exceptionName: 'CalloutClosedException',
          code: 'CALLOUT_CLOSED',
        }),
      ]);
    });
  });

  describe('resources/read', () => {
    it('rejects a provider failure with the public text and logs its entry', async () => {
      delete process.env.ERROR_RESPONSE_DEBUG;
      for (const provider of [
        new TestResourceProvider(
          async () => policyGranting([AuthorizationPrivilege.READ]),
          async () => {
            throw new Error('boom');
          }
        ),
        new TestResourceProvider(
          async () => {
            throw new Error('boom');
          },
          async () => ({ contents: [] })
        ),
      ]) {
        const logger = makeLogger();
        const service = buildService({ logger, providers: [provider] });
        const actor = testActor();

        const error = await service
          .readResource('alkemio://test/ARG-MARKER', actor)
          .catch(e => e);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(UNSPECIFIED_TEXT);
        const errorId = errorIdOf(error.message);
        expect(entriesFor(logger, errorId)).toEqual([
          {
            errorId,
            exceptionName: 'Error',
            operation: 'resources/read',
            resource: 'TestResourceProvider',
            actorID: actor.actorID,
          },
        ]);
        expect(loudLogText(logger)).not.toContain('boom');
        expect(loudLogText(logger)).not.toContain('ARG-MARKER');
      }
    });

    it('appends the original message when the switch is on', async () => {
      process.env.ERROR_RESPONSE_DEBUG = 'true';
      const logger = makeLogger();
      const provider = new TestResourceProvider(
        async () => {
          throw new Error('boom');
        },
        async () => ({ contents: [] })
      );
      const service = buildService({ logger, providers: [provider] });

      await expect(
        service.readResource('alkemio://test/x', testActor())
      ).rejects.toThrow(
        new RegExp(
          `^\\[UNSPECIFIED\\] Internal Server Error errorId=${UUID_PATTERN} detail=boom$`
        )
      );
    });

    describe('with the callout resource', () => {
      const setup = (getCalloutOrFail: any) => {
        const logger = makeLogger();
        const provider = new CalloutResourceProvider(
          { getCalloutOrFail } as any,
          logger as any
        );
        return {
          logger,
          service: buildService({ logger, providers: [provider] }),
        };
      };

      it('logs a database failure without the address', async () => {
        delete process.env.ERROR_RESPONSE_DEBUG;
        const { logger, service } = setup(
          vi.fn().mockRejectedValue(queryFailed())
        );
        const actor = testActor();

        const error = await service
          .readResource(
            `${MCP_CONSTANTS.URI_SCHEME}://callouts/ARG-MARKER`,
            actor
          )
          .catch(e => e);

        expect(error.message).toMatch(UNSPECIFIED_TEXT);
        const errorId = errorIdOf(error.message);
        expect(entriesFor(logger, errorId)).toEqual([
          {
            errorId,
            exceptionName: 'QueryFailedError',
            operation: 'resources/read',
            resource: 'CalloutResourceProvider',
            actorID: actor.actorID,
          },
        ]);
        expect(loudLogText(logger)).not.toContain('ARG-MARKER');
      });

      it('logs a refused read with privilege and policy, without the callout id', async () => {
        delete process.env.ERROR_RESPONSE_DEBUG;
        const calloutId = '5d1e2f3a-4b5c-4d6e-8f70-81a2b3c4d5e6';
        const policy = policyGranting([]);
        const { logger, service } = setup(
          vi.fn().mockResolvedValue({ id: calloutId, authorization: policy })
        );
        const actor = testActor();

        const error = await service
          .readResource(
            `${MCP_CONSTANTS.URI_SCHEME}://callouts/${calloutId}`,
            actor
          )
          .catch(e => e);

        expect(error.message).toMatch(NEUTRAL_TEXT);
        const errorId = errorIdOf(error.message);
        expect(entriesFor(logger, errorId)).toEqual([
          {
            errorId,
            exceptionName: 'ForbiddenAuthorizationPolicyException',
            code: 'FORBIDDEN_POLICY',
            privilege: AuthorizationPrivilege.READ,
            policyId: policy.id,
            operation: 'resources/read',
            resource: 'CalloutResourceProvider',
            actorID: actor.actorID,
          },
        ]);
        expect(loudLogText(logger)).not.toContain(calloutId);
      });
    });

    it('answers a missing and a refused resource alike, and logs which it was', async () => {
      delete process.env.ERROR_RESPONSE_DEBUG;
      const uri = 'alkemio://test/thing';
      const policy = policyGranting([]);
      const logger = makeLogger();
      const actor = testActor();
      const missing = buildService({
        logger,
        providers: [
          new TestResourceProvider(
            async () => {
              throw new EntityNotFoundException(
                'Thing not found',
                LogContext.MCP_SERVER
              );
            },
            async () => ({ contents: [] })
          ),
        ],
      });
      const refused = buildService({
        logger,
        providers: [
          new TestResourceProvider(
            async () => policy,
            async () => ({ contents: [] })
          ),
        ],
      });

      const a = (await missing.readResource(uri, actor).catch(e => e)).message;
      const b = (await refused.readResource(uri, actor).catch(e => e)).message;

      expect(a).toMatch(NEUTRAL_TEXT);
      expect(b).toMatch(NEUTRAL_TEXT);
      expect(withoutErrorId(a)).toBe(withoutErrorId(b));
      expect(entriesFor(logger, errorIdOf(a))).toEqual([
        {
          errorId: errorIdOf(a),
          exceptionName: 'EntityNotFoundException',
          code: 'ENTITY_NOT_FOUND',
          operation: 'resources/read',
          resource: 'TestResourceProvider',
          actorID: actor.actorID,
        },
      ]);
      expect(entriesFor(logger, errorIdOf(b))).toEqual([
        {
          errorId: errorIdOf(b),
          exceptionName: 'ForbiddenAuthorizationPolicyException',
          code: 'FORBIDDEN_POLICY',
          privilege: AuthorizationPrivilege.READ,
          policyId: policy.id,
          operation: 'resources/read',
          resource: 'TestResourceProvider',
          actorID: actor.actorID,
        },
      ]);
      expect(loudLogText(logger)).not.toContain(uri);
    });
  });
});

describe('McpServerService — a named target that is missing or refused', () => {
  beforeEach(() => {
    delete process.env.ERROR_RESPONSE_DEBUG;
  });

  /** Calls one tool per case and returns each text with its log entry. */
  const answers = async (
    cases: Array<{ tool: any; name: string; args: object }>
  ) => {
    const logger = makeLogger();
    const results = [];
    for (const { tool, name, args } of cases) {
      const call = toolCaller(
        buildService({ logger, tools: [tool] }),
        testActor()
      );
      const text = onlyText(await call(name, args));
      const entries = MCP_TEXT.test(text)
        ? entriesFor(logger, errorIdOf(text))
        : [];
      results.push({ text, entries });
    }
    return { results, logger };
  };

  const expectNeutralAndEqual = (texts: string[]) => {
    for (const text of texts) {
      expect(text).toMatch(NEUTRAL_TEXT);
      expect(withoutErrorId(text)).toBe(withoutErrorId(texts[0]));
    }
  };

  it('create_whiteboard from a template: missing, refused and policy-less read alike', async () => {
    const TEMPLATE_ID = '7e6d5c4b-3a29-4180-9f7e-6d5c4b3a2918';
    const refusingPolicy = policyGranting([]);
    const tool = (getTemplateOrFail: any) =>
      new CreateWhiteboardTool(
        { createContributionOnCallout: vi.fn() } as any,
        {} as any,
        {} as any,
        { getTemplateOrFail, getWhiteboard: vi.fn() } as any,
        realAuthorizationService(),
        makeLogger() as any
      );
    const args = {
      calloutId: 'callout-1',
      displayName: 'Board',
      fromTemplateId: TEMPLATE_ID,
    };

    const { results, logger } = await answers([
      {
        tool: tool(
          vi
            .fn()
            .mockRejectedValue(
              new EntityNotFoundException(
                'Template not found',
                LogContext.TEMPLATES
              )
            )
        ),
        name: 'create_whiteboard',
        args,
      },
      {
        tool: tool(
          vi
            .fn()
            .mockResolvedValue({ type: 'post', authorization: refusingPolicy })
        ),
        name: 'create_whiteboard',
        args,
      },
      {
        tool: tool(
          vi.fn().mockResolvedValue({ type: 'post', authorization: undefined })
        ),
        name: 'create_whiteboard',
        args,
      },
    ]);

    expectNeutralAndEqual(results.map(r => r.text));
    expect(results.map(r => r.entries[0]?.exceptionName)).toEqual([
      'EntityNotFoundException',
      'ForbiddenAuthorizationPolicyException',
      'ForbiddenException',
    ]);
    expect(results[1].entries[0].policyId).toBe(refusingPolicy.id);
    expect(loudLogText(logger)).not.toContain(TEMPLATE_ID);
  });

  it('create_whiteboard_in_space: a missing space and a refused one alike, by UUID or slug', async () => {
    const SPACE_UUID = '1f2e3d4c-5b6a-4798-8a7b-6c5d4e3f2a1b';
    const SLUG = 'my-space-slug';
    const refusingPolicy = policyGranting([]);
    const tool = (lookup: any, mutations: any) =>
      new CreateWhiteboardInSpaceTool(
        mutations,
        { getSpaceByIdOrNameIdOrFail: lookup } as any,
        {} as any,
        {} as any,
        realAuthorizationService(),
        {} as any,
        makeLogger() as any
      );
    const collaborators: any[] = Array(19).fill({});
    collaborators[0] = realAuthorizationService();
    collaborators[2] = {
      getCalloutsSetOrFail: vi
        .fn()
        .mockResolvedValue({ id: 'set-1', authorization: refusingPolicy }),
    };
    collaborators[18] = makeLogger();
    const realMutations = new (CalloutsSetResolverMutations as any)(
      ...collaborators
    );

    const { results, logger } = await answers([
      {
        tool: tool(
          vi
            .fn()
            .mockRejectedValue(
              new EntityNotFoundException('Space not found', LogContext.SPACES)
            ),
          { createCalloutOnCalloutsSet: vi.fn() }
        ),
        name: 'create_whiteboard_in_space',
        args: { spaceId: SPACE_UUID, displayName: 'Board' },
      },
      {
        tool: tool(
          vi.fn().mockResolvedValue({
            id: SPACE_UUID,
            collaboration: { calloutsSet: { id: 'set-1' } },
          }),
          realMutations
        ),
        name: 'create_whiteboard_in_space',
        args: { spaceId: SLUG, displayName: 'Board' },
      },
      {
        tool: tool(vi.fn().mockRejectedValue(new Error('db down')), {
          createCalloutOnCalloutsSet: vi.fn(),
        }),
        name: 'create_whiteboard_in_space',
        args: { spaceId: SPACE_UUID, displayName: 'Board' },
      },
    ]);

    expectNeutralAndEqual([results[0].text, results[1].text]);
    for (const { text } of results) {
      expect(text).not.toContain(SPACE_UUID);
      expect(text).not.toContain(SLUG);
    }
    expect(results[0].entries[0]).toMatchObject({
      exceptionName: 'EntityNotFoundException',
      code: 'ENTITY_NOT_FOUND',
    });
    expect(results[1].entries[0]).toMatchObject({
      exceptionName: 'ForbiddenAuthorizationPolicyException',
      privilege: AuthorizationPrivilege.CREATE_CALLOUT,
      policyId: refusingPolicy.id,
    });
    expect(results[2].text).toMatch(UNSPECIFIED_TEXT);
    expect(results[2].entries[0].exceptionName).toBe('Error');
    expect(loudLogText(logger)).not.toContain('db down');
  });

  it('analyze_contributions: a missing space, a refused one and a policy-less one alike', async () => {
    const SPACE_UUID = '2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d';
    const SLUG = 'another-space';
    const refusingPolicy = policyGranting([]);
    const tool = (lookup: any) =>
      new ContributionsAnalyzeTool(
        { getRepository: vi.fn() } as any,
        realAuthorizationService(),
        { getSpaceByIdOrNameIdOrFail: lookup } as any,
        makeLogger() as any
      );
    const missing = () =>
      vi
        .fn()
        .mockRejectedValue(
          new EntityNotFoundException('Space not found', LogContext.SPACES)
        );
    const found = (authorization: unknown) =>
      vi.fn().mockResolvedValue({ id: SPACE_UUID, authorization });

    for (const identifier of [SPACE_UUID, SLUG]) {
      const args = { scope: `space:${identifier}` };
      const { results } = await answers([
        { tool: tool(missing()), name: 'analyze_contributions', args },
        {
          tool: tool(found(refusingPolicy)),
          name: 'analyze_contributions',
          args,
        },
        { tool: tool(found(undefined)), name: 'analyze_contributions', args },
      ]);

      expectNeutralAndEqual(results.map(r => r.text));
      for (const { text } of results) {
        expect(text).not.toContain(identifier);
        expect(text).not.toContain(SPACE_UUID);
      }
      expect(results.map(r => r.entries[0]?.exceptionName)).toEqual([
        'EntityNotFoundException',
        'ForbiddenAuthorizationPolicyException',
        'ForbiddenException',
      ]);
      expect(results[1].entries[0]).toMatchObject({
        privilege: AuthorizationPrivilege.READ_ABOUT,
        policyId: refusingPolicy.id,
      });
    }

    const { results } = await answers([
      {
        tool: tool(vi.fn().mockRejectedValue(new Error('db down'))),
        name: 'analyze_contributions',
        args: { scope: `space:${SPACE_UUID}` },
      },
    ]);
    expect(results[0].text).toMatch(UNSPECIFIED_TEXT);
  });

  it.each([
    ['import_whiteboard_scene', ImportWhiteboardSceneTool],
    ['edit_whiteboard_elements', EditWhiteboardElementsTool],
  ])('%s: a storage failure while loading the board leaves the tool as the unspecified text', async (name, Tool: any) => {
    const tool = new Tool(
      {
        getWhiteboardOrFail: vi.fn().mockRejectedValue(new Error('db down')),
      },
      realAuthorizationService(),
      { execute: vi.fn() },
      makeLogger()
    );
    const args =
      name === 'import_whiteboard_scene'
        ? {
            whiteboardId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
            scene: {
              type: 'excalidraw',
              version: 2,
              elements: [{ type: 'rectangle', id: 'r' }],
            },
          }
        : {
            whiteboardId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
            operations: [{ op: 'addText', text: 'hello' }],
          };

    const { results, logger } = await answers([{ tool, name, args }]);

    expect(results[0].text).toMatch(UNSPECIFIED_TEXT);
    expect(results[0].entries).toEqual([
      expect.objectContaining({ exceptionName: 'Error', operation: name }),
    ]);
    expect(loudLogText(logger)).not.toContain('db down');
  });

  it('navigate_templates details: a missing, a refused and a policy-less template alike', async () => {
    const tool = (getTemplateOrFail: any) =>
      new TemplateNavigatorTool(
        {} as any,
        { getTemplateOrFail } as any,
        realAuthorizationService(),
        makeLogger() as any
      );
    const args = { action: 'details', templateId: 'template-1' };

    const { results } = await answers([
      {
        tool: tool(
          vi
            .fn()
            .mockRejectedValue(
              new EntityNotFoundException(
                'Template not found',
                LogContext.TEMPLATES
              )
            )
        ),
        name: 'navigate_templates',
        args,
      },
      {
        tool: tool(
          vi.fn().mockResolvedValue({ authorization: policyGranting([]) })
        ),
        name: 'navigate_templates',
        args,
      },
      {
        tool: tool(vi.fn().mockResolvedValue({ authorization: undefined })),
        name: 'navigate_templates',
        args,
      },
    ]);

    expectNeutralAndEqual(results.map(r => r.text));
    expect(results.map(r => r.entries[0]?.exceptionName)).toEqual([
      'EntityNotFoundException',
      'ForbiddenAuthorizationPolicyException',
      'ForbiddenException',
    ]);
  });
});

/**
 * workspace#038, FR-012/FR-013/FR-014, C-04: session-scoped key revalidation.
 * The service's own private `sessions` map is manipulated directly to seed a
 * pre-established session — this is the same technique any real session
 * reaches: `handleRequest` reads/writes `this.sessions`, and there is no
 * public seam to construct a session without driving the real MCP SDK
 * transport. `configService.get('mcp.enabled', ...)` must return true for
 * `handleRequest` to proceed past its top-of-function guard.
 */
describe('McpServerService.handleRequest — session revalidation (workspace#038)', () => {
  const SESSION_ID = 'session-1';
  const KEY_ID = 'key-1';

  const setup = (opts: { isKeyUsable?: boolean } = {}) => {
    const configService = {
      get: vi.fn().mockReturnValue(true),
    };
    const mcpApiKeyService = {
      isKeyUsable: vi.fn().mockResolvedValue(opts.isKeyUsable ?? true),
    };
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    const service = new McpServerService(
      configService as any,
      {} as any,
      {} as any,
      {} as any,
      { checkToolAllowed: vi.fn() } as any,
      logger as any,
      mcpApiKeyService as any
    );

    const transport = {
      handleRequest: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const authenticatedActor = new ActorContext();
    authenticatedActor.actorID = 'user-1';
    authenticatedActor.isAnonymous = false;

    const session = {
      transport,
      server: {} as any,
      actorContext: authenticatedActor,
      apiKeyId: KEY_ID,
    };
    (service as any).sessions.set(SESSION_ID, session);

    const res: any = Object.assign(new EventEmitter(), {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader: vi.fn((k: string, v: string) => {
        res.headers[k] = v;
      }),
      end: vi.fn(),
    });

    return { service, session, transport, res, mcpApiKeyService, logger };
  };

  it('D2 (mandated): initialize with a key, revoke it, reuse the session WITHOUT re-sending the bearer — request fails and the session closes (US2-AS5, FR-013, R-038-3)', async () => {
    // "revoke" is modeled by isKeyUsable now returning false for KEY_ID.
    const { service, transport, res, mcpApiKeyService } = setup({
      isKeyUsable: false,
    });

    // Reuse the session: sessionId present, NO fresh actorContext (undefined —
    // i.e. no bearer on this particular request).
    await service.handleRequest(
      new EventEmitter() as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    expect(mcpApiKeyService.isKeyUsable).toHaveBeenCalledWith(KEY_ID);
    expect(transport.handleRequest).not.toHaveBeenCalled();
    expect(transport.close).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
    expect((service as any).sessions.has(SESSION_ID)).toBe(false);
  });

  it('serves the request when the key is still usable', async () => {
    const { service, transport, res, mcpApiKeyService } = setup({
      isKeyUsable: true,
    });

    await service.handleRequest(
      new EventEmitter() as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    expect(mcpApiKeyService.isKeyUsable).toHaveBeenCalledWith(KEY_ID);
    expect(transport.handleRequest).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect((service as any).sessions.has(SESSION_ID)).toBe(true);
  });

  it('performs NO additional key lookup when the request DOES carry a fresh key (FR-014, SC-007)', async () => {
    const { service, transport, res, mcpApiKeyService, session } = setup();
    const freshActor = new ActorContext();
    freshActor.actorID = 'user-1';
    freshActor.isAnonymous = false;

    await service.handleRequest(
      new EventEmitter() as any,
      res,
      SESSION_ID,
      freshActor,
      [{ operations: ['read'] }],
      'key-fresh'
    );

    // The strategy already revalidated this key on this request — the session
    // branch must not call isKeyUsable at all.
    expect(mcpApiKeyService.isKeyUsable).not.toHaveBeenCalled();
    expect(transport.handleRequest).toHaveBeenCalledTimes(1);
    expect(session.apiKeyId).toBe('key-fresh');
  });

  it('fails closed when the session has an authenticated identity but no apiKeyId (C-04, pre-existing session)', async () => {
    const { service, transport, res, mcpApiKeyService } = setup();
    // Simulate a session that predates this feature: authenticated identity,
    // but no apiKeyId was ever recorded.
    (service as any).sessions.get(SESSION_ID).apiKeyId = undefined;

    await service.handleRequest(
      new EventEmitter() as any,
      res,
      SESSION_ID,
      undefined,
      undefined,
      undefined
    );

    // isKeyUsable is never CALLED for an absent id (nothing to look up) — the
    // branch fails closed directly.
    expect(mcpApiKeyService.isKeyUsable).not.toHaveBeenCalled();
    expect(transport.handleRequest).not.toHaveBeenCalled();
    expect(transport.close).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(401);
  });
});

describe('McpServerService.handleRequest — session admission', () => {
  const REFUSAL = {
    jsonrpc: '2.0',
    error: { code: -32001, message: 'Authentication required.' },
    id: null,
  };

  const setup = (opts: { enabled?: boolean } = {}) => {
    const configService = {
      get: vi.fn().mockReturnValue(opts.enabled ?? true),
    };
    const logger = { warn: vi.fn(), verbose: vi.fn(), error: vi.fn() };
    const service = new McpServerService(
      configService as any,
      {} as any,
      {} as any,
      {} as any,
      { checkToolAllowed: vi.fn() } as any,
      logger as any,
      { isKeyUsable: vi.fn() } as any
    );
    const res: any = Object.assign(new EventEmitter(), {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader: vi.fn((k: string, v: string) => {
        res.headers[k] = v;
      }),
      end: vi.fn(),
    });
    return { service, res };
  };

  const request = (body: unknown) =>
    Object.assign(new EventEmitter(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body,
    }) as any;

  const initialize = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' },
    },
  };

  const expectRefused = (service: McpServerService, res: any) => {
    expect(res.statusCode).toBe(401);
    expect(res.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/json'
    );
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(JSON.parse(res.end.mock.calls[0][0])).toEqual(REFUSAL);
    expect(res.headers['mcp-session-id']).toBeUndefined();
    expect((service as any).sessions.size).toBe(0);
  };

  it('refuses a request without a session and without an actor', async () => {
    const { service, res } = setup();
    await service.handleRequest(request(initialize), res, undefined, undefined);
    expectRefused(service, res);
  });

  it('refuses a request without a session whose actor is anonymous', async () => {
    const { service, res } = setup();
    const actor = new ActorContext();
    actor.isAnonymous = true;
    await service.handleRequest(request(initialize), res, undefined, actor);
    expectRefused(service, res);
  });

  it('refuses a request without a session whose actor has no actor id', async () => {
    const { service, res } = setup();
    const actor = new ActorContext();
    actor.actorID = '';
    actor.isAnonymous = false;
    await service.handleRequest(request(initialize), res, undefined, actor);
    expectRefused(service, res);
  });

  it('refuses a tool call without a session the same way as a handshake', async () => {
    const { service, res } = setup();
    await service.handleRequest(
      request({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'list_whiteboards', arguments: {} },
      }),
      res,
      undefined,
      undefined
    );
    expectRefused(service, res);
  });

  it('answers 503 when the endpoint is switched off', async () => {
    const { service, res } = setup({ enabled: false });
    await service.handleRequest(request(initialize), res, undefined, undefined);
    expect(res.statusCode).toBe(503);
    expect(res.setHeader).not.toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.anything()
    );
  });

  it('answers 404 for a session it does not hold', async () => {
    const { service, res } = setup();
    await service.handleRequest(
      request(initialize),
      res,
      'unknown-session',
      undefined
    );
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.end.mock.calls[0][0]).error.message).toBe(
      'Session not found. Please reinitialize.'
    );
    expect(res.setHeader).not.toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.anything()
    );
  });
});
