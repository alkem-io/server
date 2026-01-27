import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { PlatformAuthorizationPolicyService } from './platform.authorization.policy.service';

@Module({
  imports: [AuthorizationPolicyModule, TypeOrmModule.forFeature([Platform])],
  providers: [PlatformAuthorizationPolicyService],
  exports: [PlatformAuthorizationPolicyService],
})
export class PlatformAuthorizationPolicyModule {}
