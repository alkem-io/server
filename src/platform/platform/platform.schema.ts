import { pgTable, uuid, jsonb } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';
import type { IPlatformSettings } from '@platform/platform-settings/platform.settings.interface';
import type { IPlatformWellKnownVirtualContributors } from '@platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.interface';

export const platforms = pgTable('platform', {
  ...authorizableColumns,
  settings: jsonb('settings').notNull().$type<IPlatformSettings>(),
  wellKnownVirtualContributors: jsonb('wellKnownVirtualContributors')
    .notNull()
    .$type<IPlatformWellKnownVirtualContributors>(),

  // OneToOne FK columns (owned by this table via @JoinColumn)
  forumId: uuid('forumId'),
  libraryId: uuid('libraryId'),
  templatesManagerId: uuid('templatesManagerId'),
  storageAggregatorId: uuid('storageAggregatorId'),
  licensingFrameworkId: uuid('licensingFrameworkId'),
  roleSetId: uuid('roleSetId'),
  messagingId: uuid('messagingId'),
});
