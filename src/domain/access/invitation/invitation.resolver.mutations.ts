import { AuthorizationPrivilege } from '@common/enums';
import { RoleSetType } from '@common/enums/role.set.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { OrgCommunityGateService } from '@domain/access/role-set/org.community.gate.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { OrganizationAdministrationAuditService } from '@src/platform-admin/organization-administration-audit/organization.administration.audit.service';
import { DeleteInvitationInput } from './dto/invitation.dto.delete';
import { IInvitation } from './invitation.interface';
import { InvitationService } from './invitation.service';
import {
  emitSpaceInvitationAcceptorsChanged,
  isAcceptedByAccountAdmins,
} from './invitation.space.acceptors.event';

@InstrumentResolver()
@Resolver()
export class InvitationResolverMutations {
  constructor(
    private invitationService: InvitationService,
    private actorLookupService: ActorLookupService,
    private eventEmitter: EventEmitter2,
    private orgCommunityGate: OrgCommunityGateService,
    private organizationAdministrationAuditService: OrganizationAdministrationAuditService
  ) {}

  @Mutation(() => IInvitation, {
    description: 'Removes the specified User invitation.',
  })
  async deleteInvitation(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitation = await this.invitationService.getInvitationOrFail(
      deleteData.ID,
      { relations: { roleSet: true } }
    );
    // Revoking a pending invitation is a Community-tab action: the
    // organization's admins via DELETE, Platform Support via its membership
    // privilege — never on an invitation addressed to the Support user.
    const branch = this.orgCommunityGate.authorizeOrFail(
      actorContext,
      invitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete invitation to community: ${invitation.id}`,
      { targetActorID: invitation.invitedActorID }
    );
    const deleted = await this.invitationService.deleteInvitation(deleteData);

    if (branch === 'platform-support' && invitation.roleSet) {
      await this.organizationAdministrationAuditService.record({
        actorContext,
        roleSetId: invitation.roleSet.id,
        action: 'revoke_user_invitation',
        targetUserId: invitation.invitedActorID,
        invitationId: invitation.id,
      });
    }

    const invitedActorType = await this.actorLookupService.getActorTypeById(
      invitation.invitedActorID
    );
    if (
      invitation.roleSet?.type === RoleSetType.SPACE &&
      isAcceptedByAccountAdmins(invitedActorType)
    ) {
      await emitSpaceInvitationAcceptorsChanged(this.eventEmitter, [
        invitation.roleSet.id,
      ]);
    }
    return deleted;
  }
}
