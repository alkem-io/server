import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { MsGraphService } from './ms-graph.service';

@Module({
  imports: [AuthenticationModule],
  providers: [MsGraphService],
  exports: [MsGraphService],
})
export class MsGraphModule {}
