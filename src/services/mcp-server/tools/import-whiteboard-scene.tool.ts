import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  toErrorLogEntry,
  toPublicErrorResult,
} from '@core/error-handling/public.error.result';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import Ajv from 'ajv';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';
import { WhiteboardExecutorParent } from '../executor/whiteboard-executor.parent';
import {
  ImportInput,
  importSceneSchema,
  validId,
} from '../executor/whiteboard-executor.protocol';

const uuid = {
  type: 'string',
  pattern:
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
};
const inputSchema = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['whiteboardId', 'scene'],
  properties: {
    whiteboardId: uuid,
    scene: {
      ...importSceneSchema,
      properties: {
        ...importSceneSchema.properties,
        files: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'mimeType'],
            properties: {
              id: { type: 'string', minLength: 1 },
              mimeType: { enum: Object.values(MimeTypeVisual) },
              dataURL: { type: 'string' },
              created: { type: 'number' },
              lastRetrieved: { type: 'number' },
            },
          },
        },
      },
    },
    sourceFiles: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        required: ['fileID'],
        properties: { fileID: uuid },
      },
    },
  },
};
const validate = new Ajv({ strict: false }).compile(inputSchema);
type PublicInput = {
  whiteboardId: string;
  scene: Parameters<
    WhiteboardService['materializeImportAssetsIntoBucket']
  >[0] & {
    type: 'excalidraw';
    version: 2;
    source?: string;
    appState?: Record<string, unknown>;
  };
  sourceFiles?: Record<string, { fileID: string }>;
};

@Injectable()
export class ImportWhiteboardSceneTool implements McpTool {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly executor: WhiteboardExecutorParent,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'import_whiteboard_scene',
      description:
        'Append an exported Excalidraw scene to an existing whiteboard. Preserves existing and concurrent content and destination settings. Embedded images or actor-readable sourceFiles are materialized into the target bucket. Requires UPDATE_CONTENT. Success follows durable persistence; indeterminate-after-go must not be automatically replayed.',
      inputSchema,
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext,
    signal?: AbortSignal
  ): Promise<McpToolResult> {
    const render = (outcome: string, result = {}): McpToolResult => ({
      content: [{ type: 'text', text: JSON.stringify({ outcome, ...result }) }],
      ...(outcome === 'durable-success' ? {} : { isError: true }),
    });
    if (!validate(args)) return render('invalid');
    const input = args as PublicInput;
    if (
      Object.entries(input.scene.files ?? {}).some(
        ([id, file]) => file.id !== id
      )
    )
      return render('invalid');
    if (!validId(actorContext.actorID)) return render('unauthorized');
    let board: Awaited<ReturnType<WhiteboardService['getWhiteboardOrFail']>>;
    try {
      board = await this.whiteboardService.getWhiteboardOrFail(
        input.whiteboardId,
        { relations: { authorization: true, profile: { storageBucket: true } } }
      );
      this.authorizationService.grantAccessOrFail(
        actorContext,
        board.authorization,
        AuthorizationPrivilege.UPDATE_CONTENT,
        'import whiteboard scene'
      );
    } catch (error) {
      const result = toPublicErrorResult(error);
      if (result.code !== AlkemioErrorStatus.FORBIDDEN_POLICY) throw error;
      this.logger.error?.(
        {
          ...toErrorLogEntry(error, result.errorId),
          operation: 'import_whiteboard_scene',
          actorID: actorContext.actorID,
        },
        undefined,
        LogContext.MCP_SERVER
      );
      return render('forbidden', { errorId: result.errorId });
    }
    const bucketID = board.profile?.storageBucket?.id;
    if (!bucketID) return render('invalid');
    const { files: _files, ...metadata } = input.scene;
    const scene = metadata as ImportInput['scene'];
    const outcome = await this.executor.execute(
      input.whiteboardId,
      actorContext.actorID,
      { import: { scene, targetFileIDs: {} } },
      signal,
      {
        prepare: async context => {
          const { targetFileIDs } =
            await this.whiteboardService.materializeImportAssetsIntoBucket(
              input.scene,
              bucketID,
              input.sourceFiles ?? {},
              { ...context, actorContext }
            );
          return { scene, targetFileIDs };
        },
      }
    );
    return render(
      outcome.outcome,
      outcome.outcome === 'durable-success'
        ? { whiteboardId: input.whiteboardId, ...outcome.result }
        : outcome.errorId
          ? { errorId: outcome.errorId }
          : {}
    );
  }
}
