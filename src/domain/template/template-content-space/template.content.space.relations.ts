import { relations } from 'drizzle-orm';
import { templateContentSpaces } from './template.content.space.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { spaceAbouts } from '@domain/space/space.about/space.about.schema';

export const templateContentSpacesRelations = relations(
  templateContentSpaces,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [templateContentSpaces.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // ManyToOne: self-referencing parentSpace
    parentSpace: one(templateContentSpaces, {
      fields: [templateContentSpaces.parentSpaceId],
      references: [templateContentSpaces.id],
      relationName: 'parentChild',
    }),

    // OneToMany: subspaces (self-referencing)
    subspaces: many(templateContentSpaces, { relationName: 'parentChild' }),

    // OneToOne with @JoinColumn: Collaboration
    collaboration: one(collaborations, {
      fields: [templateContentSpaces.collaborationId],
      references: [collaborations.id],
    }),

    // OneToOne with @JoinColumn: SpaceAbout
    about: one(spaceAbouts, {
      fields: [templateContentSpaces.aboutId],
      references: [spaceAbouts.id],
    }),
  })
);
