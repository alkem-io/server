import { relations } from 'drizzle-orm';
import { callouts } from './callout.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { calloutFramings } from '@domain/collaboration/callout-framing/callout.framing.schema';
import { calloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.schema';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';
import { calloutsSets } from '@domain/collaboration/callouts-set/callouts.set.schema';
import { rooms } from '@domain/communication/room/room.schema';
import { classifications } from '@domain/common/classification/classification.schema';

export const calloutsRelations = relations(callouts, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [callouts.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: CalloutFraming
  framing: one(calloutFramings, {
    fields: [callouts.framingId],
    references: [calloutFramings.id],
  }),

  // OneToOne with @JoinColumn: Classification
  classification: one(classifications, {
    fields: [callouts.classificationId],
    references: [classifications.id],
  }),

  // OneToOne with @JoinColumn: CalloutContributionDefaults
  contributionDefaults: one(calloutContributionDefaults, {
    fields: [callouts.contributionDefaultsId],
    references: [calloutContributionDefaults.id],
  }),

  // OneToOne with @JoinColumn: Room (comments)
  comments: one(rooms, {
    fields: [callouts.commentsId],
    references: [rooms.id],
  }),

  // OneToMany: contributions
  contributions: many(calloutContributions),

  // ManyToOne: CalloutsSet
  calloutsSet: one(calloutsSets, {
    fields: [callouts.calloutsSetId],
    references: [calloutsSets.id],
  }),
}));
