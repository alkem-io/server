import { relations } from 'drizzle-orm';
import { spaces } from './space.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { accounts } from '@domain/space/account/account.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { spaceAbouts } from '@domain/space/space.about/space.about.schema';
import { communities } from '@domain/community/community/community.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';
import { templatesManagers } from '@domain/template/templates-manager/templates.manager.schema';
import { licenses } from '@domain/common/license/license.schema';

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [spaces.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne: self-referencing parentSpace
  parentSpace: one(spaces, {
    fields: [spaces.parentSpaceId],
    references: [spaces.id],
    relationName: 'parentChild',
  }),

  // OneToMany: subspaces (self-referencing)
  subspaces: many(spaces, { relationName: 'parentChild' }),

  // ManyToOne: Account
  account: one(accounts, {
    fields: [spaces.accountId],
    references: [accounts.id],
  }),

  // OneToOne with @JoinColumn: Collaboration
  collaboration: one(collaborations, {
    fields: [spaces.collaborationId],
    references: [collaborations.id],
  }),

  // OneToOne with @JoinColumn: SpaceAbout
  about: one(spaceAbouts, {
    fields: [spaces.aboutId],
    references: [spaceAbouts.id],
  }),

  // OneToOne with @JoinColumn: Community
  community: one(communities, {
    fields: [spaces.communityId],
    references: [communities.id],
  }),

  // OneToOne with @JoinColumn: Agent
  agent: one(agents, {
    fields: [spaces.agentId],
    references: [agents.id],
  }),

  // OneToOne with @JoinColumn: StorageAggregator
  storageAggregator: one(storageAggregators, {
    fields: [spaces.storageAggregatorId],
    references: [storageAggregators.id],
  }),

  // OneToOne with @JoinColumn: TemplatesManager
  templatesManager: one(templatesManagers, {
    fields: [spaces.templatesManagerId],
    references: [templatesManagers.id],
  }),

  // OneToOne with @JoinColumn: License
  license: one(licenses, {
    fields: [spaces.licenseId],
    references: [licenses.id],
  }),
}));
