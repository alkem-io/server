import { Module } from '@nestjs/common';
import { ForumDiscussionLookupService } from './forum.discussion.lookup.service';

@Module({
  imports: [], // Important this is empty!
  providers: [ForumDiscussionLookupService],
  exports: [ForumDiscussionLookupService],
})
export class ForumDiscussionLookupModule {}
