import Ajv, { ValidateFunction } from 'ajv';
import { McpToolDefinition } from './dto/mcp.types';

/**
 * Validates tool-call arguments against each tool's declared JSON Schema before
 * they reach the tool implementation. Compiled validators are cached per tool
 * name, so repeated calls are cheap.
 */
export class McpToolArgsValidator {
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  private readonly cache = new Map<string, ValidateFunction>();

  /**
   * Returns an error message when the arguments do not satisfy the schema, or
   * undefined when they are valid.
   */
  validate(
    toolName: string,
    schema: McpToolDefinition['inputSchema'],
    args: unknown
  ): string | undefined {
    let validate = this.cache.get(toolName);
    if (!validate) {
      validate = this.ajv.compile(schema);
      this.cache.set(toolName, validate);
    }

    if (!validate(args ?? {})) {
      const detail = (validate.errors ?? [])
        .map(err => `${err.instancePath || '/'} ${err.message}`)
        .join('; ');
      return `Invalid arguments for tool '${toolName}': ${detail || 'does not match the input schema'}`;
    }
    return undefined;
  }
}
