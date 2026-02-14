import { pgTable, uuid, varchar, integer, jsonb } from 'drizzle-orm/pg-core';
import { contributorColumns } from '@config/drizzle/base.columns';

export const organizations = pgTable('organization', {
  ...contributorColumns,

  accountID: uuid('accountID').notNull(),
  settings: jsonb('settings').notNull(),
  rowId: integer('rowId').generatedAlwaysAsIdentity().unique(),
  legalEntityName: varchar('legalEntityName', { length: 255 }),
  domain: varchar('domain', { length: 255 }),
  website: varchar('website', { length: 255 }),
  contactEmail: varchar('contactEmail', { length: 255 }),

  // OneToOne with @JoinColumn: OrganizationVerification
  verificationId: uuid('verificationId'),

  // OneToOne with @JoinColumn: StorageAggregator
  storageAggregatorId: uuid('storageAggregatorId'),

  // OneToOne with @JoinColumn: RoleSet
  roleSetId: uuid('roleSetId'),
});
