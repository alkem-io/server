import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { MemoModule } from '@domain/common/memo/memo.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { LinkModule } from '../link/link.module';
import { PostModule } from '../post/post.module';
import { CalloutContributionResolverFields } from './callout.contribution.resolver.fields';
import { CalloutContributionService } from './callout.contribution.service';
import { CalloutContributionAuthorizationService } from './callout.contribution.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    WhiteboardModule,
    PostModule,
    NamingModule,
    LinkModule,
    MemoModule,
    UserLookupModule,
    RoleSetModule,
    PlatformRolesAccessModule,
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
