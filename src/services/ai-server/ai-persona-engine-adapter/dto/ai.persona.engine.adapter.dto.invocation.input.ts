import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';
import {
  IExternalConfig,
  InteractionMessage,
} from '@services/ai-server/ai-persona/dto';
import { PromptGraph } from '@services/ai-server/prompt-graph/dto/prompt.graph.dto';
import { AiPersonaEngineAdapterInputBase } from './ai.persona.engine.adapter.dto.base';

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
  POST_MESSAGE = 'postMessage',
  NONE = 'none',
}
export class RoomDetails {
  roomID!: string;
  threadID?: string;
  actorID!: string;
}

export class ResultHandler {
  action!: InvocationResultAction;
  roomDetails?: RoomDetails = undefined;
}

export interface AiPersonaEngineAdapterInvocationInput
  extends AiPersonaEngineAdapterInputBase {
  message: string;
  prompt?: string[];
  contextID?: string;
  bodyOfKnowledgeID?: string;
  interactionID?: string;
  history?: InteractionMessage[];
  description?: string;
  displayName: string;
  externalConfig: IExternalConfig;
  externalMetadata: ExternalMetadata;
  resultHandler: ResultHandler;
  personaID: string;
  language?: string;
  promptGraph?: PromptGraph;
}
