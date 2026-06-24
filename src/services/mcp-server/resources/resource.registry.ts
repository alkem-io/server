import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  MCP_RESOURCE_PROVIDER,
  McpResourceDefinition,
  McpResourceProvider,
} from '../dto/mcp.types';

/**
 * Registry for MCP resource providers — the single source of truth for resource
 * routing. Providers are collected via the MCP_RESOURCE_PROVIDER multi-provider
 * token at construction; there is no manual register() step.
 */
@Injectable()
export class ResourceRegistry {
  private readonly providers: McpResourceProvider[];

  constructor(
    @Inject(MCP_RESOURCE_PROVIDER) providers: McpResourceProvider[],
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.providers = providers ?? [];
    for (const provider of this.providers) {
      for (const def of provider.getResourceDefinitions()) {
        this.logger.verbose?.(
          `Registered MCP resource: ${def.name} (${def.uri})`,
          LogContext.MCP_SERVER
        );
      }
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
