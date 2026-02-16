import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const applications = pgTable('application', {
  ...authorizableColumns,

  // OneToOne with @JoinColumn: Lifecycle
  lifecycleId: uuid('lifecycleId'),

  // ManyToOne: User
  userId: uuid('userId'),

  // ManyToOne: RoleSet
  roleSetId: uuid('roleSetId'),
});
