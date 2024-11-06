import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';
import { AiPersonaEngineAdapterInputBase } from './ai.persona.engine.adapter.dto.base';
import { InteractionMessage } from '@services/ai-server/ai-persona-service/dto/interaction.message';
import { IExternalConfig } from '@services/ai-server/ai-persona-service/dto/external.config';

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
}
export class RoomDetails {
  roomID!: string;
  threadID!: string;
  communicationID!: string;
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
  bodyOfKnowledgeID: string;
  interactionID?: string;
  history?: InteractionMessage[];
  description?: string;
  displayName: string;
  externalConfig: IExternalConfig;
  externalMetadata: ExternalMetadata;
  resultHandler: ResultHandler;
  personaServiceID: string;
}
