import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge.base.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBase } from './knowledge.base.entity';
import { KnowledgeBaseAuthorizationService } from './knowledge.base.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { KnowledgeBaseResolverFields } from './knowledge.base.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    CalloutsSetModule,
    TypeOrmModule.forFeature([KnowledgeBase]),
  ],
  providers: [
    KnowledgeBaseService,
    KnowledgeBaseAuthorizationService,
    KnowledgeBaseResolverFields,
  ],
  exports: [KnowledgeBaseService, KnowledgeBaseAuthorizationService],
})
export class KnowledgeBaseModule {}
