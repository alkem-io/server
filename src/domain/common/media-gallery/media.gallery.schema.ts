import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const mediaGalleries = pgTable('media_gallery', {
  ...authorizableColumns,

  createdBy: uuid('createdBy'),

  // OneToOne with @JoinColumn: StorageBucket
  storageBucketId: uuid('storageBucketId'),
});
