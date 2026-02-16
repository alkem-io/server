import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const profiles = pgTable('profile', {
  ...authorizableColumns,

  displayName: text('displayName').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),

  // OneToOne with @JoinColumn: Location
  locationId: uuid('locationId'),

  // OneToOne with @JoinColumn: StorageBucket
  storageBucketId: uuid('storageBucketId'),
});
