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
