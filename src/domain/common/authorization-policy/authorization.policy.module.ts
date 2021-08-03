import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationDefinition } from './authorization.policy.entity';
import { AuthorizationPolicyResolverFields } from './authorization.policy.resolver.fields';
import { AuthorizationPolicyService } from './authorization.policy.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorizationDefinition])],
  providers: [AuthorizationPolicyService, AuthorizationPolicyResolverFields],
  exports: [AuthorizationPolicyService],
})
export class AuthorizationPolicyModule {}
