import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  MCP_CONSTANTS,
  McpReadResourceResult,
  McpResourceDefinition,
  McpResourceProvider,
} from '../dto/mcp.types';

const CALLOUT_URI_PATTERN = `${MCP_CONSTANTS.URI_SCHEME}://callouts/`;

/**
 * Resource provider for callouts.
 * Exposes callout content including framing and contributions (posts, whiteboards, links, memos).
 */
@Injectable()
export class CalloutResourceProvider implements McpResourceProvider {
  constructor(
    private readonly calloutService: CalloutService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getResourceDefinitions(): McpResourceDefinition[] {
    return [
      {
        uri: `${CALLOUT_URI_PATTERN}{calloutId}`,
        name: 'Callout',
        description:
          'Collaboration callout with framing content and contributions (posts, whiteboards, links, memos)',
        mimeType: 'application/json',
      },
    ];
  }

  matches(uri: string): boolean {
    return uri.startsWith(CALLOUT_URI_PATTERN);
  }

  async getAuthorizationPolicy(uri: string): Promise<IAuthorizationPolicy> {
    const calloutId = this.extractCalloutId(uri);
    const callout = await this.calloutService.getCalloutOrFail(calloutId, {
      relations: { authorization: true },
    });
    if (!callout.authorization) {
      throw new EntityNotFoundException(
        'Callout authorization policy not found',
        LogContext.MCP_SERVER,
        { calloutId }
      );
    }
    return callout.authorization;
  }

  async read(
    uri: string,
    agentInfo: ActorContext
  ): Promise<McpReadResourceResult> {
    const calloutId = this.extractCalloutId(uri);

    this.logger.verbose?.(
      `Reading callout resource: ${calloutId}`,
      LogContext.MCP_SERVER
    );

    const callout = await this.calloutService.getCalloutOrFail(calloutId, {
      relations: {
        framing: {
          profile: true,
          whiteboard: true,
          link: true,
          memo: true,
        },
        contributionDefaults: true,
      },
    });

    // Get contributions with their content
    const contributions = await this.calloutService.getContributions(callout);

    const contributionData = contributions.map(c => ({
      id: c.id,
      type: c.type,
      createdBy: c.createdBy,
      post: c.post
        ? {
            id: c.post.id,
            // Include post profile info if available
          }
        : undefined,
      whiteboard: c.whiteboard
        ? {
            id: c.whiteboard.id,
            uri: `${MCP_CONSTANTS.URI_SCHEME}://whiteboards/${c.whiteboard.id}`,
          }
        : undefined,
      link: c.link
        ? {
            id: c.link.id,
            uri: c.link.uri,
          }
        : undefined,
      memo: c.memo
        ? {
            id: c.memo.id,
          }
        : undefined,
    }));

    const resourceData = {
      id: callout.id,
      nameID: callout.nameID,
      framing: {
        type: callout.framing?.type,
        profile: {
          displayName: callout.framing?.profile?.displayName,
          description: callout.framing?.profile?.description,
        },
        whiteboard: callout.framing?.whiteboard
          ? {
              id: callout.framing.whiteboard.id,
              uri: `${MCP_CONSTANTS.URI_SCHEME}://whiteboards/${callout.framing.whiteboard.id}`,
            }
          : undefined,
        link: callout.framing?.link
          ? {
              uri: callout.framing.link.uri,
            }
          : undefined,
      },
      // Hand-picked, NOT the raw jsonb (workspace#084 SEC-R1). This resource is
      // gated on READ alone and is reachable with an ordinary browser session
      // cookie on /rest/mcp, so spreading `callout.settings` shipped
      // `framing.selection.selectedIds` — the curated space list — to any
      // registered non-member, letting them diff it against the spaces they can
      // actually see and recover the exact count and UUIDs of the ones withheld
      // from them. That is precisely what AC6's notice exists to withhold, and
      // it defeated the redaction on Callout.settings via a second surface.
      // Narrowed to what this resource actually uses; every other field in this
      // provider is already hand-picked rather than spread, so this follows the
      // file's own convention. Do NOT reintroduce the blob: anything added here
      // is served to READ-only callers.
      settings: {
        visibility: callout.settings?.visibility,
        contribution: {
          allowedTypes: callout.settings?.contribution?.allowedTypes,
        },
        framing: {
          commentsEnabled: callout.settings?.framing?.commentsEnabled,
        },
      },
      contributionDefaults: callout.contributionDefaults
        ? {
            postDescription: callout.contributionDefaults.postDescription,
          }
        : undefined,
      contributions: contributionData,
      contributionCount: contributions.length,
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

  private extractCalloutId(uri: string): string {
    const id = uri.replace(CALLOUT_URI_PATTERN, '');
    if (!id) {
      throw new EntityNotFoundException(
        'Invalid callout URI - missing ID',
        LogContext.MCP_SERVER,
        { uri }
      );
    }
    return id;
  }
}
