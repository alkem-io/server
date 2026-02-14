import { relations } from 'drizzle-orm';
import { classifications } from './classification.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { tagsets } from '@domain/common/tagset/tagset.schema';

export const classificationsRelations = relations(
  classifications,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [classifications.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToMany: Tagsets
    tagsets: many(tagsets),
  })
);
