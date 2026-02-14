import { relations } from 'drizzle-orm';
import { communications } from './communication.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { rooms } from '@domain/communication/room/room.schema';

export const communicationsRelations = relations(
  communications,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [communications.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Room (updates)
    updates: one(rooms, {
      fields: [communications.updatesId],
      references: [rooms.id],
    }),
  })
);
