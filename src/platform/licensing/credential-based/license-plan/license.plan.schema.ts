import { pgTable, text, boolean, integer, decimal, varchar, uuid } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const licensePlans = pgTable('license_plan', {
  ...baseColumns,
  licensingFrameworkId: uuid('licensingFrameworkId'),
  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  sortOrder: integer('sortOrder').notNull(),
  pricePerMonth: decimal('pricePerMonth', { precision: 10, scale: 2 }),
  isFree: boolean('isFree').notNull().default(false),
  trialEnabled: boolean('trialEnabled').notNull().default(false),
  requiresPaymentMethod: boolean('requiresPaymentMethod').notNull().default(false),
  requiresContactSupport: boolean('requiresContactSupport').notNull().default(false),
  licenseCredential: text('licenseCredential').notNull(),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  assignToNewOrganizationAccounts: boolean('assignToNewOrganizationAccounts')
    .notNull()
    .default(false),
  assignToNewUserAccounts: boolean('assignToNewUserAccounts')
    .notNull()
    .default(false),
});
