import { pgTable, varchar, integer, boolean, uuid } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const licenseEntitlements = pgTable('license_entitlement', {
  ...baseColumns,

  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  dataType: varchar('dataType', { length: ENUM_LENGTH }).notNull(),
  limit: integer('limit').notNull(),
  enabled: boolean('enabled').notNull(),

  // ManyToOne: License
  licenseId: uuid('licenseId'),
});
