import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';

export enum InvocationResultAction {
  POST_REPLY = 'postReply',
  POST_MESSAGE = 'postMessage',
}
export class RoomDetails {
  roomID!: string;
  threadID?: string;
  communicationID!: string;
  vcInteractionID?: string;
}

export class ResultHandler {
  action!: InvocationResultAction;
  roomDetails?: RoomDetails = undefined;
}

export class AiServerAdapterInvocationInput {
  message!: string;
  aiPersonaServiceID!: string;
  contextID?: string;
  userID?: string;
  vcInteractionID?: string;
  description?: string;
  displayName!: string;
  externalMetadata?: ExternalMetadata = {};
  resultHandler!: ResultHandler;
  language?: string;
}
