import { Module } from '@nestjs/common';
import { HubFilterService } from './hub.filter.service';

@Module({
  imports: [],
  providers: [HubFilterService],
  exports: [HubFilterService],
})
export class HubFilterModule {}
