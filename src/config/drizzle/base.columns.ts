import { integer, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';

/**
 * Replaces BaseAlkemioEntity: id, createdDate, updatedDate, version
 */
export const baseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdDate: timestamp('createdDate', { mode: 'date' }).defaultNow().notNull(),
  updatedDate: timestamp('updatedDate', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
  version: integer('version').default(1).notNull(),
};

/**
 * Replaces AuthorizableEntity: baseColumns + authorizationId FK
 * Note: The FK reference to authorizationPolicies is defined inline where used
 * to avoid circular import issues with lazy references.
 */
export const authorizableColumns = {
  ...baseColumns,
  authorizationId: uuid('authorizationId'),
};

/**
 * Replaces NameableEntity: authorizableColumns + nameID + profileId FK
 */
export const nameableColumns = {
  ...authorizableColumns,
  nameID: varchar('nameID', { length: NAMEID_MAX_LENGTH_SCHEMA }).notNull(),
  profileId: uuid('profileId'),
};

/**
 * Replaces ContributorBase: nameableColumns + agentId FK
 * Note: ContributorBase also adds unique constraint on nameID — handled at table level.
 */
export const contributorColumns = {
  ...nameableColumns,
  agentId: uuid('agentId'),
};
