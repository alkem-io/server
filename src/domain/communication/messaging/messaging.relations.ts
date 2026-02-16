import { relations } from 'drizzle-orm';
import { messagings } from './messaging.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { conversations } from '@domain/communication/conversation/conversation.schema';

export const messagingsRelations = relations(messagings, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [messagings.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToMany: conversations
  conversations: many(conversations),
}));
