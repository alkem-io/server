import { pgTable, varchar, jsonb } from 'drizzle-orm/pg-core';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const locations = pgTable('location', {
  ...baseColumns,

  city: varchar('city', { length: SMALL_TEXT_LENGTH }),
  country: varchar('country', { length: SMALL_TEXT_LENGTH }),
  addressLine1: varchar('addressLine1', { length: MID_TEXT_LENGTH }),
  addressLine2: varchar('addressLine2', { length: MID_TEXT_LENGTH }),
  stateOrProvince: varchar('stateOrProvince', { length: SMALL_TEXT_LENGTH }),
  postalCode: varchar('postalCode', { length: SMALL_TEXT_LENGTH }),
  geoLocation: jsonb('geoLocation').notNull(),
});
