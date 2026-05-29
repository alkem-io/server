import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpResourceDefinition, McpResourceProvider } from '../dto/mcp.types';

/**
 * Registry for MCP resource providers.
 * Manages resource URIs and routes requests to the appropriate provider.
 */
@Injectable()
export class ResourceRegistry {
  private providers: McpResourceProvider[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Register a resource provider
   */
  register(provider: McpResourceProvider): void {
    this.providers.push(provider);

    const definitions = provider.getResourceDefinitions();
    for (const def of definitions) {
      this.logger.verbose?.(
        `Registered MCP resource: ${def.name} (${def.uri})`,
        LogContext.MCP_SERVER
      );
    }
  }

  /**
   * Get all registered resource definitions
   */
  listResources(): McpResourceDefinition[] {
    const resources: McpResourceDefinition[] = [];
    for (const provider of this.providers) {
      resources.push(...provider.getResourceDefinitions());
    }
    return resources;
  }

  /**
   * Find a provider that handles the given URI
   */
  getProvider(uri: string): McpResourceProvider | undefined {
    for (const provider of this.providers) {
      if (provider.matches(uri)) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Check if any provider handles the given URI
   */
  hasProvider(uri: string): boolean {
    return this.getProvider(uri) !== undefined;
  }

  /**
   * Get all registered providers
   */
  listProviders(): McpResourceProvider[] {
    return [...this.providers];
  }
}
