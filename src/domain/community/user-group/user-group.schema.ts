import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const userGroups = pgTable('user_group', {
  ...authorizableColumns,

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),

  // ManyToOne: Organization
  organizationId: uuid('organizationId'),

  // ManyToOne: Community
  communityId: uuid('communityId'),
});
