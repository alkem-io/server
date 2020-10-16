import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils/forward-ref.util';
import { AuthenticationModule } from '../authentication/authentication.module';
import { MsGraphService } from './ms-graph.service';

@Module({
  providers: [MsGraphService],
  exports: [MsGraphService],
  imports: [forwardRef(() => AuthenticationModule)],
})
export class MsGraphModule {}
