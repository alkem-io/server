import { relations } from 'drizzle-orm';
import { accounts } from './account.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { spaces } from '@domain/space/space/space.schema';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { innovationHubs } from '@domain/innovation-hub/innovation.hub.schema';
import { innovationPacks } from '@library/innovation-pack/innovation.pack.schema';
import { licenses } from '@domain/common/license/license.schema';

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [accounts.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Agent
  agent: one(agents, {
    fields: [accounts.agentId],
    references: [agents.id],
  }),

  // OneToOne with @JoinColumn: StorageAggregator
  storageAggregator: one(storageAggregators, {
    fields: [accounts.storageAggregatorId],
    references: [storageAggregators.id],
  }),

  // OneToMany: spaces
  spaces: many(spaces),

  // OneToMany: virtualContributors
  virtualContributors: many(virtualContributors),

  // OneToMany: innovationHubs
  innovationHubs: many(innovationHubs),

  // OneToMany: innovationPacks
  innovationPacks: many(innovationPacks),

  // OneToOne with @JoinColumn: License
  license: one(licenses, {
    fields: [accounts.licenseId],
    references: [licenses.id],
  }),
}));
