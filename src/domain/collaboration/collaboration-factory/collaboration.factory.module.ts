import { Module } from '@nestjs/common';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { CollaborationFactoryService } from './collaboration.factory.service';
import { CalloutFramingModule } from '../callout-framing/callout.framing.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { InnovationFlowStatesModule } from '../innovation-flow-states/innovation.flow.state.module';

@Module({
  imports: [
    CollaborationModule,
    CalloutFramingModule,
    ProfileModule,
    InnovationFlowStatesModule,
  ],
  providers: [CollaborationFactoryService],
  exports: [CollaborationFactoryService],
})
export class CollaborationFactoryModule {}
