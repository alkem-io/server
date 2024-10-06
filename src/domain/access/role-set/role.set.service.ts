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
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LogContext } from '@common/enums/logging.context';
import { IForm } from '@domain/common/form/form.interface';
import { FormService } from '@domain/common/form/form.service';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { CreateRoleSetInput } from './dto/role.set.dto.create';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
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
import { UserService } from '@domain/community/user/user.service';
import { IInvitation } from '../invitation/invitation.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { CommunityRoleImplicit } from '@common/enums/community.role.implicit';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { CommunityRoleType } from '@common/enums/community.role';
import { IApplication } from '../application/application.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CommunityContributorsUpdateType } from '@common/enums/community.contributors.update.type';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { CreateApplicationInput } from '../application/dto/application.dto.create';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { InviteNewContributorForRoleOnRoleSetInput } from './dto/role.set.dto.platform.invitation.community';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { RoleSetEventsService } from './role.set.service.events';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CommunityCommunicationService } from '@domain/community/community-communication/community.communication.service';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';

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
    private userService: UserService,
    private organizationService: OrganizationService,
    private virtualContributorService: VirtualContributorService,
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
    roleSet.entryRoleType = roleSetData.entryRoleType;

    roleSet.parentRoleSet = roleSetData.parentRoleSet;

    for (const roleData of roleSetData.roles) {
      const role = this.roleService.createRole(roleData);
      roleSet.roles.push(role);
    }

    roleSet.applicationForm = this.formService.createForm(
      roleSetData.applicationForm
    );

    roleSet.license = await this.licenseService.createLicense({
      type: LicenseType.ROLESET,
      entitlements: [
        {
          type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
          dataTtype: LicenseEntitlementDataType.FLAG,
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

  async removeRoleSet(roleSetID: string): Promise<boolean> {
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
    await this.licenseService.removeLicense(roleSet.license.id);

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
      const credential = this.roleService.getCredentialForRole(roleDefinition);
      credential.resourceID = resourceID;
      roleDefinition.credential =
        this.roleService.convertCredentialToString(credential);
    }

    return roleSet;
  }

  public async removeAllRoleAssignments(roleSet: IRoleSet) {
    // Remove all issued role credentials for contributors
    for (const roleType of Object.values(CommunityRoleType)) {
      const users = await this.getUsersWithRole(roleSet, roleType);
      for (const user of users) {
        await this.removeUserFromRole(roleSet, roleType, user.id, false);
      }

      const organizations = await this.getOrganizationsWithRole(
        roleSet,
        roleType
      );
      for (const organization of organizations) {
        await this.removeOrganizationFromRole(
          roleSet,
          roleType,
          organization.id,
          false
        );
      }
    }
  }

  async getRolesForAgentInfo(
    agentInfo: AgentInfo,
    roleSet: IRoleSet
  ): Promise<CommunityRoleType[]> {
    const result: CommunityRoleType[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const roles: CommunityRoleType[] = Object.values(
      CommunityRoleType
    ) as CommunityRoleType[];
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
    roleType: CommunityRoleType,
    limit?: number
  ): Promise<IUser[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.userService.usersWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      },
      limit
    );
  }

  public async getVirtualContributorsWithRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): Promise<IVirtualContributor[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.virtualContributorService.virtualContributorsWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
  }

  public async getOrganizationsWithRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): Promise<IOrganization[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.organizationService.organizationsWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  public async countContributorsPerRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    contributorType: CommunityContributorType
  ): Promise<number> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );

    if (contributorType === CommunityContributorType.ORGANIZATION) {
      return await this.organizationService.countOrganizationsWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    if (contributorType === CommunityContributorType.USER) {
      return await this.userService.countUsersWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    return 0;
  }

  public async getCredentialDefinitionForRole(
    roleSet: IRoleSet,
    role: CommunityRoleType
  ): Promise<ICredentialDefinition> {
    const credential = this.getCredentialForRole(roleSet, role);
    return credential;
  }

  public async assignContributorToRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    contributorID: string,
    contributorType: CommunityContributorType,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IContributor> {
    switch (contributorType) {
      case CommunityContributorType.USER:
        return await this.assignUserToRole(
          roleSet,
          roleType,
          contributorID,
          agentInfo,
          triggerNewMemberEvents
        );
      case CommunityContributorType.ORGANIZATION:
        return await this.assignOrganizationToRole(
          roleSet,
          roleType,
          contributorID
        );
      case CommunityContributorType.VIRTUAL:
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
    roleType: CommunityRoleType,
    userID: string,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);
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

    user.agent = await this.assignContributorAgentToRole(
      roleSet,
      roleType,
      agent,
      CommunityContributorType.USER
    );
    if (roleType === CommunityRoleType.ADMIN && parentRoleSet) {
      // also assign as subspace admin in parent roleSet if there is a parent roleSet
      const credential = await this.getCredentialForImplicitRole(
        parentRoleSet,
        CommunityRoleImplicit.SUBSPACE_ADMIN
      );
      const alreadyHasSubspaceAdmin =
        await this.agentService.hasValidCredential(agent.id, credential);
      if (!alreadyHasSubspaceAdmin) {
        await this.assignContributorToImplicitRole(
          parentRoleSet,
          agent,
          CommunityRoleImplicit.SUBSPACE_ADMIN
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

    return user;
  }

  private async contributorAddedToRole(
    contributor: IContributor,
    roleSet: IRoleSet,
    role: CommunityRoleType,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ) {
    this.logger.verbose?.(
      `Trigger new member events: ${triggerNewMemberEvents}`,
      LogContext.ROLES
    );
    if (role === CommunityRoleType.MEMBER) {
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
  }

  async assignVirtualToRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    virtualContributorID: string,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorService.getVirtualContributorAndAgent(
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
      CommunityContributorType.VIRTUAL
    );

    await this.contributorAddedToRole(
      virtualContributor,
      roleSet,
      roleType,
      agentInfo,
      triggerNewMemberEvents
    );
    // TO: THIS BREAKS THE DECOUPLING
    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      roleSet.id
    );
    this.aiServerAdapter.ensureContextIsLoaded(space.id);
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
    roleType: CommunityRoleType,
    organizationID: string
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.assignContributorAgentToRole(
      roleSet,
      roleType,
      agent,
      CommunityContributorType.ORGANIZATION
    );

    return organization;
  }

  async removeUserFromRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    userID: string,
    validatePolicyLimits = true
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);

    user.agent = await this.removeContributorFromRole(
      roleSet,
      roleType,
      agent,
      CommunityContributorType.USER,
      validatePolicyLimits
    );

    const parentRoleSet = await this.getParentRoleSet(roleSet);
    if (roleType === CommunityRoleType.ADMIN && parentRoleSet) {
      // Check if an admin anywhere else in the roleSet
      const peerRoleSets = await this.getPeerRoleSets(parentRoleSet, roleSet);
      const hasAnotherAdminRole = peerRoleSets.some(pc =>
        this.isInRole(agent, pc, CommunityRoleType.ADMIN)
      );

      if (!hasAnotherAdminRole) {
        await this.removeContributorToImplicitRole(
          parentRoleSet,
          agent,
          CommunityRoleImplicit.SUBSPACE_ADMIN
        );
      }
    }

    if (roleType === CommunityRoleType.MEMBER) {
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
    roleType: CommunityRoleType,
    organizationID: string,
    validatePolicyLimits = true
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.removeContributorFromRole(
      roleSet,
      roleType,
      agent,
      CommunityContributorType.ORGANIZATION,
      validatePolicyLimits
    );

    return organization;
  }

  async removeVirtualFromRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    virtualContributorID: string,
    validatePolicyLimits = true
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorService.getVirtualContributorAndAgent(
        virtualContributorID
      );

    virtualContributor.agent = await this.removeContributorFromRole(
      roleSet,
      roleType,
      agent,
      CommunityContributorType.VIRTUAL,
      validatePolicyLimits
    );

    return virtualContributor;
  }

  public async isCommunityAccountMatchingVcAccount(
    roleSetID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSetID);

    return await this.communityResolverService.isCommunityAccountMatchingVcAccount(
      community.id,
      virtualContributorID
    );
  }

  private async validateUserCommunityPolicy(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    action: CommunityContributorsUpdateType
  ) {
    const userMembersCount = await this.countContributorsPerRole(
      roleSet,
      roleType,
      CommunityContributorType.USER
    );

    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);

    const userPolicy = this.roleService.getUserPolicy(roleDefinition);

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (userMembersCount === userPolicy.maximum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Max limit of users reached for role '${roleType}': ${userPolicy.maximum}, cannot assign new user.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (userMembersCount === userPolicy.minimum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Min limit of users reached for role '${roleType}': ${userPolicy.minimum}, cannot remove user.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateOrganizationCommunityPolicy(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    action: CommunityContributorsUpdateType
  ) {
    const orgMemberCount = await this.countContributorsPerRole(
      roleSet,
      roleType,
      CommunityContributorType.ORGANIZATION
    );

    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);

    const organizationPolicy =
      this.roleService.getOrganizationPolicy(roleDefinition);

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (orgMemberCount === organizationPolicy.maximum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Max limit of organizations reached for role '${roleType}': ${organizationPolicy.maximum}, cannot assign new organization.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (orgMemberCount === organizationPolicy.minimum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Min limit of organizations reached for role '${roleType}': ${organizationPolicy.minimum}, cannot remove organization.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateCommunityPolicyLimits(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    action: CommunityContributorsUpdateType,
    contributorType: CommunityContributorType
  ) {
    if (contributorType === CommunityContributorType.USER)
      await this.validateUserCommunityPolicy(roleSet, roleType, action);

    if (contributorType === CommunityContributorType.ORGANIZATION)
      await this.validateOrganizationCommunityPolicy(roleSet, roleType, action);
  }

  public async assignContributorAgentToRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    agent: IAgent,
    contributorType: CommunityContributorType
  ): Promise<IAgent> {
    await this.validateCommunityPolicyLimits(
      roleSet,
      roleType,
      CommunityContributorsUpdateType.ASSIGN,
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
    role: CommunityRoleImplicit
  ): Promise<IAgent> {
    const credential = await this.getCredentialForImplicitRole(roleSet, role);

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private async removeContributorToImplicitRole(
    roleSet: IRoleSet,
    agent: IAgent,
    role: CommunityRoleImplicit
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
    role: CommunityRoleImplicit
  ): Promise<ICredentialDefinition> {
    // Use the admin credential to get the resourceID
    const adminCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      CommunityRoleType.ADMIN
    );
    const resourceID = adminCredential.resourceID;
    switch (role) {
      case CommunityRoleImplicit.SUBSPACE_ADMIN:
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
    roleType: CommunityRoleType,
    agent: IAgent,
    contributorType: CommunityContributorType,
    validatePolicyLimits: boolean
  ): Promise<IAgent> {
    if (validatePolicyLimits) {
      await this.validateCommunityPolicyLimits(
        roleSet,
        roleType,
        CommunityContributorsUpdateType.REMOVE,
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
      CommunityRoleType.MEMBER
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
    role: CommunityRoleType
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
    role: CommunityRoleImplicit
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
    const { user, agent } = await this.userService.getUserAndAgent(
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
        externalInvitationInput
      );
    externalInvitation.roleSet = roleSet;
    return await this.platformInvitationService.save(externalInvitation);
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
    const isExistingUser = await this.userService.isRegisteredUser(email);
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
      CommunityRoleType.MEMBER
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
  ): Promise<CommunityRoleImplicit[]> {
    const result: CommunityRoleImplicit[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);

    const rolesImplicit: CommunityRoleImplicit[] = Object.values(
      CommunityRoleImplicit
    ) as CommunityRoleImplicit[];
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
    const peerRoleSets: IRoleSet[] = await this.roleSetRepository.find({
      where: {
        parentRoleSet: {
          id: parentRoleSet.id,
        },
      },
    });
    const result: IRoleSet[] = [];
    for (const roleSet of peerRoleSets) {
      if (roleSet && !(roleSet.id === childRoleSet.id)) {
        result.push(roleSet);
      }
    }
    return result;
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
        roleDefinition.type
      );
      const parentCredentials: ICredentialDefinition[] = [];
      const parentDirectCredential =
        this.roleService.getCredentialForRole(parentRoleDefinition);
      const parentParentCredentials =
        this.roleService.getParentCredentialsForRole(parentRoleDefinition);

      parentCredentials.push(parentDirectCredential);
      parentParentCredentials.forEach(c => parentCredentials?.push(c));

      roleDefinition.parentCredentials =
        this.roleService.convertParentCredentialsToString(parentCredentials);
    }

    return childRoleSet;
  }

  public async getDirectParentCredentialForRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
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
    roleType: CommunityRoleType
  ): Promise<ICredentialDefinition[]> {
    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);
    return this.roleService.getParentCredentialsForRole(roleDefinition);
  }

  public async getCredentialsForRoleWithParents(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    spaceSettings: ISpaceSettings
  ): Promise<ICredentialDefinition[]> {
    const result = await this.getCredentialsForRole(
      roleSet,
      roleType,
      spaceSettings
    );
    const parentCredentials = await this.getParentCredentialsForRole(
      roleSet,
      roleType
    );
    return result.concat(parentCredentials);
  }

  public async getCredentialsForRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    spaceSettings: ISpaceSettings // TODO: would like not to have this here; for later
  ): Promise<ICredentialDefinition[]> {
    const result = [await this.getCredentialForRole(roleSet, roleType)];
    if (
      roleType === CommunityRoleType.ADMIN &&
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
    roleType: CommunityRoleType
  ): Promise<ICredentialDefinition> {
    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);
    return this.roleService.getCredentialForRole(roleDefinition);
  }

  public async getRoleDefinitions(roleSetInput: IRoleSet): Promise<IRole[]> {
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
    return roleDefinitions;
  }

  public async getRoleDefinition(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): Promise<IRole> {
    const roleDefinitions = await this.getRoleDefinitions(roleSet);
    const role = roleDefinitions.find(rd => rd.type === roleType);
    if (!role) {
      throw new RelationshipNotFoundException(
        `Unable to find Role for type ${roleType} for RoleSet: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return role;
  }

  public async getEntryRoleDefinition(roleSet: IRoleSet): Promise<IRole> {
    const roleDefinitions = await this.getRoleDefinitions(roleSet);
    const entryRole = roleDefinitions.find(
      rd => rd.type === roleSet.entryRoleType
    );
    if (!entryRole) {
      throw new RelationshipNotFoundException(
        `Unable to find entry level Role of type ${roleSet.entryRoleType} for RoleSet: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return entryRole;
  }

  public async isEntryRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): Promise<boolean> {
    const isEntryRole = roleSet.entryRoleType === roleType;
    return isEntryRole;
  }
}
