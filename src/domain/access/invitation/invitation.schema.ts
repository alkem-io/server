import { pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, LONGER_TEXT_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const invitations = pgTable('invitation', {
  ...authorizableColumns,

  invitedContributorID: uuid('invitedContributorID').notNull(),
  createdBy: uuid('createdBy').notNull(),
  welcomeMessage: varchar('welcomeMessage', { length: LONGER_TEXT_LENGTH }),
  invitedToParent: boolean('invitedToParent').default(false).notNull(),
  contributorType: varchar('contributorType', { length: ENUM_LENGTH }).notNull(),
  extraRoles: simpleArray('extraRoles').notNull(),

  // OneToOne with @JoinColumn: Lifecycle
  lifecycleId: uuid('lifecycleId'),

  // ManyToOne: RoleSet
  roleSetId: uuid('roleSetId'),
});
