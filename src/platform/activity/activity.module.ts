import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Module({
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
