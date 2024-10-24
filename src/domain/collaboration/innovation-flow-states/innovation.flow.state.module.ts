import { Module } from '@nestjs/common';
import { InnovationFlowStatesService } from './innovation.flow.state.service';

@Module({
  imports: [],
  providers: [InnovationFlowStatesService],
  exports: [InnovationFlowStatesService],
})
export class InnovationFlowStatesModule {}
