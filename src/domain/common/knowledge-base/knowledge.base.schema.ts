import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const knowledgeBases = pgTable('knowledge_base', {
  ...authorizableColumns,

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),

  // OneToOne with @JoinColumn: CalloutsSet
  calloutsSetId: uuid('calloutsSetId'),
});
