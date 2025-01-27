import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  RoleSetPolicyRoleLimitsException,
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Not, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LogContext } from '@common/enums/logging.context';
import { IForm } from '@domain/common/form/form.interface';
import { FormService } from '@domain/common/form/form.service';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { CreateRoleSetInput } from './dto/role.set.dto.create';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleService } from '../role/role.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IRole } from '../role/role.interface';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IInvitation } from '../invitation/invitation.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetRoleImplicit } from '@common/enums/role.set.role.implicit';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoleName } from '@common/enums/role.name';
import { IApplication } from '../application/application.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { RoleSetUpdateType } from '@common/enums/role.set.update.type';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { CreateApplicationInput } from '../application/dto/application.dto.create';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { InviteNewContributorForRoleOnRoleSetInput } from './dto/role.set.dto.platform.invitation.community';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { CreatePlatformInvitationInput } from '@domain/access/invitation.platform/dto/platform.invitation.dto.create';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { RoleSetEventsService } from './role.set.service.events';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CommunityCommunicationService } from '@domain/community/community-communication/community.communication.service';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { RoleSetType } from '@common/enums/role.set.type';

@Injectable()
export class RoleSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private formService: FormService,
    private roleService: RoleService,
    private agentService: AgentService,
    private contributorService: ContributorService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private communityResolverService: CommunityResolverService,
    private roleSetEventsService: RoleSetEventsService,
    private aiServerAdapter: AiServerAdapter,
    private communityCommunicationService: CommunityCommunicationService,
    private licenseService: LicenseService,
    @InjectRepository(RoleSet)
    private roleSetRepository: Repository<RoleSet>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoleSet(roleSetData: CreateRoleSetInput): Promise<IRoleSet> {
    const roleSet: IRoleSet = new RoleSet();
    roleSet.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ROLE_SET
    );
    roleSet.roles = [];
    roleSet.applications = [];
    roleSet.invitations = [];
    roleSet.platformInvitations = [];
    roleSet.entryRoleName = roleSetData.entryRoleName;
    roleSet.type = roleSetData.type;

    roleSet.parentRoleSet = roleSetData.parentRoleSet;

    for (const roleData of roleSetData.roles) {
      const role = this.roleService.createRole(roleData);
      roleSet.roles.push(role);
    }

    roleSet.applicationForm = this.formService.createForm(
      roleSetData.applicationForm
    );

    roleSet.license = this.licenseService.createLicense({
      type: LicenseType.ROLESET,
      entitlements: [
        {
          type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
      ],
    });

    return roleSet;
  }

  async getRoleSetOrFail(
    roleSetID: string,
    options?: FindOneOptions<RoleSet>
  ): Promise<IRoleSet | never> {
    const roleSet = await this.roleSetRepository.findOne({
      where: { id: roleSetID },
      ...options,
    });
    if (!roleSet)
      throw new EntityNotFoundException(
        `Unable to find RoleSet with ID: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    return roleSet;
  }

  async removeRoleSetOrFail(roleSetID: string): Promise<boolean | never> {
    // Note need to load it in with all contained entities so can remove fully
    const roleSet = await this.getRoleSetOrFail(roleSetID, {
      relations: {
        roles: true,
        applications: true,
        invitations: true,
        platformInvitations: true,
        applicationForm: true,
        license: true,
      },
    });
    if (
      !roleSet.roles ||
      !roleSet.applications ||
      !roleSet.invitations ||
      !roleSet.platformInvitations ||
      !roleSet.applicationForm ||
      !roleSet.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for roleSet for deletion: ${roleSet.id} `,
        LogContext.COMMUNITY
      );
    }

    for (const role of roleSet.roles) {
      await this.roleService.removeRole(role);
    }

    if (roleSet.authorization)
      await this.authorizationPolicyService.delete(roleSet.authorization);

    // Remove all applications
    for (const application of roleSet.applications) {
      await this.applicationService.deleteApplication({
        ID: application.id,
      });
    }

    // Remove all invitations
    for (const invitation of roleSet.invitations) {
      await this.invitationService.deleteInvitation({
        ID: invitation.id,
      });
    }

    for (const externalInvitation of roleSet.platformInvitations) {
      await this.platformInvitationService.deletePlatformInvitation({
        ID: externalInvitation.id,
      });
    }

    await this.formService.removeForm(roleSet.applicationForm);
    await this.licenseService.removeLicenseOrFail(roleSet.license.id);

    await this.roleSetRepository.remove(roleSet as RoleSet);
    return true;
  }

  async save(roleSet: IRoleSet): Promise<IRoleSet> {
    return await this.roleSetRepository.save(roleSet);
  }

  async getParentRoleSet(roleSet: IRoleSet): Promise<IRoleSet | undefined> {
    const roleSetWithParent = await this.getRoleSetOrFail(roleSet.id, {
      relations: { parentRoleSet: true },
    });

    const parentRoleSet = roleSetWithParent?.parentRoleSet;
    if (parentRoleSet) {
      return await this.getRoleSetOrFail(parentRoleSet.id);
    }
    return undefined;
  }

  async updateApplicationForm(
    roleSet: IRoleSet,
    formData: UpdateFormInput
  ): Promise<IRoleSet> {
    const applicationForm = await this.getApplicationForm(roleSet);
    roleSet.applicationForm = await this.formService.updateForm(
      applicationForm,
      formData
    );
    return await this.save(roleSet);
  }

  async getApplicationForm(roleSet: IRoleSet): Promise<IForm> {
    const roleSetForm = await this.getRoleSetOrFail(roleSet.id, {
      relations: { applicationForm: true },
    });
    const applicationForm = roleSetForm.applicationForm;
    if (!applicationForm) {
      throw new EntityNotFoundException(
        `Unable to find Application Form for RoleSet with ID: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return applicationForm;
  }

  // Update the RoleSet policy to have the right resource ID
  public async updateRoleResourceID(
    roleSet: IRoleSet,
    resourceID: string
  ): Promise<IRoleSet> {
    const roleDefinitions = await this.getRoleDefinitions(roleSet);
    for (const roleDefinition of roleDefinitions) {
      roleDefinition.credential.resourceID = resourceID;
    }

    return roleSet;
  }

  public async removeAllRoleAssignments(roleSet: IRoleSet) {
    // Remove all issued role credentials for contributors
    const roleNames = await this.getRoleNames(roleSet);
    for (const roleName of roleNames) {
      const users = await this.getUsersWithRole(roleSet, roleName);
      for (const user of users) {
        await this.removeUserFromRole(roleSet, roleName, user.id, false);
      }

      const organizations = await this.getOrganizationsWithRole(
        roleSet,
        roleName
      );
      for (const organization of organizations) {
        await this.removeOrganizationFromRole(
          roleSet,
          roleName,
          organization.id,
          false
        );
      }
    }
  }

  async getRolesForAgentInfo(
    agentInfo: AgentInfo,
    roleSet: IRoleSet
  ): Promise<RoleName[]> {
    if (!agentInfo.agentID) {
      return [];
    }

    const result: RoleName[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const roles: RoleName[] = await this.getRoleNames(roleSet);
    for (const role of roles) {
      const hasAgentRole = await this.isInRole(agent, roleSet, role);
      if (hasAgentRole) {
        result.push(role);
      }
    }

    return result;
  }

  public async findOpenApplication(
    userID: string,
    roleSetID: string
  ): Promise<IApplication | undefined> {
    const applications = await this.applicationService.findExistingApplications(
      userID,
      roleSetID
    );
    for (const application of applications) {
      // skip any finalized applications; only want to return pending applications
      const isFinalized = await this.applicationService.isFinalizedApplication(
        application.id
      );
      if (isFinalized) continue;
      return application;
    }
    return undefined;
  }

  async getMembershipStatus(
    agentInfo: AgentInfo,
    roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    if (!agentInfo.agentID) {
      return CommunityMembershipStatus.NOT_MEMBER;
    }
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const isMember = await this.isMember(agent, roleSet);
    if (isMember) return CommunityMembershipStatus.MEMBER;

    const openApplication = await this.findOpenApplication(
      agentInfo.userID,
      roleSet.id
    );
    if (openApplication) return CommunityMembershipStatus.APPLICATION_PENDING;

    const openInvitation = await this.findOpenInvitation(
      agentInfo.userID,
      roleSet.id
    );

    if (
      openInvitation &&
      (await this.invitationService.canInvitationBeAccepted(openInvitation.id))
    ) {
      return CommunityMembershipStatus.INVITATION_PENDING;
    }

    return CommunityMembershipStatus.NOT_MEMBER;
  }

  public async findOpenInvitation(
    contributorID: string,
    roleSetID: string
  ): Promise<IInvitation | undefined> {
    const invitations = await this.invitationService.findExistingInvitations(
      contributorID,
      roleSetID
    );
    for (const invitation of invitations) {
      // skip any finalized applications; only want to return pending applications
      const isFinalized = await this.invitationService.isFinalizedInvitation(
        invitation.id
      );
      if (isFinalized) continue;
      return invitation;
    }
    return undefined;
  }

  public async getUsersWithRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    limit?: number
  ): Promise<IUser[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.userLookupService.usersWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      },
      limit
    );
  }

  public async getVirtualContributorsWithRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<IVirtualContributor[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.virtualContributorLookupService.virtualContributorsWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
  }

  public async getOrganizationsWithRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<IOrganization[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.organizationLookupService.organizationsWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  public async countContributorsPerRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    contributorType: RoleSetContributorType
  ): Promise<number> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );

    if (contributorType === RoleSetContributorType.ORGANIZATION) {
      return await this.organizationLookupService.countOrganizationsWithCredentials(
        {
          type: membershipCredential.type,
          resourceID: membershipCredential.resourceID,
        }
      );
    }

    if (contributorType === RoleSetContributorType.USER) {
      return await this.userLookupService.countUsersWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    return 0;
  }

  public async getCredentialDefinitionForRole(
    roleSet: IRoleSet,
    role: RoleName
  ): Promise<ICredentialDefinition> {
    const credential = this.getCredentialForRole(roleSet, role);
    return credential;
  }

  public async assignContributorToRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    contributorID: string,
    contributorType: RoleSetContributorType,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IContributor> {
    switch (contributorType) {
      case RoleSetContributorType.USER:
        return await this.assignUserToRole(
          roleSet,
          roleType,
          contributorID,
          agentInfo,
          triggerNewMemberEvents
        );
      case RoleSetContributorType.ORGANIZATION:
        return await this.assignOrganizationToRole(
          roleSet,
          roleType,
          contributorID
        );
      case RoleSetContributorType.VIRTUAL:
        return await this.assignVirtualToRole(
          roleSet,
          roleType,
          contributorID,
          agentInfo,
          triggerNewMemberEvents
        );
      default:
        throw new EntityNotInitializedException(
          `Invalid roleSet contributor type: ${contributorType}`,
          LogContext.ROLES
        );
    }
  }

  async assignUserToRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    userID: string,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IUser> {
    const { user, agent } =
      await this.userLookupService.getUserAndAgent(userID);
    const { isMember: hasMemberRoleInParent, parentRoleSet } =
      await this.isMemberInParentRoleSet(agent, roleSet.id);
    if (!hasMemberRoleInParent) {
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to roleSet (${roleSet.id}): agent is not a member of parent roleSet ${parentRoleSet?.id}`,
        LogContext.SPACES
      );
    }

    const userAlreadyHasRole = await this.isInRole(agent, roleSet, roleType);
    if (userAlreadyHasRole) {
      return user;
    }

    await this.assignContributorAgentToRole(
      roleSet,
      roleType,
      agent,
      RoleSetContributorType.USER
    );
    if (roleType === RoleName.ADMIN && parentRoleSet) {
      // also assign as subspace admin in parent roleSet if there is a parent roleSet
      const credential = await this.getCredentialForImplicitRole(
        parentRoleSet,
        RoleSetRoleImplicit.SUBSPACE_ADMIN
      );
      const alreadyHasSubspaceAdmin =
        await this.agentService.hasValidCredential(agent.id, credential);
      if (!alreadyHasSubspaceAdmin) {
        await this.assignContributorToImplicitRole(
          parentRoleSet,
          agent,
          RoleSetRoleImplicit.SUBSPACE_ADMIN
        );
      }
    }

    await this.contributorAddedToRole(
      user,
      roleSet,
      roleType,
      agentInfo,
      triggerNewMemberEvents
    );

    return await this.userLookupService.getUserOrFail(userID);
  }

  public async acceptInvitationToRoleSet(
    invitationID: string,
    agentInfo: AgentInfo
  ): Promise<void> {
    try {
      const invitation = await this.invitationService.getInvitationOrFail(
        invitationID,
        {
          relations: {
            roleSet: {
              parentRoleSet: true,
            },
          },
        }
      );
      const contributorID = invitation.invitedContributorID;
      const roleSet = invitation.roleSet;
      if (!contributorID || !roleSet) {
        throw new EntityNotInitializedException(
          `Lifecycle not initialized on Invitation: ${invitation.id}`,
          LogContext.COMMUNITY
        );
      }

      if (invitation.invitedToParent) {
        if (!roleSet.parentRoleSet) {
          throw new EntityNotInitializedException(
            `Unable to load parent community when flag to add is set: ${invitation.id}`,
            LogContext.COMMUNITY
          );
        }
        // Check if the user is already a member of the parent roleSet
        const { agent } =
          await this.contributorService.getContributorAndAgent(contributorID);
        const isMemberOfParentRoleSet = await this.isMember(
          agent,
          roleSet.parentRoleSet
        );
        if (!isMemberOfParentRoleSet) {
          await this.assignContributorToRole(
            roleSet.parentRoleSet,
            RoleName.MEMBER,
            contributorID,
            invitation.contributorType,
            agentInfo,
            true
          );
        }
      }
      await this.assignContributorToRole(
        roleSet,
        RoleName.MEMBER,
        contributorID,
        invitation.contributorType,
        agentInfo,
        true
      );
      if (invitation.extraRole) {
        try {
          await this.assignContributorToRole(
            roleSet,
            invitation.extraRole,
            contributorID,
            invitation.contributorType,
            agentInfo,
            false
          );
        } catch (e: any) {
          // Do not throw an exception further as there might not be entitlements to grant the extra role
          this.logger.warn?.(
            `Unable to add contributor (${contributorID}) to extra role (${invitation.extraRole}) in community: ${e}`,
            LogContext.COMMUNITY
          );
        }
      }
    } catch (e: any) {
      this.logger.error?.(
        `Error adding member to community: ${e}`,
        LogContext.COMMUNITY
      );
      throw new RoleSetMembershipException(
        `Unable to add member to community: ${e}`,
        LogContext.COMMUNITY
      );
    }
  }

  private async contributorAddedToRole(
    contributor: IContributor,
    roleSet: IRoleSet,
    role: RoleName,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ) {
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        this.logger.verbose?.(
          `Trigger new member events: ${triggerNewMemberEvents}`,
          LogContext.ROLES
        );
        if (role === RoleName.MEMBER) {
          const communication =
            await this.communityResolverService.getCommunicationForRoleSet(
              roleSet.id
            );
          this.communityCommunicationService.addMemberToCommunication(
            communication,
            contributor
          );

          if (agentInfo) {
            await this.roleSetEventsService.registerCommunityNewMemberActivity(
              roleSet,
              contributor,
              agentInfo
            );

            if (triggerNewMemberEvents) {
              await this.roleSetEventsService.processCommunityNewMemberEvents(
                roleSet,
                agentInfo,
                contributor
              );
            }
          }
        }
        break;
      }
    }
  }

  async assignVirtualToRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    virtualContributorID: string,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorLookupService.getVirtualContributorAndAgent(
        virtualContributorID
      );
    const { isMember: hasMemberRoleInParent, parentRoleSet } =
      await this.isMemberInParentRoleSet(agent, roleSet.id);
    if (!hasMemberRoleInParent) {
      if (!parentRoleSet) {
        throw new ValidationException(
          `Unable to find parent roleSet for roleSet ${roleSet.id}`,
          LogContext.SPACES
        );
      }
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to roleSet (${roleSet.id}): agent is not a member of parent roleSet ${parentRoleSet.id}`,
        LogContext.SPACES
      );
    }

    const virtualAlreadyHasRole = await this.isInRole(agent, roleSet, roleType);
    if (virtualAlreadyHasRole) {
      return virtualContributor;
    }

    virtualContributor.agent = await this.assignContributorAgentToRole(
      roleSet,
      roleType,
      agent,
      RoleSetContributorType.VIRTUAL
    );

    await this.contributorAddedToRole(
      virtualContributor,
      roleSet,
      roleType,
      agentInfo,
      triggerNewMemberEvents
    );
    if (roleSet.type === RoleSetType.SPACE) {
      // TO: THIS BREAKS THE DECOUPLING
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          roleSet.id
        );
      this.aiServerAdapter.ensureContextIsLoaded(space.id);
    }
    return virtualContributor;
  }

  private async isMemberInParentRoleSet(
    agent: IAgent,
    roleSetID: string
  ): Promise<{ parentRoleSet: IRoleSet | undefined; isMember: boolean }> {
    const roleSet = await this.getRoleSetOrFail(roleSetID, {
      relations: { parentRoleSet: true },
    });

    // If the parent roleSet is set, then check if the user is also a member there
    if (roleSet.parentRoleSet) {
      const isParentMember = await this.isMember(agent, roleSet.parentRoleSet);
      return {
        parentRoleSet: roleSet?.parentRoleSet,
        isMember: isParentMember,
      };
    }
    return {
      parentRoleSet: undefined,
      isMember: true,
    };
  }

  async assignOrganizationToRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    organizationID: string
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationLookupService.getOrganizationAndAgent(
        organizationID
      );

    organization.agent = await this.assignContributorAgentToRole(
      roleSet,
      roleType,
      agent,
      RoleSetContributorType.ORGANIZATION
    );

    return organization;
  }

  async removeUserFromRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    userID: string,
    validatePolicyLimits = true
  ): Promise<IUser> {
    const { user, agent } =
      await this.userLookupService.getUserAndAgent(userID);

    user.agent = await this.removeContributorFromRole(
      roleSet,
      roleType,
      agent,
      RoleSetContributorType.USER,
      validatePolicyLimits
    );

    const parentRoleSet = await this.getParentRoleSet(roleSet);
    if (roleType === RoleName.ADMIN && parentRoleSet) {
      // Check if an admin anywhere else in the roleSet
      const peerRoleSets = await this.getPeerRoleSets(parentRoleSet, roleSet);
      const hasAnotherAdminRole = peerRoleSets.some(pc =>
        this.isInRole(agent, pc, RoleName.ADMIN)
      );

      if (!hasAnotherAdminRole) {
        await this.removeContributorFromImplicitRole(
          parentRoleSet,
          agent,
          RoleSetRoleImplicit.SUBSPACE_ADMIN
        );
      }
    }

    if (roleType === RoleName.MEMBER) {
      const communication =
        await this.communityResolverService.getCommunicationForRoleSet(
          roleSet.id
        );

      await this.communityCommunicationService.removeMemberFromCommunication(
        communication,
        user
      );
    }

    return user;
  }

  async removeOrganizationFromRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    organizationID: string,
    validatePolicyLimits = true
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationLookupService.getOrganizationAndAgent(
        organizationID
      );

    organization.agent = await this.removeContributorFromRole(
      roleSet,
      roleType,
      agent,
      RoleSetContributorType.ORGANIZATION,
      validatePolicyLimits
    );

    return organization;
  }

  async removeVirtualFromRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    virtualContributorID: string,
    validatePolicyLimits = true
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorLookupService.getVirtualContributorAndAgent(
        virtualContributorID
      );

    virtualContributor.agent = await this.removeContributorFromRole(
      roleSet,
      roleType,
      agent,
      RoleSetContributorType.VIRTUAL,
      validatePolicyLimits
    );

    return virtualContributor;
  }

  public async isRoleSetAccountMatchingVcAccount(
    roleSet: IRoleSet,
    virtualContributorID: string
  ): Promise<boolean> {
    if (roleSet.type !== RoleSetType.SPACE) {
      return false;
    }
    return await this.communityResolverService.isRoleSetAccountMatchingVcAccount(
      roleSet.id,
      virtualContributorID
    );
  }

  private async validateUserContributorPolicy(
    roleSet: IRoleSet,
    roleType: RoleName,
    action: RoleSetUpdateType
  ) {
    const userMembersCount = await this.countContributorsPerRole(
      roleSet,
      roleType,
      RoleSetContributorType.USER
    );

    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);

    const userPolicy = roleDefinition.userPolicy;

    if (action === RoleSetUpdateType.ASSIGN) {
      if (userMembersCount === userPolicy.maximum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Max limit of users reached for role '${roleType}': ${userPolicy.maximum}, cannot assign new user.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === RoleSetUpdateType.REMOVE) {
      if (userMembersCount === userPolicy.minimum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Min limit of users reached for role '${roleType}': ${userPolicy.minimum}, cannot remove user from role on RoleSet: ${roleSet.id}, type: ${roleSet.type}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateOrganizationContributorPolicy(
    roleSet: IRoleSet,
    roleType: RoleName,
    action: RoleSetUpdateType
  ) {
    const orgMemberCount = await this.countContributorsPerRole(
      roleSet,
      roleType,
      RoleSetContributorType.ORGANIZATION
    );

    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);

    const organizationPolicy = roleDefinition.organizationPolicy;

    if (action === RoleSetUpdateType.ASSIGN) {
      if (orgMemberCount === organizationPolicy.maximum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Max limit of organizations reached for role '${roleType}': ${organizationPolicy.maximum}, cannot assign new organization.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === RoleSetUpdateType.REMOVE) {
      if (orgMemberCount === organizationPolicy.minimum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Min limit of organizations reached for role '${roleType}': ${organizationPolicy.minimum}, cannot remove organization.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateContributorPolicyLimits(
    roleSet: IRoleSet,
    roleType: RoleName,
    action: RoleSetUpdateType,
    contributorType: RoleSetContributorType
  ) {
    if (contributorType === RoleSetContributorType.USER)
      await this.validateUserContributorPolicy(roleSet, roleType, action);

    if (contributorType === RoleSetContributorType.ORGANIZATION)
      await this.validateOrganizationContributorPolicy(
        roleSet,
        roleType,
        action
      );
  }

  public async assignContributorAgentToRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    agent: IAgent,
    contributorType: RoleSetContributorType
  ): Promise<IAgent> {
    await this.validateContributorPolicyLimits(
      roleSet,
      roleType,
      RoleSetUpdateType.ASSIGN,
      contributorType
    );

    const roleCredential = await this.getCredentialForRole(roleSet, roleType);

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  private async assignContributorToImplicitRole(
    roleSet: IRoleSet,
    agent: IAgent,
    role: RoleSetRoleImplicit
  ): Promise<IAgent> {
    const credential = await this.getCredentialForImplicitRole(roleSet, role);

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private async removeContributorFromImplicitRole(
    roleSet: IRoleSet,
    agent: IAgent,
    role: RoleSetRoleImplicit
  ): Promise<IAgent> {
    const credential = await this.getCredentialForImplicitRole(roleSet, role);

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private async getCredentialForImplicitRole(
    roleSet: IRoleSet,
    role: RoleSetRoleImplicit
  ): Promise<ICredentialDefinition> {
    // Use the admin credential to get the resourceID
    const adminCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.ADMIN
    );
    const resourceID = adminCredential.resourceID;
    switch (role) {
      case RoleSetRoleImplicit.SUBSPACE_ADMIN:
        return {
          type: AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
          resourceID,
        };
      default: {
        throw new RoleSetMembershipException(
          `Invalid implicit role: ${role}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async removeContributorFromRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    agent: IAgent,
    contributorType: RoleSetContributorType,
    validatePolicyLimits: boolean
  ): Promise<IAgent> {
    if (validatePolicyLimits) {
      await this.validateContributorPolicyLimits(
        roleSet,
        roleType,
        RoleSetUpdateType.REMOVE,
        contributorType
      );
    }

    const roleCredential = await this.getCredentialForRole(roleSet, roleType);

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  public async isMember(agent: IAgent, roleSet: IRoleSet): Promise<boolean> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.MEMBER
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  public async isInRole(
    agent: IAgent,
    roleSet: IRoleSet,
    role: RoleName
  ): Promise<boolean> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      role
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async isInRoleImplicit(
    agent: IAgent,
    roleSet: IRoleSet,
    role: RoleSetRoleImplicit
  ): Promise<boolean> {
    const membershipCredential = await this.getCredentialForImplicitRole(
      roleSet,
      role
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const { user, agent } = await this.userLookupService.getUserAndAgent(
      applicationData.userID
    );
    const roleSet = await this.getRoleSetOrFail(applicationData.roleSetID, {
      relations: {
        parentRoleSet: true,
      },
    });

    await this.validateApplicationFromUser(user, agent, roleSet);

    const application =
      await this.applicationService.createApplication(applicationData);
    application.roleSet = roleSet;
    return await this.applicationService.save(application);
  }

  async createInvitationExistingContributor(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const { contributor: contributor, agent } =
      await this.contributorService.getContributorAndAgent(
        invitationData.invitedContributorID
      );
    const roleSet = await this.getRoleSetOrFail(invitationData.roleSetID);

    await this.validateInvitationToExistingContributor(
      contributor,
      agent,
      roleSet
    );

    const invitation = await this.invitationService.createInvitation(
      invitationData,
      contributor
    );
    invitation.roleSet = roleSet;

    return await this.invitationService.save(invitation);
  }

  async createPlatformInvitation(
    invitationData: InviteNewContributorForRoleOnRoleSetInput,
    agentInfo: AgentInfo
  ): Promise<IPlatformInvitation> {
    await this.validateInvitationToExternalUser(
      invitationData.email,
      invitationData.roleSetID
    );
    const roleSet = await this.getRoleSetOrFail(invitationData.roleSetID, {
      relations: {},
    });

    const externalInvitationInput: CreatePlatformInvitationInput = {
      ...invitationData,
      createdBy: agentInfo.userID,
    };
    const externalInvitation =
      await this.platformInvitationService.createPlatformInvitation(
        roleSet,
        externalInvitationInput
      );
    externalInvitation.roleSet = roleSet;
    return await this.platformInvitationService.save(externalInvitation);
  }

  public async getRolesForUsers(
    roleSet: IRoleSet,
    userIDs: string[]
  ): Promise<{ [userID: string]: RoleName[] }> {
    // Retrieve all agents for the provided user IDs in a single query
    const usersWithAgents =
      await this.userLookupService.getUsersWithAgent(userIDs);

    const roleNames = await this.getRoleNames(roleSet);

    // Initialize a result map to store roles for each user
    const userRolesMap: { [userID: string]: RoleName[] } = {};

    // Iterate over each agent and determine their roles
    for (const { id: userID, agent } of usersWithAgents) {
      const roles: RoleName[] = [];
      for (const roleName of roleNames) {
        if (await this.isInRole(agent, roleSet, roleName)) {
          roles.push(roleName);
        }
      }
      userRolesMap[userID] = roles;
    }

    return userRolesMap;
  }

  private async validateApplicationFromUser(
    user: IUser,
    agent: IAgent,
    roleSet: IRoleSet
  ) {
    const openApplication = await this.findOpenApplication(user.id, roleSet.id);
    if (openApplication) {
      throw new RoleSetMembershipException(
        `Application not possible: An open application (ID: ${openApplication.id}) already exists for contributor ${openApplication.user?.id} on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openInvitation = await this.findOpenInvitation(user.id, roleSet.id);
    if (openInvitation) {
      throw new RoleSetMembershipException(
        `Application not possible: An open invitation (ID: ${openInvitation.id}) already exists for contributor ${openInvitation.invitedContributorID} (${openInvitation.contributorType}) on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, roleSet);
    if (isExistingMember)
      throw new RoleSetMembershipException(
        `Application not possible: Contributor ${user.id} is already a member of the RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExistingContributor(
    contributor: IContributor,
    agent: IAgent,
    roleSet: IRoleSet
  ) {
    const openInvitation = await this.findOpenInvitation(
      contributor.id,
      roleSet.id
    );
    if (openInvitation) {
      throw new RoleSetMembershipException(
        `Invitation not possible: An open invitation (ID: ${openInvitation.id}) already exists for contributor ${openInvitation.invitedContributorID} (${openInvitation.contributorType}) on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openApplication = await this.findOpenApplication(
      contributor.id,
      roleSet.id
    );
    if (openApplication) {
      throw new RoleSetMembershipException(
        `Invitation not possible: An open application (ID: ${openApplication.id}) already exists for contributor ${openApplication.user?.id} on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, roleSet);
    if (isExistingMember)
      throw new RoleSetMembershipException(
        `Invitation not possible: Contributor ${contributor.id} is already a member of the RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExternalUser(
    email: string,
    roleSetID: string
  ) {
    // Check if a user with the provided email address already exists or not
    const isExistingUser = await this.userLookupService.isRegisteredUser(email);
    if (isExistingUser) {
      throw new RoleSetMembershipException(
        `User with the provided email address already exists: ${email}`,
        LogContext.COMMUNITY
      );
    }

    const platformInvitations =
      await this.platformInvitationService.findPlatformInvitationsForUser(
        email
      );
    for (const platformInvitation of platformInvitations) {
      if (
        platformInvitation.roleSet &&
        platformInvitation.roleSet.id === roleSetID
      ) {
        throw new RoleSetMembershipException(
          `An invitation with the provided email address (${email}) already exists for the specified roleSet: ${roleSetID}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  async getApplications(roleSet: IRoleSet): Promise<IApplication[]> {
    const roleSetApplications = await this.getRoleSetOrFail(roleSet.id, {
      relations: { applications: true },
    });
    return roleSetApplications?.applications || [];
  }

  async getInvitations(roleSet: IRoleSet): Promise<IInvitation[]> {
    const roleSetInvitations = await this.getRoleSetOrFail(roleSet.id, {
      relations: { invitations: true },
    });
    return roleSetInvitations?.invitations || [];
  }

  async getPlatformInvitations(
    roleSet: IRoleSet
  ): Promise<IPlatformInvitation[]> {
    const roleSetInvs = await this.getRoleSetOrFail(roleSet.id, {
      relations: { platformInvitations: true },
    });
    return roleSetInvs?.platformInvitations || [];
  }

  async getMembersCount(roleSet: IRoleSet): Promise<number> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.MEMBER
    );

    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });

    return credentialMatches;
  }

  async getCommunityImplicitRoles(
    agentInfo: AgentInfo,
    roleSet: IRoleSet
  ): Promise<RoleSetRoleImplicit[]> {
    const result: RoleSetRoleImplicit[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);

    const rolesImplicit: RoleSetRoleImplicit[] = Object.values(
      RoleSetRoleImplicit
    ) as RoleSetRoleImplicit[];
    for (const role of rolesImplicit) {
      const hasAgentRole = await this.isInRoleImplicit(agent, roleSet, role);
      if (hasAgentRole) {
        result.push(role);
      }
    }
    return result;
  }

  public async getPeerRoleSets(
    parentRoleSet: IRoleSet,
    childRoleSet: IRoleSet
  ): Promise<IRoleSet[]> {
    return this.roleSetRepository.find({
      where: {
        parentRoleSet: { id: parentRoleSet.id },
        id: Not(childRoleSet.id),
      },
    });
  }

  public async setParentRoleSetAndCredentials(
    childRoleSet: IRoleSet,
    parentRoleSet: IRoleSet
  ): Promise<IRoleSet> {
    childRoleSet.parentRoleSet = parentRoleSet;

    const roleDefinitions = await this.getRoleDefinitions(childRoleSet);

    for (const roleDefinition of roleDefinitions) {
      const parentRoleDefinition = await this.getRoleDefinition(
        parentRoleSet,
        roleDefinition.name
      );
      const parentCredentials: ICredentialDefinition[] = [];
      const parentDirectCredential = parentRoleDefinition.credential;
      const parentParentCredentials = roleDefinition.parentCredentials;

      parentCredentials.push(parentDirectCredential);
      parentParentCredentials.forEach(c => parentCredentials?.push(c));

      roleDefinition.parentCredentials = parentCredentials;
    }

    return childRoleSet;
  }

  public async getDirectParentCredentialForRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<ICredentialDefinition | undefined> {
    const parentCredentials = await this.getParentCredentialsForRole(
      roleSet,
      roleType
    );

    // First entry is the immediate parent
    if (parentCredentials.length === 0) {
      return undefined;
    }
    const directParentCredential = parentCredentials[0];
    return directParentCredential;
  }

  public async getParentCredentialsForRole(
    roleSet: IRoleSet,
    roleName: RoleName
  ): Promise<ICredentialDefinition[]> {
    const roleDefinition = await this.getRoleDefinition(roleSet, roleName);
    return roleDefinition.parentCredentials;
  }

  public async getCredentialsForRoleWithParents(
    roleSet: IRoleSet,
    roleName: RoleName,
    spaceSettings: ISpaceSettings
  ): Promise<ICredentialDefinition[]> {
    const result = await this.getCredentialsForRole(
      roleSet,
      roleName,
      spaceSettings
    );
    const parentCredentials = await this.getParentCredentialsForRole(
      roleSet,
      roleName
    );
    return result.concat(parentCredentials);
  }

  public async getCredentialsForRole(
    roleSet: IRoleSet,
    roleName: RoleName,
    spaceSettings: ISpaceSettings // TODO: would like not to have this here; for later
  ): Promise<ICredentialDefinition[]> {
    const result = [await this.getCredentialForRole(roleSet, roleName)];
    if (
      roleName === RoleName.ADMIN &&
      spaceSettings.privacy.allowPlatformSupportAsAdmin
    ) {
      result.push({
        type: AuthorizationCredential.GLOBAL_SUPPORT,
        resourceID: '',
      });
    }
    return result;
  }

  public async getCredentialForRole(
    roleSet: IRoleSet,
    roleName: RoleName
  ): Promise<ICredentialDefinition> {
    const roleDefinition = await this.getRoleDefinition(roleSet, roleName);
    return roleDefinition.credential;
  }

  public async getRoleDefinitions(
    roleSetInput: IRoleSet,
    roles?: RoleName[]
  ): Promise<IRole[]> {
    let roleDefinitions = roleSetInput.roles;
    if (!roleDefinitions) {
      const roleSet = await this.getRoleSetOrFail(roleSetInput.id, {
        relations: { roles: true },
      });
      roleDefinitions = roleSet.roles;
    }
    if (!roleDefinitions) {
      throw new RelationshipNotFoundException(
        `Unable to load roles for RoleSet: ${roleSetInput.id}`,
        LogContext.COMMUNITY
      );
    }
    if (roles) {
      return roleDefinitions.filter(rd => roles.includes(rd.name));
    }
    return roleDefinitions;
  }

  public async getRoleNames(roleSetInput: IRoleSet): Promise<RoleName[]> {
    let roleDefinitions = roleSetInput.roles;
    if (!roleDefinitions) {
      const roleSet = await this.getRoleSetOrFail(roleSetInput.id, {
        relations: { roles: true },
      });
      roleDefinitions = roleSet.roles;
    }
    if (!roleDefinitions) {
      throw new RelationshipNotFoundException(
        `Unable to load roles for RoleSet: ${roleSetInput.id}`,
        LogContext.COMMUNITY
      );
    }
    return roleDefinitions.map(rd => rd.name);
  }

  public async getRoleDefinition(
    roleSet: IRoleSet,
    roleName: RoleName
  ): Promise<IRole> {
    const roleDefinitions = await this.getRoleDefinitions(roleSet);
    const role = roleDefinitions.find(rd => rd.name === roleName);
    if (!role) {
      throw new RelationshipNotFoundException(
        `Unable to find Role with name '${roleName}' for RoleSet: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return role;
  }

  public async approveApplication(
    applicationID: string,
    agentInfo: AgentInfo
  ): Promise<void> {
    const application = await this.applicationService.getApplicationOrFail(
      applicationID,
      {
        relations: { roleSet: true, user: true },
      }
    );
    const userID = application.user?.id;
    const roleSet = application.roleSet;
    if (!userID || !roleSet)
      throw new EntityNotInitializedException(
        `Lifecycle not initialized on Application: ${application.id}`,
        LogContext.COMMUNITY
      );

    await this.assignUserToRole(
      roleSet,
      RoleName.MEMBER,
      userID,
      agentInfo,
      true
    );
  }

  public async isEntryRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<boolean> {
    const isEntryRole = roleSet.entryRoleName === roleType;
    return isEntryRole;
  }
}
