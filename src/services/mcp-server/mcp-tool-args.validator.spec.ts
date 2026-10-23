import { McpToolDefinition } from './dto/mcp.types';
import { McpToolArgsValidator } from './mcp-tool-args.validator';

describe('McpToolArgsValidator', () => {
  const schema: McpToolDefinition['inputSchema'] = {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number' },
    },
    required: ['query'],
  };

  let validator: McpToolArgsValidator;

  beforeEach(() => {
    validator = new McpToolArgsValidator();
  });

  it('accepts valid arguments', () => {
    expect(
      validator.validate('search_content', schema, { query: 'hi', limit: 5 })
    ).toBeUndefined();
    expect(
      validator.validate('search_content', schema, { query: 'hi' })
    ).toBeUndefined();
  });

  it('rejects a missing required property and names the tool', () => {
    const error = validator.validate('search_content', schema, { limit: 5 });
    expect(error).toContain("must have required property 'query'");
    expect(error).toContain('search_content');
  });

  it('rejects a wrong-typed property', () => {
    const error = validator.validate('search_content', schema, {
      query: 'hi',
      limit: 'five',
    });
    expect(error).toMatch(/limit/);
  });

  it('treats undefined args as an empty object', () => {
    const error = validator.validate('search_content', schema, undefined);
    expect(error).toContain("must have required property 'query'");
  });

  it('reuses the cached validator across calls for the same tool', () => {
    expect(
      validator.validate('cached_tool', schema, { query: 'a' })
    ).toBeUndefined();
    // Second call hits the cache and still enforces the schema.
    expect(validator.validate('cached_tool', schema, {})).toContain('query');
  });
});

describe('whiteboard creation definitions through the argument validator', () => {
  it.each([
    ['create_whiteboard', 'calloutId'],
    ['create_whiteboard_in_space', 'spaceId'],
  ])('rejects retired and unknown arguments before dispatch for %s', async (name, target) => {
    const { CreateWhiteboardTool } = await import(
      './tools/create-whiteboard.tool'
    );
    const { CreateWhiteboardInSpaceTool } = await import(
      './tools/create-whiteboard-in-space.tool'
    );
    const prototype =
      name === 'create_whiteboard'
        ? CreateWhiteboardTool.prototype
        : CreateWhiteboardInSpaceTool.prototype;
    const definition = prototype.getDefinition();
    const validator = new McpToolArgsValidator();
    const execute = vi.fn();
    const { McpServerService } = await import('./mcp-server.service');
    const { ToolRegistry } = await import('./tools/tool.registry');
    const { ActorContext } = await import('@core/actor-context/actor.context');
    const logger = { verbose: vi.fn(), warn: vi.fn() };
    const service = new McpServerService(
      {} as any,
      new ToolRegistry(
        [{ getDefinition: () => definition, execute }],
        logger as any
      ),
      {} as any,
      {} as any,
      { checkToolAllowed: vi.fn() } as any,
      logger as any,
      {} as any
    );
    const server = (service as any).createMcpServer(
      () => new ActorContext(),
      () => [{ operations: ['tools'] }]
    );
    const handler = server.server._requestHandlers.get('tools/call');
    const valid = { [target]: 'target', displayName: 'Board' };
    for (const extra of [{ content: '{}' }, { unexpected: true }]) {
      const args = { ...valid, ...extra };
      const error = validator.validate(name, definition.inputSchema, args);
      const result = await handler(
        { method: 'tools/call', params: { name, arguments: args } },
        { signal: new AbortController().signal }
      );
      expect(result.isError).toBe(true);
      expect(error).toContain('must NOT have additional properties');
      if ('content' in extra) {
        expect(result.content[0].text).toContain(
          'Create a blank whiteboard, then use import_whiteboard_scene'
        );
      } else {
        expect(result.content[0].text).toBe(error);
      }
    }
    expect(execute).not.toHaveBeenCalled();
    expect(
      validator.validate(name, definition.inputSchema, valid)
    ).toBeUndefined();
    expect(
      validator.validate(name, definition.inputSchema, {
        ...valid,
        fromTemplateId: 'template',
      })
    ).toBeUndefined();
    expect(definition.description).toContain('import_whiteboard_scene');
  });
});
