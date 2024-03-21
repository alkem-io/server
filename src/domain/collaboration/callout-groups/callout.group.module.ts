import { Module } from '@nestjs/common';
import { CalloutGroupsService } from './callout.group.service';

@Module({
  imports: [],
  providers: [CalloutGroupsService],
  exports: [CalloutGroupsService],
})
export class CalloutGroupsModule {}
