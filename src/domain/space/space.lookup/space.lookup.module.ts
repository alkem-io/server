import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { Space } from '../space/space.entity';
import { SpaceLookupService } from './space.lookup.service';

@Module({
  imports: [AccountLookupModule, TypeOrmModule.forFeature([Space])], // Important this is empty!
  providers: [SpaceLookupService],
  exports: [SpaceLookupService],
})
export class SpaceLookupModule {}
