export enum MessageSenderRole {
  HUMAN = 'human',
  ASSISTANT = 'assistant',
}
export interface InteractionMessage {
  role: MessageSenderRole;
  content: string;
}
