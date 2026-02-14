import { relations } from 'drizzle-orm';
import { conversations } from './conversation.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { messagings } from '@domain/communication/messaging/messaging.schema';
import { rooms } from '@domain/communication/room/room.schema';
import { conversationMemberships } from '@domain/communication/conversation-membership/conversation.membership.schema';

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [conversations.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // ManyToOne: Messaging
    messaging: one(messagings, {
      fields: [conversations.messagingId],
      references: [messagings.id],
    }),

    // OneToOne with @JoinColumn: Room
    room: one(rooms, {
      fields: [conversations.roomId],
      references: [rooms.id],
    }),

    // OneToMany: memberships
    memberships: many(conversationMemberships),
  })
);
