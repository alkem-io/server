import { Module } from '@nestjs/common';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { CollaborationFactoryService } from './collaboration.factory.service';
import { CalloutFramingModule } from '../callout-framing/callout.framing.module';
import { InnovationFlowStatesModule } from '../innovation-flow-states/innovation.flow.state.module';

@Module({
  imports: [
    CollaborationModule,
    CalloutFramingModule,
    InnovationFlowStatesModule,
  ],
  providers: [CollaborationFactoryService],
  exports: [CollaborationFactoryService],
})
export class CollaborationFactoryModule {}
