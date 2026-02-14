import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const conversations = pgTable('conversation', {
  ...authorizableColumns,

  // ManyToOne: Messaging
  messagingId: uuid('messagingId'),

  // OneToOne with @JoinColumn: Room
  roomId: uuid('roomId'),
});
