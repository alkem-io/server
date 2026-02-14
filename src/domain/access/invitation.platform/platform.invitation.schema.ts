import { pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { SMALL_TEXT_LENGTH, LONGER_TEXT_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const platformInvitations = pgTable('platform_invitation', {
  ...authorizableColumns,

  roleSetInvitedToParent: boolean('roleSetInvitedToParent').default(false).notNull(),
  roleSetExtraRoles: simpleArray('roleSetExtraRoles').notNull(),
  email: varchar('email', { length: SMALL_TEXT_LENGTH }).notNull(),
  firstName: varchar('firstName', { length: SMALL_TEXT_LENGTH }),
  lastName: varchar('lastName', { length: SMALL_TEXT_LENGTH }),
  createdBy: uuid('createdBy').notNull(),
  welcomeMessage: varchar('welcomeMessage', { length: LONGER_TEXT_LENGTH }),
  profileCreated: boolean('profileCreated').default(false).notNull(),

  // ManyToOne: RoleSet
  roleSetId: uuid('roleSetId'),
});
