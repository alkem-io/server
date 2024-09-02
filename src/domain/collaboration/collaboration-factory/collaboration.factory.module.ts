import { Module } from '@nestjs/common';
import { CollaborationFactoryService } from './collaboration.factory.service';
import { CalloutFramingModule } from '../callout-framing/callout.framing.module';
import { InnovationFlowStatesModule } from '../innovation-flow-states/innovation.flow.state.module';

@Module({
  imports: [CalloutFramingModule, InnovationFlowStatesModule],
  providers: [CollaborationFactoryService],
  exports: [CollaborationFactoryService],
})
export class CollaborationFactoryModule {}
