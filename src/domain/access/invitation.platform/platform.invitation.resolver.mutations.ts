import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { OrgCommunityGateService } from '@domain/access/role-set/org.community.gate.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { OrganizationAdministrationAuditService } from '@src/platform-admin/organization-administration-audit/organization.administration.audit.service';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { IPlatformInvitation } from './platform.invitation.interface';
import { PlatformInvitationService } from './platform.invitation.service';

@InstrumentResolver()
@Resolver()
export class PlatformInvitationResolverMutations {
  constructor(
    private platformInvitationService: PlatformInvitationService,
    private orgCommunityGate: OrgCommunityGateService,
    private organizationAdministrationAuditService: OrganizationAdministrationAuditService
  ) {}

  @Mutation(() => IPlatformInvitation, {
    description: 'Removes the specified User platformInvitation.',
  })
  async deletePlatformInvitation(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeletePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    const platformInvitation =
      await this.platformInvitationService.getPlatformInvitationOrFail(
        deleteData.ID,
        { relations: { roleSet: true } }
      );
    // No self-target check: an address belonging to a registered user is
    // invited as that user, so an email invitation never carries the acting
    // Support user's own address.
    const branch = this.orgCommunityGate.authorizeOrFail(
      actorContext,
      platformInvitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete platformInvitation: ${platformInvitation.id}`
    );
    const deleted =
      await this.platformInvitationService.deletePlatformInvitation(deleteData);

    if (branch === 'platform-support' && platformInvitation.roleSet) {
      await this.organizationAdministrationAuditService.record({
        actorContext,
        roleSetId: platformInvitation.roleSet.id,
        action: 'revoke_email_invitation',
        platformInvitationId: platformInvitation.id,
      });
    }
    return deleted;
  }
}
