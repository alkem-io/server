import { pgTable, text } from 'drizzle-orm/pg-core';
import { baseColumns } from '@config/drizzle/base.columns';

export const calloutContributionDefaults = pgTable('callout_contribution_defaults', {
  ...baseColumns,

  defaultDisplayName: text('defaultDisplayName'),
  postDescription: text('postDescription'),
  whiteboardContent: text('whiteboardContent'),
});
