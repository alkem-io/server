import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from './platform.authorization.policy.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from '@platform/platfrom/platform.entity';

@Module({
  imports: [AuthorizationPolicyModule, TypeOrmModule.forFeature([Platform])],
  providers: [PlatformAuthorizationPolicyService],
  exports: [PlatformAuthorizationPolicyService],
})
export class PlatformAuthorizationPolicyModule {}
