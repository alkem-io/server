import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common/utils/forward-ref.util';
import { AuthenticationModule } from '@utils/authentication/authentication.module';
import { MsGraphService } from './ms-graph.service';

@Module({
  imports: [forwardRef(() => AuthenticationModule)],
  providers: [MsGraphService],
  exports: [MsGraphService],
})
export class MsGraphModule {}
