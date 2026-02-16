import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { RoleSetRoleImplicit } from '@common/enums/role.set.role.implicit';
import { RoleSetType } from '@common/enums/role.set.type';
import { RoleSetUpdateType } from '@common/enums/role.set.update.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  RoleSetPolicyRoleLimitsException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { CreatePlatformInvitationInput } from '@domain/access/invitation.platform/dto/platform.invitation.dto.create';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { IForm } from '@domain/common/form/form.interface';
import { FormService } from '@domain/common/form/form.service';
import { LicenseService } from '@domain/common/license/license.service';
import { CommunityCommunicationService } from '@domain/community/community-communication/community.communication.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { and, eq, ne } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { forms } from '@domain/common/form/form.schema';
import { roleSets } from './role.set.schema';
import { IApplication } from '../application/application.interface';
import { CreateApplicationInput } from '../application/dto/application.dto.create';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { IInvitation } from '../invitation/invitation.interface';
import { IRole } from '../role/role.interface';
import { RoleService } from '../role/role.service';
import { CreateRoleSetInput } from './dto/role.set.dto.create';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetCacheService } from './role.set.service.cache';
import { RoleSetEventsService } from './role.set.service.events';

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
    private spaceLookupService: SpaceLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private communityResolverService: CommunityResolverService,
    private roleSetEventsService: RoleSetEventsService,
    private aiServerAdapter: AiServerAdapter,
    private communityCommunicationService: CommunityCommunicationService,
    private licenseService: LicenseService,
    private inAppNotificationService: InAppNotificationService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly roleSetCacheService: RoleSetCacheService
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
    options?: { with?: Record<string, boolean | object> }
  ): Promise<IRoleSet | never> {
    const roleSet = await this.db.query.roleSets.findFirst({
      where: eq(roleSets.id, roleSetID),
      with: options?.with,
    });
    if (!roleSet)
      throw new EntityNotFoundException(
        `Unable to find RoleSet with ID: ${roleSetID}`,
        LogContext.COMMUNITY
      );
    return roleSet as unknown as IRoleSet;
  }

  async removeRoleSetOrFail(roleSetID: string): Promise<boolean | never> {
    // Note need to load it in with all contained entities so can remove fully
    const roleSet = await this.getRoleSetOrFail(roleSetID, {
      with: {
        roles: true,
        applications: true,
        invitations: true,
        platformInvitations: true,
      },
    });
    // Also load applicationForm and license via FK columns on the roleSet
    const applicationForm = await this.getApplicationForm(roleSet);
    const licenseId = (roleSet as any).licenseId;
    if (
      !roleSet.roles ||
      !roleSet.applications ||
      !roleSet.invitations ||
      !roleSet.platformInvitations ||
      !applicationForm ||
      !licenseId
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for roleSet for deletion: ${roleSet.id} `,
        LogContext.COMMUNITY
      );
    }

    await this.removeAllRoleAssignments(roleSet);

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

    await this.formService.removeForm(applicationForm);
    await this.licenseService.removeLicenseOrFail(licenseId);

    await this.db.delete(roleSets).where(eq(roleSets.id, roleSet.id));
    return true;
  }

  async save(roleSet: IRoleSet): Promise<IRoleSet> {
    if (roleSet.id) {
      const [updated] = await this.db
        .update(roleSets)
        .set({
          entryRoleName: roleSet.entryRoleName,
          type: roleSet.type,
          licenseId: roleSet.license?.id ?? (roleSet as any).licenseId ?? null,
          applicationFormId: roleSet.applicationForm?.id ?? (roleSet as any).applicationFormId ?? null,
          parentRoleSetId: roleSet.parentRoleSet?.id ?? (roleSet as any).parentRoleSetId ?? null,
          authorizationId: roleSet.authorization?.id ?? (roleSet as any).authorizationId ?? null,
        })
        .where(eq(roleSets.id, roleSet.id))
        .returning();
      return { ...roleSet, ...updated } as unknown as IRoleSet;
    }
    const [inserted] = await this.db
      .insert(roleSets)
      .values({
        entryRoleName: roleSet.entryRoleName,
        type: roleSet.type,
        licenseId: roleSet.license?.id ?? null,
        applicationFormId: roleSet.applicationForm?.id ?? null,
        parentRoleSetId: roleSet.parentRoleSet?.id ?? null,
        authorizationId: roleSet.authorization?.id ?? null,
      })
      .returning();
    return { ...roleSet, ...inserted } as unknown as IRoleSet;
  }

  async getParentRoleSet(roleSet: IRoleSet): Promise<IRoleSet | undefined> {
    const roleSetWithParent = await this.getRoleSetOrFail(roleSet.id, {
      with: { parentRoleSet: true },
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
    // If applicationForm is already loaded on the roleSet, use it
    if (roleSet.applicationForm) {
      return roleSet.applicationForm;
    }
    // Otherwise load via FK column
    const roleSetRow = await this.db.query.roleSets.findFirst({
      where: eq(roleSets.id, roleSet.id),
    });
    const formId = (roleSetRow as any)?.applicationFormId;
    let applicationForm: IForm | undefined;
    if (formId) {
      const formRow = await this.db.query.forms.findFirst({
        where: eq(forms.id, formId),
      });
      applicationForm = formRow as unknown as IForm | undefined;
    }
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

  private async removeAllRoleAssignments(roleSet: IRoleSet) {
    // Remove all issued role credentials for contributors
    const roleNames = await this.getRoleNames(roleSet);
    for (const roleName of roleNames) {
      const users = await this.getUsersWithRole(roleSet, roleName);
      for (const user of users) {
        await this.removeUserFromRole(roleSet, roleName, user.id, false);
      }

      // Remove all implicit role assignments
      if (roleSet.type === RoleSetType.SPACE) {
        const invitees = await this.getUsersWithImplicitSpaceRole(
          roleSet,
          AuthorizationCredential.SPACE_MEMBER_INVITEE
        );
        for (const invitee of invitees) {
          await this.removeUserFromRole(roleSet, roleName, invitee.id, false);
        }
        const subspace_admins = await this.getUsersWithImplicitSpaceRole(
          roleSet,
          AuthorizationCredential.SPACE_SUBSPACE_ADMIN
        );
        for (const subspaceAdmin of subspace_admins) {
          await this.removeUserFromRole(
            roleSet,
            roleName,
            subspaceAdmin.id,
            false
          );
        }
      }

      if (roleSet.type === RoleSetType.ORGANIZATION) {
        const accountAdmins =
          await this.getUsersWithImplicitOrganizationAccountAdminRole(roleSet);
        for (const accountAdmin of accountAdmins) {
          await this.removeUserFromRole(
            roleSet,
            roleName,
            accountAdmin.id,
            false
          );
        }
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

      const virtualContributors = await this.getVirtualContributorsWithRole(
        roleSet,
        roleName
      );
      for (const virtualContributor of virtualContributors) {
        await this.removeVirtualFromRole(
          roleSet,
          roleName,
          virtualContributor.id,
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

    const cached = await this.roleSetCacheService.getAgentRolesFromCache(
      agentInfo.agentID,
      roleSet.id
    );
    if (cached) {
      return cached;
    }
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const roles: RoleName[] = await this.getRoleNames(roleSet);
    const rolesThatAgentHas = await Promise.all(
      roles.map(async role => {
        const hasAgentRole = await this.isInRole(agent, roleSet, role);
        return hasAgentRole ? role : undefined;
      })
    );
    const agentRoles = rolesThatAgentHas.filter(
      (role): role is RoleName => role !== undefined
    );
    await this.roleSetCacheService.setAgentRolesCache(
      agent.id,
      roleSet.id,
      agentRoles
    );
    return agentRoles;
  }

  public async findOpenApplication(
    userID: string,
    roleSetID: string
  ): Promise<IApplication | undefined> {
    const cached = await this.roleSetCacheService.getOpenApplicationFromCache(
      userID,
      roleSetID
    );
    if (cached) {
      return cached;
    }

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
      await this.roleSetCacheService.setOpenApplicationCache(
        userID,
        roleSetID,
        application
      );
      return application;
    }
    return undefined;
  }

  async getMembershipStatusByAgentInfo(
    agentInfo: AgentInfo,
    roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    if (!agentInfo.agentID) {
      return CommunityMembershipStatus.NOT_MEMBER;
    }

    const cached = await this.roleSetCacheService.getMembershipStatusFromCache(
      agentInfo.agentID,
      roleSet.id
    );
    if (cached) {
      return cached;
    }

    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const isMember = await this.isMember(agent, roleSet);
    if (isMember) {
      await this.roleSetCacheService.setMembershipStatusCache(
        agent.id,
        roleSet.id,
        CommunityMembershipStatus.MEMBER
      );

      return CommunityMembershipStatus.MEMBER;
    }

    const openApplication = await this.findOpenApplication(
      agentInfo.userID,
      roleSet.id
    );
    if (openApplication) {
      await this.roleSetCacheService.setMembershipStatusCache(
        agent.id,
        roleSet.id,
        CommunityMembershipStatus.APPLICATION_PENDING
      );
      return CommunityMembershipStatus.APPLICATION_PENDING;
    }

    const openInvitation = await this.findOpenInvitation(
      agentInfo.userID,
      roleSet.id
    );
    if (
      openInvitation &&
      (await this.invitationService.canInvitationBeAccepted(openInvitation.id))
    ) {
      await this.roleSetCacheService.setMembershipStatusCache(
        agent.id,
        roleSet.id,
        CommunityMembershipStatus.INVITATION_PENDING
      );
      return CommunityMembershipStatus.INVITATION_PENDING;
    }

    await this.roleSetCacheService.setMembershipStatusCache(
      agent.id,
      roleSet.id,
      CommunityMembershipStatus.NOT_MEMBER
    );

    return CommunityMembershipStatus.NOT_MEMBER;
  }

  public async findOpenInvitation(
    contributorID: string,
    roleSetID: string
  ): Promise<IInvitation | undefined> {
    const cached = await this.roleSetCacheService.getOpenInvitationFromCache(
      contributorID,
      roleSetID
    );
    if (cached) {
      return cached;
    }

    const invitations = await this.invitationService.findExistingInvitations(
      contributorID,
      roleSetID
    );
    for (const invitation of invitations) {
      // skip any finalized invitations; only return pending invitations
      const isFinalized = await this.invitationService.isFinalizedInvitation(
        invitation.id
      );
      if (isFinalized) {
        continue;
      }
      await this.roleSetCacheService.setOpenInvitationCache(
        contributorID,
        roleSetID,
        invitation
      );
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
    return await this.userLookupService.usersWithCredential(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      },
      limit
    );
  }

  private async getUsersWithImplicitSpaceRole(
    roleSet: IRoleSet,
    implicitCredential: AuthorizationCredential
  ): Promise<IUser[]> {
    const inviteeCredential = await this.getCredentialSpaceImplicitRole(
      roleSet,
      implicitCredential
    );

    return await this.userLookupService.usersWithCredential({
      type: inviteeCredential.type,
      resourceID: inviteeCredential.resourceID,
    });
  }

  private async getUsersWithImplicitOrganizationAccountAdminRole(
    roleSet: IRoleSet
  ): Promise<IUser[]> {
    const accountAdminCredential =
      await this.getCredentialForOrganizationImplicitRole(roleSet);

    return await this.userLookupService.usersWithCredential({
      type: accountAdminCredential.type,
      resourceID: accountAdminCredential.resourceID,
    });
  }

  public async getVirtualContributorsInRoleInHierarchy(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<IVirtualContributor[]> {
    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);

    const membershipCredentials: ICredentialDefinition[] = [
      roleDefinition.credential,
    ];
    const parentMembershipCredentials = roleDefinition.parentCredentials;
    if (parentMembershipCredentials.length !== 0) {
      // First one will be the top level roleSet credential for VC
      membershipCredentials.push(...parentMembershipCredentials);
    }
    const eligibleVirtualContributors: IVirtualContributor[] = [];
    for (const membershipCredential of membershipCredentials) {
      const vcsForCredential =
        await this.virtualContributorLookupService.virtualContributorsWithCredentials(
          {
            type: membershipCredential.type,
            resourceID: membershipCredential.resourceID,
          }
        );
      if (vcsForCredential.length > 0) {
        eligibleVirtualContributors.push(...vcsForCredential);
      }
    }
    return eligibleVirtualContributors;
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
    roleName: RoleName,
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

    const userAlreadyHasRole = await this.isInRole(agent, roleSet, roleName);
    if (userAlreadyHasRole) {
      return user;
    }

    await this.assignContributorAgentToRole(
      roleSet,
      roleName,
      agent,
      RoleSetContributorType.USER
    );

    await this.roleSetCacheService.deleteOpenApplicationFromCache(
      userID,
      roleSet.id
    );
    await this.roleSetCacheService.deleteOpenInvitationFromCache(
      userID,
      roleSet.id
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        if (roleName === RoleName.ADMIN && parentRoleSet) {
          // also assign as subspace admin in parent roleSet if there is a parent roleSet
          const subspaceAdminCredential =
            await this.getCredentialSpaceImplicitRole(
              parentRoleSet,
              AuthorizationCredential.SPACE_SUBSPACE_ADMIN
            );
          const alreadyHasSubspaceAdmin =
            await this.agentService.hasValidCredential(
              agent.id,
              subspaceAdminCredential
            );
          if (!alreadyHasSubspaceAdmin) {
            await this.agentService.grantCredentialOrFail({
              agentID: agent.id,
              type: subspaceAdminCredential.type,
              resourceID: subspaceAdminCredential.resourceID,
            });
          }
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        if (roleName === RoleName.ADMIN || roleName === RoleName.OWNER) {
          // also assign as subspace admin in parent roleSet if there is a parent roleSet
          const accountAdminCredential =
            await this.getCredentialForOrganizationImplicitRole(roleSet);
          const alreadyHasAccountAdmin =
            await this.agentService.hasValidCredential(
              agent.id,
              accountAdminCredential
            );
          if (!alreadyHasAccountAdmin) {
            await this.agentService.grantCredentialOrFail({
              agentID: agent.id,
              type: accountAdminCredential.type,
              resourceID: accountAdminCredential.resourceID,
            });
          }
        }
        break;
      }
    }

    await this.contributorAddedToRole(
      user,
      agent.id,
      roleSet,
      roleName,
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
          with: {
            roleSet: {
              with: {
                parentRoleSet: true,
              },
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
      const { agent } =
        await this.contributorService.getContributorAndAgent(contributorID);
      if (invitation.invitedToParent) {
        if (!roleSet.parentRoleSet) {
          throw new EntityNotInitializedException(
            `Unable to load parent community when flag to add is set: ${invitation.id}`,
            LogContext.COMMUNITY
          );
        }
        // Check if the user is already a member of the parent roleSet
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
      if (
        roleSet.type === RoleSetType.SPACE &&
        invitation.contributorType === RoleSetContributorType.USER
      ) {
        // Remove the credential for being an invitee
        await this.removeSpaceInviteeCredential(agent, roleSet);
      }
      for (const extraRole of invitation.extraRoles) {
        try {
          await this.assignContributorToRole(
            roleSet,
            extraRole,
            contributorID,
            invitation.contributorType,
            agentInfo,
            false
          );
        } catch (e: any) {
          // Do not throw an exception further as there might not be entitlements to grant the extra role
          this.logger.warn?.(
            `Unable to add contributor (${contributorID}) to extra roles (${invitation.extraRoles}) in community: ${e}`,
            LogContext.COMMUNITY
          );
        }
      }
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        contributorID,
        roleSet.id
      );
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

  private async assignSpaceInviteeCredential(agent: IAgent, roleSet: IRoleSet) {
    const inviteeCredential = await this.getCredentialSpaceImplicitRole(
      roleSet,
      AuthorizationCredential.SPACE_MEMBER_INVITEE
    );
    const hasInviteeCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      }
    );
    if (!hasInviteeCredential) {
      await this.agentService.grantCredentialOrFail({
        agentID: agent.id,
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      });
    }
  }

  private async removeSpaceInviteeCredential(agent: IAgent, roleSet: IRoleSet) {
    const inviteeCredential = await this.getCredentialSpaceImplicitRole(
      roleSet,
      AuthorizationCredential.SPACE_MEMBER_INVITEE
    );
    const hasInviteeCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      }
    );
    if (hasInviteeCredential) {
      await this.agentService.revokeCredential({
        agentID: agent.id,
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      });
    }
  }
  private async contributorAddedToRole(
    contributor: IContributor,
    contributorAgentId: string,
    roleSet: IRoleSet,
    role: RoleName,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ) {
    await this.roleSetCacheService.appendAgentRoleCache(
      contributorAgentId,
      roleSet.id,
      role
    );
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
          await this.communityCommunicationService.addMemberToCommunication(
            communication,
            contributor
          );

          await this.roleSetCacheService.setMembershipStatusCache(
            contributorAgentId,
            roleSet.id,
            CommunityMembershipStatus.MEMBER
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
      agent.id,
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
      with: { parentRoleSet: true },
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

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        const parentRoleSet = await this.getParentRoleSet(roleSet);
        if (roleType === RoleName.ADMIN && parentRoleSet) {
          await this.removeContributorFromSubspaceAdminImplicitRole(
            roleSet,
            parentRoleSet,
            agent
          );
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

          // Clean up notifications for this user in this space and all descendant spaces (L1, L2, etc.)
          const space =
            await this.communityResolverService.getSpaceForRoleSetOrFail(
              roleSet.id
            );

          // Delete notifications from the current space
          await this.inAppNotificationService.deleteAllForReceiverInSpace(
            userID,
            space.id
          );

          // Also delete notifications from all descendant spaces (L1, L2, etc.)
          // since user is automatically removed from those as well
          const descendantSpaceIDs =
            await this.spaceLookupService.getAllDescendantSpaceIDs(space.id);
          if (descendantSpaceIDs.length > 0) {
            await this.inAppNotificationService.deleteAllForReceiverInSpaces(
              userID,
              descendantSpaceIDs
            );
          }
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        if (roleType === RoleName.ADMIN || roleType === RoleName.OWNER) {
          await this.removeContributorFromAccountAdminImplicitRole(
            roleSet,
            agent
          );
        }

        // Clean up notifications only when user is completely removed (MEMBER role)
        // If only ADMIN or OWNER is removed, user still has access as MEMBER
        if (roleType === RoleName.MEMBER) {
          const adminCredential = await this.getCredentialDefinitionForRole(
            roleSet,
            RoleName.ADMIN
          );
          await this.inAppNotificationService.deleteAllForReceiverInOrganization(
            userID,
            adminCredential.resourceID
          );
        }
        break;
      }
    }

    await this.roleSetCacheService.cleanAgentMembershipCache(
      agent.id,
      roleSet.id
    );

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

    // Clean up notifications for this organization when removed from space and all descendant spaces
    if (roleSet.type === RoleSetType.SPACE && roleType === RoleName.MEMBER) {
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          roleSet.id
        );

      // Delete notifications from the current space
      await this.inAppNotificationService.deleteAllForContributorOrganizationInSpace(
        organizationID,
        space.id
      );

      // Also delete notifications from all descendant spaces (L1, L2, etc.)
      const descendantSpaceIDs =
        await this.spaceLookupService.getAllDescendantSpaceIDs(space.id);
      if (descendantSpaceIDs.length > 0) {
        await this.inAppNotificationService.deleteAllForContributorOrganizationInSpaces(
          organizationID,
          descendantSpaceIDs
        );
      }
    }

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

    // Clean up notifications for this VC when removed from space and all descendant spaces
    if (roleSet.type === RoleSetType.SPACE && roleType === RoleName.MEMBER) {
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          roleSet.id
        );

      // Delete notifications from the current space
      await this.inAppNotificationService.deleteAllForContributorVcInSpace(
        virtualContributorID,
        space.id
      );

      // Also delete notifications from all descendant spaces (L1, L2, etc.)
      const descendantSpaceIDs =
        await this.spaceLookupService.getAllDescendantSpaceIDs(space.id);
      if (descendantSpaceIDs.length > 0) {
        await this.inAppNotificationService.deleteAllForContributorVcInSpaces(
          virtualContributorID,
          descendantSpaceIDs
        );
      }
    }

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

    switch (action) {
      case RoleSetUpdateType.ASSIGN: {
        if (userMembersCount === 0) {
          break;
        }
        if (userMembersCount === userPolicy.maximum) {
          throw new RoleSetPolicyRoleLimitsException(
            `Max limit of users reached for role '${roleType}': ${userPolicy.maximum}, cannot assign new user.`,
            LogContext.COMMUNITY
          );
        }
        break;
      }
      case RoleSetUpdateType.REMOVE: {
        if (userMembersCount === userPolicy.minimum) {
          throw new RoleSetPolicyRoleLimitsException(
            `Min limit of users reached for role '${roleType}': ${userPolicy.minimum}, cannot remove user from role on RoleSet: ${roleSet.id}, type: ${roleSet.type}`,
            LogContext.COMMUNITY
          );
        }
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

    return await this.agentService.grantCredentialOrFail({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  private async removeContributorFromSubspaceAdminImplicitRole(
    roleSet: IRoleSet,
    parentRoleSet: IRoleSet,
    agent: IAgent
  ): Promise<IAgent> {
    this.validateRoleSetType(roleSet, RoleSetType.SPACE);

    // Check if an admin anywhere else in the roleSet
    const peerRoleSets = await this.getPeerRoleSets(parentRoleSet, roleSet);
    const hasAnotherAdminRole = peerRoleSets.some(pc =>
      this.isInRole(agent, pc, RoleName.ADMIN)
    );

    if (!hasAnotherAdminRole) {
      const credential = await this.getCredentialSpaceImplicitRole(
        roleSet,
        AuthorizationCredential.SPACE_SUBSPACE_ADMIN
      );

      return await this.agentService.revokeCredential({
        agentID: agent.id,
        type: credential.type,
        resourceID: credential.resourceID,
      });
    }
    return agent;
  }

  private async removeContributorFromAccountAdminImplicitRole(
    roleSet: IRoleSet,
    agent: IAgent
  ): Promise<IAgent> {
    this.validateRoleSetType(roleSet, RoleSetType.ORGANIZATION);
    // Only two roles, so check if the user has the other one
    const hasAdminRole = await this.isInRole(agent, roleSet, RoleName.ADMIN);
    const hasOwnerRole = await this.isInRole(agent, roleSet, RoleName.OWNER);

    if (!hasAdminRole && !hasOwnerRole) {
      const credential =
        await this.getCredentialForOrganizationImplicitRole(roleSet);

      return await this.agentService.revokeCredential({
        agentID: agent.id,
        type: credential.type,
        resourceID: credential.resourceID,
      });
    }
    return agent;
  }

  private validateRoleSetType(roleSet: IRoleSet, roleSetType: RoleSetType) {
    if (roleSet.type !== roleSetType) {
      throw new RoleSetMembershipException(
        `Invalid roleSet type: ${roleSet.type} when assigning space implicit role`,
        LogContext.COMMUNITY
      );
    }
  }

  private async getCredentialSpaceImplicitRole(
    roleSet: IRoleSet,
    implicitRoleCredential: AuthorizationCredential
  ): Promise<ICredentialDefinition> {
    this.validateRoleSetType(roleSet, RoleSetType.SPACE);

    // Use the admin credential to get the resourceID
    const adminCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.ADMIN
    );
    const spaceID = adminCredential.resourceID;

    return {
      type: implicitRoleCredential,
      resourceID: spaceID,
    };
  }

  private async getCredentialForOrganizationImplicitRole(
    roleSet: IRoleSet
  ): Promise<ICredentialDefinition> {
    this.validateRoleSetType(roleSet, RoleSetType.ORGANIZATION);

    // Use the admin credential to get the organizationID
    const adminCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.ADMIN
    );
    const organizationID = adminCredential.resourceID;
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(
        organizationID
      );
    return {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: organization.accountID,
    };
  }

  public async removeCurrentUserFromRolesInRoleSet(
    roleSet: IRoleSet,
    agentInfo: AgentInfo
  ): Promise<void> {
    const userRoles = await this.getRolesForAgentInfo(agentInfo, roleSet);
    for (const role of userRoles) {
      await this.removeUserFromRole(roleSet, role, agentInfo.userID);
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

    let updatedAgent: IAgent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });

    if (roleCredential.type === AuthorizationCredential.SPACE_MEMBER) {
      updatedAgent = await this.revokeSpaceTreeCredentials(
        agent,
        roleCredential.resourceID
      );
    }

    return updatedAgent;
  }

  private async revokeSpaceTreeCredentials(
    agent: IAgent,
    spaceId: string
  ): Promise<IAgent> {
    const subspaceIDs = await this.getAllSubspaceIds(spaceId);
    const fullSpaceHierarchyIds = [spaceId, ...subspaceIDs];
    const credentialsToRevoke = fullSpaceHierarchyIds.flatMap(spaceID => [
      {
        type: AuthorizationCredential.SPACE_MEMBER,
        resourceID: spaceID,
      },
      {
        type: AuthorizationCredential.SPACE_ADMIN,
        resourceID: spaceID,
      },
      {
        type: AuthorizationCredential.SPACE_LEAD,
        resourceID: spaceID,
      },
      {
        type: AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
        resourceID: spaceID,
      },
    ]);

    let updatedAgent = agent;
    for (const credential of credentialsToRevoke) {
      updatedAgent = await this.agentService.revokeCredential({
        agentID: agent.id,
        ...credential,
      });
    }

    return updatedAgent;
  }

  private async getAllSubspaceIds(spaceId: string): Promise<string[]> {
    const spaceHierarchy =
      await this.spaceLookupService.getFullSpaceHierarchy(spaceId);
    const subspaces = spaceHierarchy?.subspaces || [];
    return this.flattenSubspaces(subspaces);
  }

  private flattenSubspaces(subspaces: ISpace[]): string[] {
    return subspaces.flatMap(subspace => [
      subspace.id,
      ...(subspace.subspaces ? this.flattenSubspaces(subspace.subspaces) : []),
    ]);
  }

  public async isMember(agent: IAgent, roleSet: IRoleSet): Promise<boolean> {
    const cached = await this.roleSetCacheService.getAgentIsMemberFromCache(
      agent.id,
      roleSet.id
    );
    if (cached) {
      return cached;
    }
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
    await this.roleSetCacheService.setAgentIsMemberCache(
      agent.id,
      roleSet.id,
      validCredential
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
    let credential: ICredentialDefinition | undefined;
    switch (role) {
      case RoleSetRoleImplicit.SUBSPACE_ADMIN:
        credential = await this.getCredentialSpaceImplicitRole(
          roleSet,
          AuthorizationCredential.SPACE_SUBSPACE_ADMIN
        );
        break;
      case RoleSetRoleImplicit.ACCOUNT_ADMIN:
        credential =
          await this.getCredentialForOrganizationImplicitRole(roleSet);
        break;
      default:
        throw new RoleSetMembershipException(
          `Invalid implicit role: ${role}`,
          LogContext.COMMUNITY
        );
    }

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: credential.type,
        resourceID: credential.resourceID,
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
      with: {
        parentRoleSet: true,
      },
    });

    await this.validateApplicationFromUser(user, agent, roleSet);

    const application =
      await this.applicationService.createApplication(applicationData);
    application.roleSet = roleSet;

    const savedApplication = await this.applicationService.save(application);

    await this.roleSetCacheService.deleteMembershipStatusCache(
      agent.id,
      roleSet.id
    );

    return savedApplication;
  }

  async createInvitationExistingContributor(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const { contributor, agent } =
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

    const result = await this.invitationService.save(invitation);
    // Ensure that the user that is invited has a credential for the invitation
    if (roleSet.type === RoleSetType.SPACE) {
      await this.assignSpaceInviteeCredential(agent, roleSet);
    }

    await this.roleSetCacheService.deleteMembershipStatusCache(
      agent.id,
      roleSet.id
    );

    return result;
  }

  async createPlatformInvitation(
    roleSet: IRoleSet,
    email: string,
    welcomeMessage: string,
    roleSetInvitedToParent: boolean,
    extraRoles: RoleName[],
    agentInfo: AgentInfo
  ): Promise<IPlatformInvitation> {
    const externalInvitationInput: CreatePlatformInvitationInput = {
      roleSetID: roleSet.id,
      welcomeMessage,
      email,
      roleSetInvitedToParent,
      roleSetExtraRoles: extraRoles,
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
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        contributor.id,
        roleSet.id
      );
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
      with: { applications: true },
    });
    return roleSetApplications?.applications || [];
  }

  async getInvitations(roleSet: IRoleSet): Promise<IInvitation[]> {
    const roleSetInvitations = await this.getRoleSetOrFail(roleSet.id, {
      with: { invitations: true },
    });
    return roleSetInvitations?.invitations || [];
  }

  async getPlatformInvitations(
    roleSet: IRoleSet
  ): Promise<IPlatformInvitation[]> {
    const roleSetInvs = await this.getRoleSetOrFail(roleSet.id, {
      with: { platformInvitations: true },
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

  async getImplicitRoles(
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
    const result = await this.db.query.roleSets.findMany({
      where: and(
        eq(roleSets.parentRoleSetId, parentRoleSet.id),
        ne(roleSets.id, childRoleSet.id)
      ),
    });
    return result as unknown as IRoleSet[];
  }

  public async setParentRoleSetAndCredentials(
    childRoleSet: IRoleSet,
    parentRoleSet: IRoleSet
  ): Promise<IRoleSet> {
    childRoleSet.parentRoleSet = parentRoleSet;

    const roleDefinitions = await this.getRoleDefinitions(childRoleSet);

    for (const roleDefinition of roleDefinitions) {
      const parentCredentials: ICredentialDefinition[] = [];

      const parentRoleDefinition = await this.getRoleDefinition(
        parentRoleSet,
        roleDefinition.name
      );
      const parentDirectCredential = parentRoleDefinition.credential;
      const parentParentCredentials = parentRoleDefinition.parentCredentials;

      parentCredentials.push(parentDirectCredential);
      parentParentCredentials.forEach(c => parentCredentials?.push(c));

      roleDefinition.parentCredentials = parentCredentials;
    }

    return childRoleSet;
  }

  /** Not the most efficient implementation, but is only called when converting a RoleSet to one without parents, an
   * exceptional flow.
   */
  public async removeParentRoleSet(roleSetID: string): Promise<IRoleSet> {
    const roleSet = await this.getRoleSetOrFail(roleSetID, {
      with: {
        roles: true,
        parentRoleSet: true,
      },
    });

    roleSet.parentRoleSet = undefined;

    const roleDefinitions = await this.getRoleDefinitions(roleSet);

    for (const roleDefinition of roleDefinitions) {
      roleDefinition.parentCredentials = [];
    }
    roleSet.roles = roleDefinitions;

    await this.save(roleSet);
    // Explicitly set parentRoleSetId to NULL
    await this.db
      .update(roleSets)
      .set({ parentRoleSetId: null })
      .where(eq(roleSets.id, roleSetID));

    return await this.getRoleSetOrFail(roleSetID);
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
    roleName: RoleName
  ): Promise<ICredentialDefinition[]> {
    const result = await this.getCredentialsForRole(roleSet, roleName);
    const parentCredentials = await this.getParentCredentialsForRole(
      roleSet,
      roleName
    );
    return result.concat(parentCredentials);
  }

  public async getCredentialsForRole(
    roleSet: IRoleSet,
    roleName: RoleName
  ): Promise<ICredentialDefinition[]> {
    const result = [await this.getCredentialForRole(roleSet, roleName)];
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
        with: { roles: true },
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
        with: { roles: true },
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
        with: { roleSet: true, user: true },
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

    await this.roleSetCacheService.deleteOpenApplicationFromCache(
      userID,
      roleSet.id
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
