import { Module } from '@nestjs/common';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { SpaceLookupService } from './space.lookup.service';

@Module({
  imports: [AccountLookupModule],
  providers: [SpaceLookupService],
  exports: [SpaceLookupService],
})
export class SpaceLookupModule {}
