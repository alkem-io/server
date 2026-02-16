import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const communityGuidelines = pgTable('community_guidelines', {
  ...authorizableColumns,

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),
});
