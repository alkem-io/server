import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  MCP_CONSTANTS,
  McpReadResourceResult,
  McpResourceDefinition,
  McpResourceProvider,
} from '../dto/mcp.types';

const WHITEBOARD_URI_PATTERN = `${MCP_CONSTANTS.URI_SCHEME}://whiteboards/`;

/**
 * Resource provider for whiteboards.
 * Exposes whiteboard content (Excalidraw JSON) including elements and files.
 */
@Injectable()
export class WhiteboardResourceProvider implements McpResourceProvider {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getResourceDefinitions(): McpResourceDefinition[] {
    return [
      {
        uri: `${WHITEBOARD_URI_PATTERN}{whiteboardId}`,
        name: 'Whiteboard',
        description:
          'Excalidraw whiteboard with visual collaboration content including shapes, text, arrows, and embedded images',
        mimeType: 'application/json',
      },
    ];
  }

  matches(uri: string): boolean {
    return uri.startsWith(WHITEBOARD_URI_PATTERN);
  }

  async getAuthorizationPolicy(uri: string): Promise<IAuthorizationPolicy> {
    const whiteboardId = this.extractWhiteboardId(uri);
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardId,
      {
        relations: { authorization: true },
      }
    );
    if (!whiteboard.authorization) {
      throw new EntityNotFoundException(
        'Whiteboard authorization policy not found',
        LogContext.MCP_SERVER,
        { whiteboardId }
      );
    }
    return whiteboard.authorization;
  }

  async read(
    uri: string,
    agentInfo: ActorContext
  ): Promise<McpReadResourceResult> {
    const whiteboardId = this.extractWhiteboardId(uri);

    this.logger.verbose?.(
      `Reading whiteboard resource: ${whiteboardId}`,
      LogContext.MCP_SERVER
    );

    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardId,
      {
        relations: {
          profile: true,
        },
      }
    );

    // Parse the Excalidraw content
    let content: Record<string, unknown> = {};
    try {
      content = JSON.parse(whiteboard.content || '{}');
    } catch {
      this.logger.warn?.(
        `Failed to parse whiteboard content for ${whiteboardId}`,
        LogContext.MCP_SERVER
      );
    }

    const resourceData = {
      id: whiteboard.id,
      profile: {
        displayName: whiteboard.profile?.displayName,
        description: whiteboard.profile?.description,
      },
      content: {
        type: content.type || 'excalidraw',
        version: content.version,
        elements: content.elements || [],
        files: content.files || {},
        appState: content.appState || {},
      },
      contentUpdatePolicy: whiteboard.contentUpdatePolicy,
      createdBy: whiteboard.createdBy,
      previewSettings: whiteboard.previewSettings,
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

  private extractWhiteboardId(uri: string): string {
    const id = uri.replace(WHITEBOARD_URI_PATTERN, '');
    if (!id) {
      throw new EntityNotFoundException(
        'Invalid whiteboard URI - missing ID',
        LogContext.MCP_SERVER,
        { uri }
      );
    }
    return id;
  }
}
