import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TagsetModule } from '../tagset/tagset.module';
import { KnowledgeBaseResolverFields } from './knowledge.base.resolver.fields';
import { KnowledgeBaseService } from './knowledge.base.service';
import { KnowledgeBaseAuthorizationService } from './knowledge.base.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TagsetModule,
    CalloutsSetModule,
  ],
  providers: [
    KnowledgeBaseService,
    KnowledgeBaseAuthorizationService,
    KnowledgeBaseResolverFields,
  ],
  exports: [KnowledgeBaseService, KnowledgeBaseAuthorizationService],
})
export class KnowledgeBaseModule {}
