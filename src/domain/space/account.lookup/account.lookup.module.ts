import { Module } from '@nestjs/common';
import { AccountLookupService } from './account.lookup.service';

@Module({
  imports: [], // Important this is empty!
  providers: [AccountLookupService],
  exports: [AccountLookupService],
})
export class AccountLookupModule {}
