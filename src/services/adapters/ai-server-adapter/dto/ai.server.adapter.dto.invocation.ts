import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';

export enum InvocationOperation {
  QUERY = 'query',
  INGEST = 'ingest',
}

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
  POST_MESSAGE = 'postMessage',
  NONE = 'none',
}
export class RoomDetails {
  roomID!: string;
  threadID?: string;
  actorID!: string;
  vcInteractionID?: string;
}

export class ResultHandler {
  action!: InvocationResultAction;
  roomDetails?: RoomDetails = undefined;
}

export class AiServerAdapterInvocationInput {
  operation?: InvocationOperation = InvocationOperation.QUERY;
  message!: string;
  aiPersonaID!: string;
  bodyOfKnowledgeID?: string;
  contextID?: string;
  userID?: string;
  vcInteractionID?: string;
  description?: string;
  displayName!: string;
  externalMetadata?: ExternalMetadata = {};
  resultHandler!: ResultHandler;
  language?: string;
}
