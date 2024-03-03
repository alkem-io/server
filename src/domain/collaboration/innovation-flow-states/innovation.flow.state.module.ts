import { Module } from '@nestjs/common';
import { InnovationFlowStatesService } from './innovaton.flow.state.service';

@Module({
  imports: [],
  providers: [InnovationFlowStatesService],
  exports: [InnovationFlowStatesService],
})
export class InnovationFlowStatesModule {}
