import { CommunityModule } from '@domain/community/community/community.module';
import { forwardRef } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application.module';
import { ApplicationLifecycleMachineService } from './application.lifecycle.service';

@Module({
  imports: [
    forwardRef(() => CommunityModule),
    // CommunityModule,
    ApplicationModule,
  ],
  providers: [ApplicationLifecycleMachineService],
  exports: [ApplicationLifecycleMachineService],
})
export class ApplicationLifecycleModule {}
