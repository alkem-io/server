import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  toErrorLogEntry,
  toPublicErrorResult,
} from '@core/error-handling/public.error.result';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';
import { WhiteboardExecutorParent } from '../executor/whiteboard-executor.parent';
import {
  operationsSchema,
  validId,
  validOperations,
} from '../executor/whiteboard-executor.protocol';

@Injectable()
export class EditWhiteboardElementsTool implements McpTool {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly executor: WhiteboardExecutorParent,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'edit_whiteboard_elements',
      description:
        'Edit a live whiteboard with ordered addShape, addText, connect, setText or remove operations. Additions without explicit x/y use compact horizontal rows below existing content. addText without width sizes naturally; width wraps text at the same fontSize with a canonical minimum width and derived height. Supplying addText height is unsupported and rejected; addShape height remains supported. IDs reference existing elements from analyze_whiteboard. Edits merge with concurrent collaborators and succeed only after durable persistence. Requires UPDATE_CONTENT access. An indeterminate-after-go outcome must not be automatically replayed.',
      inputSchema: {
        type: 'object',
        properties: {
          whiteboardId: {
            type: 'string',
            pattern:
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
          },
          operations: operationsSchema,
        },
        required: ['whiteboardId', 'operations'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext,
    signal?: AbortSignal
  ): Promise<McpToolResult> {
    const input = args as {
      whiteboardId?: unknown;
      operations?: unknown;
    } | null;
    const whiteboardId = input?.whiteboardId;
    const operations = input?.operations;
    if (!validId(whiteboardId) || !validOperations(operations))
      return this.failure('invalid');
    if (!validId(actorContext.actorID)) return this.failure('unauthorized');
    let whiteboard: Awaited<
      ReturnType<WhiteboardService['getWhiteboardOrFail']>
    >;
    try {
      whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        whiteboardId,
        { relations: { authorization: true } }
      );
      this.authorizationService.grantAccessOrFail(
        actorContext,
        whiteboard.authorization,
        AuthorizationPrivilege.UPDATE_CONTENT,
        'edit whiteboard elements'
      );
    } catch (error) {
      const result = toPublicErrorResult(error);
      if (result.code !== AlkemioErrorStatus.FORBIDDEN_POLICY) throw error;
      this.logger.error?.(
        {
          ...toErrorLogEntry(error, result.errorId),
          operation: 'edit_whiteboard_elements',
          actorID: actorContext.actorID,
        },
        undefined,
        LogContext.MCP_SERVER
      );
      return this.failure('unauthorized', result.errorId);
    }
    const outcome = await this.executor.execute(
      whiteboardId,
      actorContext.actorID,
      operations,
      signal
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            outcome: outcome.outcome,
            ...(outcome.outcome === 'durable-success'
              ? {
                  updated: true,
                  whiteboardId,
                  appliedOperations: operations.length,
                  ...outcome.result,
                }
              : {}),
          }),
        },
      ],
      ...(outcome.outcome === 'durable-success' ? {} : { isError: true }),
    };
  }

  private failure(outcome: string, errorId?: string): McpToolResult {
    return {
      content: [{ type: 'text', text: JSON.stringify({ outcome, errorId }) }],
      isError: true,
    };
  }
}
