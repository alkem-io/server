import { relations } from 'drizzle-orm';
import { templates } from './template.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { communityGuidelines } from '@domain/community/community-guidelines/community.guidelines.schema';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { whiteboards } from '@domain/common/whiteboard/whiteboard.schema';
import { templatesSets } from '@domain/template/templates-set/templates.set.schema';
import { templateContentSpaces } from '@domain/template/template-content-space/template.content.space.schema';

export const templatesRelations = relations(templates, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns via nameableColumns)
  authorization: one(authorizationPolicies, {
    fields: [templates.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne: profile (from nameableColumns)
  profile: one(profiles, {
    fields: [templates.profileId],
    references: [profiles.id],
  }),

  // OneToOne with @JoinColumn: CommunityGuidelines
  communityGuidelines: one(communityGuidelines, {
    fields: [templates.communityGuidelinesId],
    references: [communityGuidelines.id],
  }),

  // OneToOne with @JoinColumn: Callout
  callout: one(callouts, {
    fields: [templates.calloutId],
    references: [callouts.id],
  }),

  // OneToOne with @JoinColumn: Whiteboard
  whiteboard: one(whiteboards, {
    fields: [templates.whiteboardId],
    references: [whiteboards.id],
  }),

  // OneToOne with @JoinColumn: TemplateContentSpace
  contentSpace: one(templateContentSpaces, {
    fields: [templates.contentSpaceId],
    references: [templateContentSpaces.id],
  }),

  // ManyToOne: TemplatesSet
  templatesSet: one(templatesSets, {
    fields: [templates.templatesSetId],
    references: [templatesSets.id],
  }),
}));
