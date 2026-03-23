import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Callout } from '../callout.entity';
import { CalloutLookupService } from './callout.lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Callout])], // Important this is empty!
  providers: [CalloutLookupService],
  exports: [CalloutLookupService],
})
export class CalloutLookupModule {}
