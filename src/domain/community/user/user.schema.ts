import { pgTable, uuid, varchar, integer, boolean, index } from 'drizzle-orm/pg-core';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { contributorColumns } from '@config/drizzle/base.columns';

export const users = pgTable(
  'user',
  {
    ...contributorColumns,

    accountID: uuid('accountID').notNull(),
    rowId: integer('rowId').generatedAlwaysAsIdentity().unique(),
    firstName: varchar('firstName', { length: SMALL_TEXT_LENGTH }).notNull(),
    lastName: varchar('lastName', { length: SMALL_TEXT_LENGTH }).notNull(),
    email: varchar('email', { length: MID_TEXT_LENGTH }).notNull().unique(),
    phone: varchar('phone', { length: SMALL_TEXT_LENGTH }),
    authenticationID: uuid('authenticationID').unique(),
    serviceProfile: boolean('serviceProfile').notNull(),

    // OneToOne with @JoinColumn: UserSettings
    settingsId: uuid('settingsId'),

    // OneToOne with @JoinColumn: StorageAggregator
    storageAggregatorId: uuid('storageAggregatorId'),
  },
  (table) => [
    index('IDX_user_authenticationID').on(table.authenticationID),
  ]
);
