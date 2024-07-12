import { Module } from '@nestjs/common';
import { CommunityRoleApplicationLifecycleOptionsProvider } from './community.role.lifecycle.application.options.provider';
import { CommunityResolverFields } from './community.role.resolver.fields';
import { CommunityRoleResolverMutations } from './community.role.resolver.mutations';
import { CommunityRoleEventsService } from './community.role.service.events';
import { CommunityModule } from '../community/community.module';
import { CommunityRoleService } from './community.role.service';
import { CommunityRoleInvitationLifecycleOptionsProvider } from './community.role.lifecycle.invitation.options.provider';

@Module({
  imports: [CommunityModule],
  providers: [
    CommunityRoleService,
    CommunityRoleEventsService,
    CommunityRoleResolverMutations,
    CommunityResolverFields,
    CommunityRoleApplicationLifecycleOptionsProvider,
    CommunityRoleInvitationLifecycleOptionsProvider,
  ],
  exports: [CommunityRoleService],
})
export class CommunityRoleModule {}
