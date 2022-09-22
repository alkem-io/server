import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicy } from './authorization.policy.entity';
import { AuthorizationPolicyResolverFields } from './authorization.policy.resolver.fields';

import { AuthorizationPolicyService } from './authorization.policy.service';

@Module({
  imports: [
    AuthorizationModule,
    TypeOrmModule.forFeature([AuthorizationPolicy]),
  ],
  providers: [AuthorizationPolicyService, AuthorizationPolicyResolverFields],
  exports: [AuthorizationPolicyService],
})
export class AuthorizationPolicyModule {}
