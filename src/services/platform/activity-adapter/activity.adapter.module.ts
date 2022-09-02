import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { ActivityAdapter } from './activity.adapter';

@Module({
  imports: [ActivityModule, TypeOrmModule.forFeature([Collaboration])],
  providers: [ActivityAdapter],
  exports: [ActivityAdapter],
})
export class ActivityAdapterModule {}
