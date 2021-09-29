import { Module } from '@nestjs/common';
import { AuthorizationEngineModule } from '@services/platform/authorization-engine/authorization-engine.module';
import { AuthorizableService } from './authorizable.service';

@Module({
  imports: [AuthorizationEngineModule],
  providers: [AuthorizableService],
  exports: [AuthorizableService],
})
export class AuthorizableEntityModule {}
