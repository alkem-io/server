import { Module } from '@nestjs/common';
import { AuthorizationEngineService } from './authorization-engine.service';

@Module({
  imports: [],
  providers: [AuthorizationEngineService],
  exports: [AuthorizationEngineService],
})
export class AuthorizationEngineModule {}
