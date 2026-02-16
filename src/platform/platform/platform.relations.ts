import { relations } from 'drizzle-orm';
import { platforms } from './platform.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { forums } from '@platform/forum/forum.schema';
import { libraries } from '@library/library/library.schema';
import { licensingFrameworks } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.schema';
import { messagings } from '@domain/communication/messaging/messaging.schema';
import { templatesManagers } from '@domain/template/templates-manager/templates.manager.schema';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';

export const platformsRelations = relations(platforms, ({ one }) => ({
  authorization: one(authorizationPolicies, {
    fields: [platforms.authorizationId],
    references: [authorizationPolicies.id],
  }),
  forum: one(forums, {
    fields: [platforms.forumId],
    references: [forums.id],
  }),
  library: one(libraries, {
    fields: [platforms.libraryId],
    references: [libraries.id],
  }),
  licensingFramework: one(licensingFrameworks, {
    fields: [platforms.licensingFrameworkId],
    references: [licensingFrameworks.id],
  }),
  messaging: one(messagings, {
    fields: [platforms.messagingId],
    references: [messagings.id],
  }),
  templatesManager: one(templatesManagers, {
    fields: [platforms.templatesManagerId],
    references: [templatesManagers.id],
  }),
  storageAggregator: one(storageAggregators, {
    fields: [platforms.storageAggregatorId],
    references: [storageAggregators.id],
  }),
  roleSet: one(roleSets, {
    fields: [platforms.roleSetId],
    references: [roleSets.id],
  }),
}));
