import { Module } from '@nestjs/common';
import { UserLookupService } from './user.lookup.service';

@Module({
  imports: [], // Important this is empty!
  providers: [UserLookupService],
  exports: [UserLookupService],
})
export class UserLookupModule {}
