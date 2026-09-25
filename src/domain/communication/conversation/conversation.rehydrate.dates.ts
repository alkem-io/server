import { IConversation } from './conversation.interface';

/**
 * Rehydrate Date fields on a conversation (and its room) that were
 * stringified during AMQP serialization. NestJS's DateTime scalar
 * requires actual Date instances — plain ISO strings cause serialize() to return null.
 */
export const rehydrateConversationDates = (
  conversation: IConversation
): IConversation => ({
  ...conversation,
  createdDate: new Date(conversation.createdDate),
  updatedDate: new Date(conversation.updatedDate),
  room: conversation.room
    ? {
        ...conversation.room,
        createdDate: new Date(conversation.room.createdDate),
        updatedDate: new Date(conversation.room.updatedDate),
      }
    : conversation.room,
});
