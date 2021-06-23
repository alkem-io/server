import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';
import { Module } from '@nestjs/common';
import { AuthorizationEngineService } from './authorization-engine.service';

@Module({
  imports: [AuthorizationDefinitionModule],
  providers: [AuthorizationEngineService],
  exports: [AuthorizationEngineService],
})
export class AuthorizationEngineModule {}
