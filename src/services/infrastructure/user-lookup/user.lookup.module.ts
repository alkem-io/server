import { Module } from '@nestjs/common';
import { UserLookupService } from './user.lookup.service';

@Module({
  imports: [],
  providers: [UserLookupService],
  exports: [UserLookupService],
})
export class UserLookupModule {}
