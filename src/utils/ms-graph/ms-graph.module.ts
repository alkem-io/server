import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { MsGraphService } from './ms-graph.service';

@Module({
  providers: [MsGraphService],
  exports: [MsGraphService],
  imports: [AuthenticationModule],
})
export class MsGraphModule {}
