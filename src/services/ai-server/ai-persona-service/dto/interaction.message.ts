export enum MessageSenderRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}
export interface InteractionMessage {
  role: MessageSenderRole;
  content: string;
}
