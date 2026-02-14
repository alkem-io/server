import { pgTable, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const accounts = pgTable('account', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }),
  externalSubscriptionID: varchar('externalSubscriptionID', { length: ENUM_LENGTH }),
  baselineLicensePlan: jsonb('baselineLicensePlan').notNull(),

  // OneToOne with @JoinColumn: Agent
  agentId: uuid('agentId'),

  // OneToOne with @JoinColumn: License
  licenseId: uuid('licenseId'),

  // OneToOne with @JoinColumn: StorageAggregator
  storageAggregatorId: uuid('storageAggregatorId'),
});
