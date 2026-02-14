import { pgTable, text } from 'drizzle-orm/pg-core';
import { baseColumns } from '@config/drizzle/base.columns';

export const lifecycles = pgTable('lifecycle', {
  ...baseColumns,

  machineState: text('machineState'),
});
