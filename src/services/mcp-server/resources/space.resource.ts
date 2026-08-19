import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { SpaceService } from '@domain/space/space/space.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  MCP_CONSTANTS,
  McpReadResourceResult,
  McpResourceDefinition,
  McpResourceProvider,
} from '../dto/mcp.types';

const SPACE_URI_PATTERN = `${MCP_CONSTANTS.URI_SCHEME}://spaces/`;

/**
 * Resource provider for spaces.
 * Exposes space metadata, hierarchy, and collaboration structure.
 */
@Injectable()
export class SpaceResourceProvider implements McpResourceProvider {
  constructor(
    private readonly spaceService: SpaceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getResourceDefinitions(): McpResourceDefinition[] {
    return [
      {
        uri: `${SPACE_URI_PATTERN}{spaceId}`,
        name: 'Space',
        description:
          'Collaboration space with metadata, settings, and references to collaboration content',
        mimeType: 'application/json',
      },
    ];
  }

  matches(uri: string): boolean {
    return uri.startsWith(SPACE_URI_PATTERN);
  }

  async getAuthorizationPolicy(uri: string): Promise<IAuthorizationPolicy> {
    const spaceId = this.extractSpaceId(uri);
    const space = await this.spaceService.getSpaceOrFail(spaceId, {
      relations: { authorization: true },
    });
    if (!space.authorization) {
      throw new EntityNotFoundException(
        'Space authorization policy not found',
        LogContext.MCP_SERVER,
        { spaceId }
      );
    }
    return space.authorization;
  }

  async read(
    uri: string,
    agentInfo: ActorContext
  ): Promise<McpReadResourceResult> {
    const spaceId = this.extractSpaceId(uri);

    this.logger.verbose?.(
      `Reading space resource: ${spaceId}`,
      LogContext.MCP_SERVER
    );

    const space = await this.spaceService.getSpaceOrFail(spaceId, {
      relations: {
        about: {
          profile: true,
        },
        collaboration: true,
      },
    });

    // Get subspaces
    const subspaces = await this.spaceService.getSubspaces(space);

    const resourceData = {
      id: space.id,
      nameID: space.nameID,
      level: space.level,
      visibility: space.visibility,
      about: {
        profile: {
          displayName: space.about?.profile?.displayName,
          description: space.about?.profile?.description,
          tagline: space.about?.profile?.tagline,
        },
        why: space.about?.why,
        who: space.about?.who,
      },
      subspaces: subspaces.map(s => ({
        id: s.id,
        nameID: s.nameID,
        uri: `${MCP_CONSTANTS.URI_SCHEME}://spaces/${s.id}`,
        about: {
          profile: {
            displayName: s.about?.profile?.displayName,
          },
        },
      })),
      subspaceCount: subspaces.length,
      collaboration: space.collaboration
        ? {
            id: space.collaboration.id,
          }
        : undefined,
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(resourceData),
        },
      ],
    };
  }

  private extractSpaceId(uri: string): string {
    const id = uri.replace(SPACE_URI_PATTERN, '');
    if (!id) {
      throw new EntityNotFoundException(
        'Invalid space URI - missing ID',
        LogContext.MCP_SERVER,
        { uri }
      );
    }
    return id;
  }
}
