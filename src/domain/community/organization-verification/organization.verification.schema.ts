import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const organizationVerifications = pgTable('organization_verification', {
  ...authorizableColumns,

  organizationID: varchar('organizationID', { length: UUID_LENGTH }).notNull(),
  status: varchar('status', { length: ENUM_LENGTH }).default('not_verified'),

  // OneToOne with @JoinColumn: Lifecycle
  lifecycleId: uuid('lifecycleId'),
});
