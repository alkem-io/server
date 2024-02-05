import { Module } from '@nestjs/common';
import { CalloutContributionService } from './callout.contribution.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalloutContribution } from './callout.contribution.entity';
import { CalloutContributionAuthorizationService } from './callout.contribution.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CalloutContributionResolverFields } from './callout.contribution.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { PostModule } from '../post/post.module';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { UserLookupModule } from '@services/infrastructure/user-lookup/user.lookup.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    WhiteboardModule,
    PostModule,
    NamingModule,
    ReferenceModule,
    UserLookupModule,
    CommunityPolicyModule,
    TypeOrmModule.forFeature([CalloutContribution]),
  ],
  providers: [
    CalloutContributionService,
    CalloutContributionAuthorizationService,
    CalloutContributionResolverFields,
  ],
  exports: [
    CalloutContributionService,
    CalloutContributionAuthorizationService,
  ],
})
export class CalloutContributionModule {}
