import { relations } from 'drizzle-orm';
import { tagsets } from './tagset.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { classifications } from '@domain/common/classification/classification.schema';
import { tagsetTemplates } from '@domain/common/tagset-template/tagset.template.schema';

export const tagsetsRelations = relations(tagsets, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [tagsets.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne: Profile
  profile: one(profiles, {
    fields: [tagsets.profileId],
    references: [profiles.id],
  }),

  // ManyToOne: Classification
  classification: one(classifications, {
    fields: [tagsets.classificationId],
    references: [classifications.id],
  }),

  // ManyToOne: TagsetTemplate
  tagsetTemplate: one(tagsetTemplates, {
    fields: [tagsets.tagsetTemplateId],
    references: [tagsetTemplates.id],
  }),
}));
