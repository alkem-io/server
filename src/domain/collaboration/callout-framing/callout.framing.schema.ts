import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const calloutFramings = pgTable('callout_framing', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }).notNull().default('none'),

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),

  // OneToOne with @JoinColumn: Whiteboard
  whiteboardId: uuid('whiteboardId'),

  // OneToOne with @JoinColumn: Link
  linkId: uuid('linkId'),

  // OneToOne with @JoinColumn: Memo
  memoId: uuid('memoId'),

  // OneToOne with @JoinColumn: MediaGallery
  mediaGalleryId: uuid('mediaGalleryId'),
});
