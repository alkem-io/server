import { ActorType } from '@common/enums/actor.type';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { RoleSetRoleImplicit } from '@common/enums/role.set.role.implicit';
import { RoleSetType } from '@common/enums/role.set.type';
import { RoleSetUpdateType } from '@common/enums/role.set.update.type';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  RoleSetPolicyRoleLimitsException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  CreateApplicationInput,
  IApplication,
} from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { CreateInvitationInput, IInvitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { CreatePlatformInvitationInput } from '@domain/access/invitation.platform/dto/platform.invitation.dto.create';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { IForm } from '@domain/common/form/form.interface';
import { FormService } from '@domain/common/form/form.service';
import { LicenseService } from '@domain/common/license/license.service';
import { CommunityCommunicationService } from '@domain/community/community-communication/community.communication.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, In, Not, Repository } from 'typeorm';
import { IActorRolePolicy } from '../role/actor.role.policy.interface';
import { IRole } from '../role/role.interface';
import { RoleService } from '../role/role.service';
import { CreateRoleSetInput } from './dto/role.set.dto.create';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetCacheService } from './role.set.service.cache';
import { RoleSetEventsService } from './role.set.service.events';

/**
 * Options for {@link RoleSetService.ensureMemberOfRoleSetAndAncestors}. The
 * shared grant service is consumed by BOTH the application-approval and the
 * invitation-accept flows (feature 017 — FR-017); the source-specific
 * behaviour is expressed through these options.
 */
export interface EnsureMemberOfRoleSetAndAncestorsOptions {
  /** Which lifecycle is invoking the shared grant. */
  source: 'application' | 'invitation';
  /**
   * Invitation only: whether the invitee should also be granted membership of
   * the ancestor chain (mirrors `Invitation.invitedToParent`). For the
   * application source ancestor-granting is decided by re-evaluating the
   * combined-flow authorisation at approval time (FR-015), not by this flag.
   */
  invitedToParent?: boolean;
  /** Invitation only: extra roles to (best-effort) grant on the target role-set. */
  extraRoles?: RoleName[];
  /** Invitation only (SPACE target): remove the SPACE_MEMBER_INVITEE credential. */
  removeSpaceInviteeCredential?: boolean;
}

@Injectable()
export class RoleSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private formService: FormService,
    private roleService: RoleService,
    private actorService: ActorService,
    private actorLookupService: ActorLookupService,
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
    @InjectRepository(RoleSet)
    private roleSetRepository: Repository<RoleSet>,
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

    await this.formService.removeForm(roleSet.applicationForm);
    await this.licenseService.removeLicenseOrFail(roleSet.license.id);

    await this.roleSetRepository.remove(roleSet as RoleSet);
    return true;
  }

  async save(roleSet: IRoleSet): Promise<IRoleSet> {
    return await this.roleSetRepository.save(roleSet);
  }

  /**
   * Removes pending (non-finalized) invitations and applications across the
   * given roleSet(s), plus all platform invitations. Used by space conversion
   * / move flows so that recipients do not try to accept invites that point
   * to a target whose hierarchy has changed (see alkem-io/server#5069).
   */
  async removePendingInvitationsAndApplications(
    roleSetID: string | string[]
  ): Promise<void> {
    const ids = Array.isArray(roleSetID) ? roleSetID : [roleSetID];
    if (ids.length === 0) return;

    const roleSets = await this.roleSetRepository.find({
      where: { id: In(ids) },
      relations: {
        applications: true,
        invitations: true,
        platformInvitations: true,
      },
    });

    const pendingApplications = roleSets
      .flatMap(rs => rs.applications ?? [])
      .filter(app => !this.applicationService.isApplicationFinalized(app));
    const pendingInvitations = roleSets
      .flatMap(rs => rs.invitations ?? [])
      .filter(inv => !this.invitationService.isInvitationFinalized(inv));
    const platformInvitations = roleSets.flatMap(
      rs => rs.platformInvitations ?? []
    );

    await Promise.all([
      Promise.all(
        pendingApplications.map(a =>
          this.applicationService.deleteApplication({ ID: a.id })
        )
      ),
      Promise.all(
        pendingInvitations.map(i =>
          this.invitationService.deleteInvitation({ ID: i.id })
        )
      ),
      Promise.all(
        platformInvitations.map(p =>
          this.platformInvitationService.deletePlatformInvitation({ ID: p.id })
        )
      ),
    ]);
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

  private async removeAllRoleAssignments(roleSet: IRoleSet) {
    // Remove all issued role credentials for all contributor types
    const roleNames = await this.getRoleNames(roleSet);
    for (const roleName of roleNames) {
      // UNIFIED: Get all contributors (users, orgs, VCs) with this role
      const contributors = await this.getActorsWithRole(roleSet, roleName);
      for (const contributor of contributors) {
        await this.removeActorFromRole(
          roleSet,
          roleName,
          contributor.id,
          false
        );
      }

      // Handle implicit role credentials (these are user-specific)
      if (roleSet.type === RoleSetType.SPACE) {
        const inviteeIds = await this.getUserIDsWithImplicitSpaceRole(
          roleSet,
          AuthorizationCredential.SPACE_MEMBER_INVITEE
        );
        for (const inviteeId of inviteeIds) {
          await this.removeActorFromRole(roleSet, roleName, inviteeId, false);
        }
        const subspaceAdminIds = await this.getUserIDsWithImplicitSpaceRole(
          roleSet,
          AuthorizationCredential.SPACE_SUBSPACE_ADMIN
        );
        for (const subspaceAdminId of subspaceAdminIds) {
          await this.removeActorFromRole(
            roleSet,
            roleName,
            subspaceAdminId,
            false
          );
        }
      }

      if (roleSet.type === RoleSetType.ORGANIZATION) {
        const accountAdminIds =
          await this.getUserIDsWithImplicitOrganizationAccountAdminRole(
            roleSet
          );
        for (const accountAdminId of accountAdminIds) {
          await this.removeActorFromRole(
            roleSet,
            roleName,
            accountAdminId,
            false
          );
        }
      }
    }
  }

  async getRolesForActorContext(
    actorContext: ActorContext,
    roleSet: IRoleSet
  ): Promise<RoleName[]> {
    if (!actorContext.actorID) {
      return [];
    }

    const cached = await this.roleSetCacheService.getActorRolesFromCache(
      actorContext.actorID,
      roleSet.id
    );
    if (cached) {
      return cached;
    }
    const actorID = actorContext.actorID;
    const roles: RoleName[] = await this.getRoleNames(roleSet);
    const rolesThatActorHas = await Promise.all(
      roles.map(async role => {
        const hasActorRole = await this.isInRole(actorID, roleSet, role);
        return hasActorRole ? role : undefined;
      })
    );
    const actorRoles = rolesThatActorHas.filter(
      (role): role is RoleName => role !== undefined
    );
    await this.roleSetCacheService.setActorRolesCache(
      actorID,
      roleSet.id,
      actorRoles
    );
    return actorRoles;
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

  async getMembershipStatusByActorContext(
    actorContext: ActorContext,
    roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    if (!actorContext.actorID) {
      return CommunityMembershipStatus.NOT_MEMBER;
    }

    const cached = await this.roleSetCacheService.getMembershipStatusFromCache(
      actorContext.actorID,
      roleSet.id
    );
    if (cached) {
      return cached;
    }

    const actorID = actorContext.actorID;
    const isMember = await this.isMember(actorID, roleSet);
    if (isMember) {
      await this.roleSetCacheService.setMembershipStatusCache(
        actorID,
        roleSet.id,
        CommunityMembershipStatus.MEMBER
      );

      return CommunityMembershipStatus.MEMBER;
    }

    const openApplication = await this.findOpenApplication(actorID, roleSet.id);
    if (openApplication) {
      await this.roleSetCacheService.setMembershipStatusCache(
        actorID,
        roleSet.id,
        CommunityMembershipStatus.APPLICATION_PENDING
      );
      return CommunityMembershipStatus.APPLICATION_PENDING;
    }

    const openInvitation = await this.findOpenInvitation(actorID, roleSet.id);
    if (
      openInvitation &&
      (await this.invitationService.canInvitationBeAccepted(openInvitation.id))
    ) {
      await this.roleSetCacheService.setMembershipStatusCache(
        actorID,
        roleSet.id,
        CommunityMembershipStatus.INVITATION_PENDING
      );
      return CommunityMembershipStatus.INVITATION_PENDING;
    }

    await this.roleSetCacheService.setMembershipStatusCache(
      actorID,
      roleSet.id,
      CommunityMembershipStatus.NOT_MEMBER
    );

    return CommunityMembershipStatus.NOT_MEMBER;
  }

  public async findOpenInvitation(
    actorID: string,
    roleSetID: string
  ): Promise<IInvitation | undefined> {
    const cached = await this.roleSetCacheService.getOpenInvitationFromCache(
      actorID,
      roleSetID
    );
    if (cached) {
      return cached;
    }

    const invitations = await this.invitationService.findExistingInvitations(
      actorID,
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
        actorID,
        roleSetID,
        invitation
      );
      return invitation;
    }
    return undefined;
  }

  // UNIFIED: Get actors with role, optionally filtered by type
  // TypeORM inheritance returns concrete types automatically
  public async getActorsWithRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    actorTypes?: ActorType[],
    limit?: number
  ): Promise<IActor[]> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.actorLookupService.actorsWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      },
      actorTypes,
      limit
    );
  }

  // Convenience methods for GraphQL resolvers that need specific entity types.
  // These query the actual entity tables (User, Organization, VirtualContributor)
  // instead of casting Actor[], which would lack entity-specific fields like nameID.
  public async getUsersWithRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    limit?: number
  ): Promise<IUser[]> {
    const credential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return this.userLookupService.usersWithCredential(credential, limit);
  }

  public async getOrganizationsWithRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<IOrganization[]> {
    const credential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return this.organizationLookupService.organizationsWithCredentials(
      credential
    );
  }

  public async getVirtualContributorsWithRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<IVirtualContributor[]> {
    const credential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return this.virtualContributorLookupService.virtualContributorsWithCredentials(
      credential
    );
  }

  private async getUserIDsWithImplicitSpaceRole(
    roleSet: IRoleSet,
    implicitCredential: AuthorizationCredential
  ): Promise<string[]> {
    const inviteeCredential = await this.getCredentialSpaceImplicitRole(
      roleSet,
      implicitCredential
    );

    return await this.actorLookupService.getActorIDsWithCredential(
      {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      },
      [ActorType.USER]
    );
  }

  private async getUserIDsWithImplicitOrganizationAccountAdminRole(
    roleSet: IRoleSet
  ): Promise<string[]> {
    const accountAdminCredential =
      await this.getCredentialForOrganizationImplicitRole(roleSet);

    return await this.actorLookupService.getActorIDsWithCredential(
      {
        type: accountAdminCredential.type,
        resourceID: accountAdminCredential.resourceID,
      },
      [ActorType.USER]
    );
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

  // Count actors with role, optionally filtered by type
  public async countActorsWithRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    actorTypes?: ActorType[]
  ): Promise<number> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    return await this.actorLookupService.countActorsWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      },
      actorTypes
    );
  }

  public async getCredentialDefinitionForRole(
    roleSet: IRoleSet,
    role: RoleName
  ): Promise<ICredentialDefinition> {
    const credential = this.getCredentialForRole(roleSet, role);
    return credential;
  }

  // UNIFIED: One method for ALL actor types
  // Any actor can be assigned to any role - the logic is the same
  public async assignActorToRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    actorID: string,
    actorContext?: ActorContext,
    triggerNewMemberEvents = false
  ): Promise<string> {
    // 1. Get actor type without loading full entity
    const actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(actorID);

    // 2. Check membership in parent role set
    const { isMember: hasMemberRoleInParent, parentRoleSet } =
      await this.isActorMemberInParentRoleSet(actorID, roleSet.id);
    if (!hasMemberRoleInParent) {
      throw new ValidationException(
        `Unable to assign Actor (${actorID}) to roleSet (${roleSet.id}): actor is not a member of parent roleSet ${parentRoleSet?.id}`,
        LogContext.SPACES
      );
    }

    // 3. Check if already in role
    const alreadyHasRole = await this.isInRole(actorID, roleSet, roleType);
    if (alreadyHasRole) {
      return actorID;
    }

    // 4. Assign role credential
    await this.grantRoleCredential(roleSet, roleType, actorID, actorType);

    // 5. Clear caches (applies to all actors)
    await this.roleSetCacheService.deleteOpenApplicationFromCache(
      actorID,
      roleSet.id
    );
    await this.roleSetCacheService.deleteOpenInvitationFromCache(
      actorID,
      roleSet.id
    );

    // 6. Handle implicit roles (for ALL actor types - any actor can be admin!)
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        if (roleType === RoleName.ADMIN && parentRoleSet) {
          // Grant subspace admin credential to any actor becoming admin
          const subspaceAdminCredential =
            await this.getCredentialSpaceImplicitRole(
              parentRoleSet,
              AuthorizationCredential.SPACE_SUBSPACE_ADMIN
            );
          const alreadyHasSubspaceAdmin =
            await this.actorService.hasValidCredential(
              actorID,
              subspaceAdminCredential
            );
          if (!alreadyHasSubspaceAdmin) {
            await this.actorService.grantCredentialOrFail(actorID, {
              type: subspaceAdminCredential.type,
              resourceID: subspaceAdminCredential.resourceID,
            });
          }
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        if (roleType === RoleName.ADMIN || roleType === RoleName.OWNER) {
          // Grant account admin credential to any actor becoming admin/owner
          const accountAdminCredential =
            await this.getCredentialForOrganizationImplicitRole(roleSet);
          const alreadyHasAccountAdmin =
            await this.actorService.hasValidCredential(
              actorID,
              accountAdminCredential
            );
          if (!alreadyHasAccountAdmin) {
            await this.actorService.grantCredentialOrFail(actorID, {
              type: accountAdminCredential.type,
              resourceID: accountAdminCredential.resourceID,
            });
          }
        }
        break;
      }
    }

    // 7. Post-assignment processing (unified for all actors)
    await this.actorAddedToRole(
      actorID,
      actorType,
      roleSet,
      roleType,
      actorContext,
      triggerNewMemberEvents
    );

    // 8. Type-specific extensions (can be moved to events later)
    if (
      actorType === ActorType.VIRTUAL_CONTRIBUTOR &&
      roleSet.type === RoleSetType.SPACE
    ) {
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          roleSet.id
        );
      void this.aiServerAdapter.ensureContextIsLoaded(space.id);
    }

    return actorID;
  }

  // UNIFIED: Accept invitation - works for any actor type
  public async acceptInvitationToRoleSet(
    invitationID: string,
    actorContext: ActorContext
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

      const actorID = invitation.invitedActorID;
      const roleSet = invitation.roleSet;
      if (!actorID || !roleSet) {
        throw new EntityNotInitializedException(
          `Lifecycle not initialized on Invitation: ${invitation.id}`,
          LogContext.COMMUNITY
        );
      }

      if (invitation.invitedToParent && !roleSet.parentRoleSet) {
        throw new EntityNotInitializedException(
          `Unable to load parent community when flag to add is set: ${invitation.id}`,
          LogContext.COMMUNITY
        );
      }

      // Route through the shared grant service (feature 017 — FR-017). Behaviour-
      // preserving: `invitedToParent` drives ancestor granting (now full-chain,
      // a superset of the previous single-hop — research R2), `extraRoles` and
      // the invitee-credential cleanup are carried through unchanged, and the two
      // XState lifecycle machines stay separate.
      await this.ensureMemberOfRoleSetAndAncestors(
        roleSet,
        actorID,
        actorContext,
        {
          source: 'invitation',
          invitedToParent: invitation.invitedToParent,
          extraRoles: invitation.extraRoles,
          removeSpaceInviteeCredential: true,
        }
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

  // Actor-based credential methods - entity.id IS the actorID
  private async assignSpaceInviteeCredential(
    actorID: string,
    roleSet: IRoleSet
  ) {
    const inviteeCredential = await this.getCredentialSpaceImplicitRole(
      roleSet,
      AuthorizationCredential.SPACE_MEMBER_INVITEE
    );
    const hasInviteeCredential = await this.actorService.hasValidCredential(
      actorID,
      {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      }
    );
    if (!hasInviteeCredential) {
      await this.actorService.grantCredentialOrFail(actorID, {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      });
    }
  }

  private async removeSpaceInviteeCredential(
    actorID: string,
    roleSet: IRoleSet
  ) {
    const inviteeCredential = await this.getCredentialSpaceImplicitRole(
      roleSet,
      AuthorizationCredential.SPACE_MEMBER_INVITEE
    );
    const hasInviteeCredential = await this.actorService.hasValidCredential(
      actorID,
      {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      }
    );
    if (hasInviteeCredential) {
      await this.actorService.revokeCredential(actorID, {
        type: inviteeCredential.type,
        resourceID: inviteeCredential.resourceID,
      });
    }
  }
  private async actorAddedToRole(
    actorID: string,
    actorType: ActorType,
    roleSet: IRoleSet,
    role: RoleName,
    actorContext?: ActorContext,
    triggerNewMemberEvents = false
  ) {
    await this.roleSetCacheService.appendActorRoleCache(
      actorID,
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
            actorID
          );

          await this.roleSetCacheService.setMembershipStatusCache(
            actorID,
            roleSet.id,
            CommunityMembershipStatus.MEMBER
          );

          if (actorContext) {
            await this.roleSetEventsService.registerCommunityNewMemberActivity(
              roleSet,
              actorID,
              actorContext
            );

            if (triggerNewMemberEvents) {
              await this.roleSetEventsService.processCommunityNewMemberEvents(
                roleSet,
                actorContext,
                actorID,
                actorType
              );
            }
          }
        }
        break;
      }
    }
  }

  // Actor-based methods for VirtualContributor (which extends Actor)
  private async isActorMemberInParentRoleSet(
    actorID: string,
    roleSetID: string
  ): Promise<{ parentRoleSet: IRoleSet | undefined; isMember: boolean }> {
    const roleSet = await this.getRoleSetOrFail(roleSetID, {
      relations: { parentRoleSet: true },
    });

    if (roleSet.parentRoleSet) {
      const isParentMember = await this.isActorMember(
        actorID,
        roleSet.parentRoleSet
      );
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

  private async isActorMember(
    actorID: string,
    roleSet: IRoleSet
  ): Promise<boolean> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.MEMBER
    );
    return await this.actorService.hasValidCredential(actorID, {
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  private async isActorInRole(
    actorID: string,
    roleSet: IRoleSet,
    role: RoleName
  ): Promise<boolean> {
    const roleCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      role
    );
    return await this.actorService.hasValidCredential(actorID, {
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  private async grantRoleCredential(
    roleSet: IRoleSet,
    roleType: RoleName,
    actorID: string,
    actorType: ActorType,
    entityManager?: EntityManager
  ): Promise<void> {
    const roleCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    await this.validateActorPolicyLimits(
      roleSet,
      roleType,
      RoleSetUpdateType.ASSIGN,
      actorType
    );
    await this.actorService.grantCredentialOrFail(
      actorID,
      {
        type: roleCredential.type,
        resourceID: roleCredential.resourceID,
      },
      entityManager
    );
  }

  private async revokeRoleCredential(
    roleSet: IRoleSet,
    roleType: RoleName,
    actorID: string,
    actorType: ActorType,
    validatePolicyLimits = true
  ): Promise<void> {
    if (validatePolicyLimits) {
      await this.validateActorPolicyLimits(
        roleSet,
        roleType,
        RoleSetUpdateType.REMOVE,
        actorType
      );
    }
    const roleCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      roleType
    );
    await this.actorService.revokeCredential(actorID, {
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  // UNIFIED: One method for ALL actor types
  // Any actor can be removed from any role - the logic is the same
  public async removeActorFromRole(
    roleSet: IRoleSet,
    roleType: RoleName,
    actorID: string,
    validatePolicyLimits = true
  ): Promise<string> {
    // 1. Get actor type without loading full entity
    const actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(actorID);

    // 2. Remove role credential
    await this.revokeRoleCredential(
      roleSet,
      roleType,
      actorID,
      actorType,
      validatePolicyLimits
    );

    // 3. Handle implicit role removal (for ALL actor types)
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        const parentRoleSet = await this.getParentRoleSet(roleSet);
        if (roleType === RoleName.ADMIN && parentRoleSet) {
          await this.removeActorFromSubspaceAdminImplicitRole(
            roleSet,
            parentRoleSet,
            actorID
          );
        }
        if (roleType === RoleName.MEMBER) {
          const communication =
            await this.communityResolverService.getCommunicationForRoleSet(
              roleSet.id
            );
          // Remove from communication (works for any actor)
          await this.communityCommunicationService.removeMemberFromCommunication(
            communication,
            actorID
          );

          const space =
            await this.communityResolverService.getSpaceForRoleSetOrFail(
              roleSet.id
            );

          // Cascade: revoke all space credentials from descendant spaces (L1, L2, etc.)
          const descendantSpaceIDs =
            await this.spaceLookupService.getAllDescendantSpaceIDs(space.id);
          if (descendantSpaceIDs.length > 0) {
            await this.revokeSpaceTreeCredentials(actorID, descendantSpaceIDs);
          }

          // Clean up notifications for this space and all descendant spaces
          await this.inAppNotificationService.deleteAllForReceiverInSpace(
            actorID,
            space.id
          );
          if (descendantSpaceIDs.length > 0) {
            await this.inAppNotificationService.deleteAllForReceiverInSpaces(
              actorID,
              descendantSpaceIDs
            );
          }
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        if (roleType === RoleName.ADMIN || roleType === RoleName.OWNER) {
          await this.removeActorFromAccountAdminImplicitRole(roleSet, actorID);
        }

        // Clean up notifications only when user is completely removed (MEMBER role)
        // If only ADMIN or OWNER is removed, user still has access as MEMBER
        if (roleType === RoleName.MEMBER) {
          const adminCredential = await this.getCredentialDefinitionForRole(
            roleSet,
            RoleName.ADMIN
          );
          await this.inAppNotificationService.deleteAllForReceiverInOrganization(
            actorID,
            adminCredential.resourceID
          );
        }
        break;
      }
    }

    // 4. Clean cache
    await this.roleSetCacheService.cleanActorMembershipCache(
      actorID,
      roleSet.id
    );

    return actorID;
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

  private async validateActorPolicyLimits(
    roleSet: IRoleSet,
    roleType: RoleName,
    action: RoleSetUpdateType,
    actorType: ActorType
  ): Promise<void> {
    const actorCount = await this.countActorsWithRole(roleSet, roleType, [
      actorType,
    ]);

    const roleDefinition = await this.getRoleDefinition(roleSet, roleType);
    const policy = this.getPolicyForActorType(roleDefinition, actorType);

    if (action === RoleSetUpdateType.ASSIGN) {
      // -1 means unlimited; skip validation
      if (policy.maximum < 0) {
        return;
      }
      if (actorCount >= policy.maximum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Max limit of ${actorType}s reached for role '${roleType}': ${policy.maximum}, cannot assign new ${actorType}.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === RoleSetUpdateType.REMOVE) {
      // -1 means no minimum; skip validation
      if (policy.minimum < 0) {
        return;
      }
      if (actorCount <= policy.minimum) {
        throw new RoleSetPolicyRoleLimitsException(
          `Min limit of ${actorType}s reached for role '${roleType}': ${policy.minimum}, cannot remove ${actorType}.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private getPolicyForActorType(
    roleDefinition: IRole,
    actorType: ActorType
  ): IActorRolePolicy {
    switch (actorType) {
      case ActorType.USER:
        return roleDefinition.userPolicy;
      case ActorType.ORGANIZATION:
        return roleDefinition.organizationPolicy;
      case ActorType.VIRTUAL_CONTRIBUTOR:
        return roleDefinition.virtualContributorPolicy;
      default:
        throw new ValidationException(
          `Unknown actor type: ${actorType}`,
          LogContext.COMMUNITY
        );
    }
  }

  // Actor-based implicit role methods
  private async removeActorFromSubspaceAdminImplicitRole(
    roleSet: IRoleSet,
    parentRoleSet: IRoleSet,
    actorID: string
  ): Promise<void> {
    this.validateRoleSetType(roleSet, RoleSetType.SPACE);

    // Check if an admin anywhere else in the roleSet
    const peerRoleSets = await this.getPeerRoleSets(parentRoleSet, roleSet);
    const adminRoleChecks = await Promise.all(
      peerRoleSets.map(pc => this.isInRole(actorID, pc, RoleName.ADMIN))
    );
    const hasAnotherAdminRole = adminRoleChecks.some(hasRole => hasRole);

    if (!hasAnotherAdminRole) {
      const credential = await this.getCredentialSpaceImplicitRole(
        roleSet,
        AuthorizationCredential.SPACE_SUBSPACE_ADMIN
      );

      await this.actorService.revokeCredential(actorID, {
        type: credential.type,
        resourceID: credential.resourceID,
      });
    }
  }

  private async removeActorFromAccountAdminImplicitRole(
    roleSet: IRoleSet,
    actorID: string
  ): Promise<void> {
    this.validateRoleSetType(roleSet, RoleSetType.ORGANIZATION);
    // Only two roles, so check if the user has the other one
    const hasAdminRole = await this.isInRole(actorID, roleSet, RoleName.ADMIN);
    const hasOwnerRole = await this.isInRole(actorID, roleSet, RoleName.OWNER);

    if (!hasAdminRole && !hasOwnerRole) {
      const credential =
        await this.getCredentialForOrganizationImplicitRole(roleSet);

      await this.actorService.revokeCredential(actorID, {
        type: credential.type,
        resourceID: credential.resourceID,
      });
    }
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
      await this.organizationLookupService.getOrganizationByIdOrFail(
        organizationID
      );
    return {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: organization.accountID,
    };
  }

  public async removeCurrentActorFromRolesInRoleSet(
    roleSet: IRoleSet,
    actorContext: ActorContext
  ): Promise<void> {
    const userRoles = await this.getRolesForActorContext(actorContext, roleSet);
    for (const role of userRoles) {
      await this.removeActorFromRole(roleSet, role, actorContext.actorID);
    }
  }

  private async revokeSpaceTreeCredentials(
    actorID: string,
    descendantSpaceIDs: string[]
  ): Promise<void> {
    const spaceCredentialTypes = [
      AuthorizationCredential.SPACE_MEMBER,
      AuthorizationCredential.SPACE_ADMIN,
      AuthorizationCredential.SPACE_LEAD,
      AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
    ];

    for (const spaceID of descendantSpaceIDs) {
      for (const credentialType of spaceCredentialTypes) {
        await this.actorService.revokeCredential(actorID, {
          type: credentialType,
          resourceID: spaceID,
        });
      }

      // Invalidate the cached membership state on the descendant's role-set:
      // isMember() / membership-status reads are cache-first, so a stale entry
      // would keep reporting the revoked membership (e.g. blocking a later
      // re-application with ROLE_SET_ALREADY_MEMBER).
      const descendantSpace = await this.spaceLookupService.getSpaceOrFail(
        spaceID,
        { relations: { community: { roleSet: true } } }
      );
      const descendantRoleSetID = descendantSpace.community?.roleSet?.id;
      if (descendantRoleSetID) {
        await this.roleSetCacheService.cleanActorMembershipCache(
          actorID,
          descendantRoleSetID
        );
      }
    }
  }

  public async isMember(actorID: string, roleSet: IRoleSet): Promise<boolean> {
    const cached = await this.roleSetCacheService.getActorIsMemberFromCache(
      actorID,
      roleSet.id
    );
    if (cached) {
      return cached;
    }
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      RoleName.MEMBER
    );

    const validCredential = await this.actorService.hasValidCredential(
      actorID,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    await this.roleSetCacheService.setActorIsMemberCache(
      actorID,
      roleSet.id,
      validCredential
    );

    return validCredential;
  }

  public async isInRole(
    actorID: string,
    roleSet: IRoleSet,
    role: RoleName
  ): Promise<boolean> {
    const membershipCredential = await this.getCredentialDefinitionForRole(
      roleSet,
      role
    );

    const validCredential = await this.actorService.hasValidCredential(
      actorID,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async isInRoleImplicit(
    actorID: string,
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

    const validCredential = await this.actorService.hasValidCredential(
      actorID,
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
    const userId = applicationData.userID;
    // Verify the user exists (throws if not found) - applications are user-only
    await this.userLookupService.getUserByIdOrFail(userId);

    const roleSet = await this.getRoleSetOrFail(applicationData.roleSetID, {
      relations: {
        parentRoleSet: true,
      },
    });

    await this.validateApplicationFromActor(userId, roleSet);

    const application =
      await this.applicationService.createApplication(applicationData);
    application.roleSet = roleSet;

    const savedApplication = await this.applicationService.save(application);

    await this.roleSetCacheService.deleteMembershipStatusCache(
      userId,
      roleSet.id
    );

    return savedApplication;
  }

  async createInvitationExistingActor(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const actorID = invitationData.invitedActorID;
    // Verify the actor exists (throws if not found)
    await this.actorLookupService.getActorByIdOrFail(actorID);

    const roleSet = await this.getRoleSetOrFail(invitationData.roleSetID);

    await this.validateInvitationToExistingActor(actorID, roleSet);

    const invitation =
      await this.invitationService.createInvitation(invitationData);
    invitation.roleSet = roleSet;

    const result = await this.invitationService.save(invitation);
    // Ensure that the contributor has a credential for the invitation
    if (roleSet.type === RoleSetType.SPACE) {
      await this.assignSpaceInviteeCredential(actorID, roleSet);
    }

    await this.roleSetCacheService.deleteMembershipStatusCache(
      actorID,
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
    actorContext: ActorContext
  ): Promise<IPlatformInvitation> {
    const externalInvitationInput: CreatePlatformInvitationInput = {
      roleSetID: roleSet.id,
      welcomeMessage,
      email,
      roleSetInvitedToParent,
      roleSetExtraRoles: extraRoles,
      createdBy: actorContext.actorID,
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
    const roleNames = await this.getRoleNames(roleSet);
    const userRolesMap: { [userID: string]: RoleName[] } = {};

    for (const userID of userIDs) {
      const roles: RoleName[] = [];
      for (const roleName of roleNames) {
        if (await this.isInRole(userID, roleSet, roleName)) {
          roles.push(roleName);
        }
      }
      userRolesMap[userID] = roles;
    }

    return userRolesMap;
  }

  private async validateApplicationFromActor(
    actorID: string,
    roleSet: IRoleSet
  ) {
    const openApplication = await this.findOpenApplication(actorID, roleSet.id);
    if (openApplication) {
      throw new RoleSetMembershipException(
        `Application not possible: An open application already exists for actor ${actorID} on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS
      );
    }

    const openInvitation = await this.findOpenInvitation(actorID, roleSet.id);
    if (openInvitation) {
      throw new RoleSetMembershipException(
        `Application not possible: An open invitation already exists for actor ${actorID} on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ROLE_SET_OPEN_INVITATION_EXISTS
      );
    }

    // Check if the actor is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(actorID, roleSet);
    if (isExistingMember)
      throw new RoleSetMembershipException(
        `Application not possible: Actor ${actorID} is already a member of the RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ROLE_SET_ALREADY_MEMBER
      );
  }

  private async validateInvitationToExistingActor(
    actorID: string,
    roleSet: IRoleSet
  ) {
    const openInvitation = await this.findOpenInvitation(actorID, roleSet.id);
    if (openInvitation) {
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        actorID,
        roleSet.id
      );
      throw new RoleSetMembershipException(
        `Invitation not possible: An open invitation already exists for actor ${actorID} on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ROLE_SET_OPEN_INVITATION_EXISTS
      );
    }

    const openApplication = await this.findOpenApplication(actorID, roleSet.id);
    if (openApplication) {
      throw new RoleSetMembershipException(
        `Invitation not possible: An open application already exists for actor ${actorID} on RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ROLE_SET_OPEN_APPLICATION_EXISTS
      );
    }

    const isExistingMember = await this.isMember(actorID, roleSet);
    if (isExistingMember)
      throw new RoleSetMembershipException(
        `Invitation not possible: Actor ${actorID} is already a member of the RoleSet: ${roleSet.id}.`,
        LogContext.COMMUNITY,
        AlkemioErrorStatus.ROLE_SET_ALREADY_MEMBER
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
      await this.actorService.countActorsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });

    return credentialMatches;
  }

  async getImplicitRoles(
    actorContext: ActorContext,
    roleSet: IRoleSet
  ): Promise<RoleSetRoleImplicit[]> {
    const result: RoleSetRoleImplicit[] = [];
    const actor = await this.actorService.getActorOrFail(actorContext.actorID);

    const rolesImplicit: RoleSetRoleImplicit[] = Object.values(
      RoleSetRoleImplicit
    ) as RoleSetRoleImplicit[];
    for (const role of rolesImplicit) {
      const hasActorRole = await this.isInRoleImplicit(actor.id, roleSet, role);
      if (hasActorRole) {
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
      relations: {
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
    // TypeORM does not support removing relations as far as I can tell, so do it manually
    await this.roleSetRepository.query(
      `UPDATE role_set SET "parentRoleSetId" = NULL WHERE id = '${roleSetID}'`
    );

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
    actorContext: ActorContext
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

    // Route through the shared grant service (feature 017 — FR-017). For a
    // combined Subspace application the applicant is granted MEMBER on the
    // target AND every missing public ancestor, atomically (FR-020). The
    // combined-flow authorisation is re-evaluated here at approval time
    // (FR-015); if it no longer holds the ancestor grants are withheld and the
    // target grant follows today's rules.
    await this.ensureMemberOfRoleSetAndAncestors(
      roleSet,
      userID,
      actorContext,
      {
        source: 'application',
      }
    );
  }

  /**
   * Shared membership grant for the application-approval and invitation-accept
   * flows (feature 017 — FR-017, single owner of the ancestor-chain grant so
   * there is no duplicated grant logic, SC-007).
   *
   * When granting the ancestor chain: walks `parentRoleSet` from the target up
   * to the L0 root, then grants `RoleName.MEMBER` on every role-set the actor is
   * NOT already a member of, TOP-DOWN (root first) so the "must be member of the
   * immediate parent" invariant holds at each step. All credential writes run in
   * a SINGLE transaction (FR-020, all-or-nothing); event/notification/Matrix and
   * cache side-effects are sequenced AFTER a successful commit (R6/R7).
   *
   * Ancestor granting is authorised by:
   * - application: re-evaluating the combined-flow authorisation NOW (FR-015) —
   *   the whole chain still PUBLIC and the ancestor Spaces' setting still enabled;
   * - invitation: the invitation's `invitedToParent` flag (existing invite
   *   privilege already checked when the invitation was created).
   * When ancestor granting is NOT authorised the target is granted via the
   * standard {@link assignActorToRole} (today's single-hop rules, incl. its
   * parent-membership precondition) — behaviour-preserving for invitations
   * (FR-018/SC-008).
   */
  public async ensureMemberOfRoleSetAndAncestors(
    targetRoleSet: IRoleSet,
    actorID: string,
    actorContext: ActorContext,
    opts: EnsureMemberOfRoleSetAndAncestorsOptions
  ): Promise<void> {
    const actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(actorID);

    const grantAncestors =
      opts.source === 'application'
        ? await this.isCombinedApplicationGrantAuthorised(
            targetRoleSet,
            actorID
          )
        : opts.invitedToParent === true;

    if (grantAncestors) {
      // Build the chain root -> target (top-down) and grant MEMBER on every
      // missing role-set atomically.
      const chain = await this.getRoleSetAncestorChain(targetRoleSet);
      const toGrant: IRoleSet[] = [];
      for (const roleSetInChain of chain) {
        const alreadyMember = await this.isMember(actorID, roleSetInChain);
        if (!alreadyMember) {
          toGrant.push(roleSetInChain);
        }
      }

      if (toGrant.length > 0) {
        // ATOMIC (FR-020): if any grant fails the whole chain rolls back and no
        // partial ancestry is persisted. The transactional EntityManager is
        // threaded down to the credential write so the rollback is real.
        await this.roleSetRepository.manager.transaction(async manager => {
          for (const roleSetToGrant of toGrant) {
            await this.grantRoleCredential(
              roleSetToGrant,
              RoleName.MEMBER,
              actorID,
              actorType,
              manager
            );
          }
        });

        // POST-COMMIT (outside the transaction): membership events /
        // notifications / Matrix room membership / caches, one dispatch per
        // Space joined (FR-021 — parity with the invitation path).
        for (const grantedRoleSet of toGrant) {
          await this.applyMemberGrantSideEffects(
            grantedRoleSet,
            actorID,
            actorType,
            actorContext,
            true
          );
        }
      }
    } else {
      // Not authorised to grant the ancestor chain — grant only the target via
      // the standard path (enforces the parent-membership precondition; today's
      // behaviour). For an application this is the FR-015 safe fallback.
      await this.assignActorToRole(
        targetRoleSet,
        RoleName.MEMBER,
        actorID,
        actorContext,
        true
      );
    }

    // Invitation-only post-steps (behaviour-preserving; outside the transaction
    // exactly as today — best-effort, non-atomic).
    if (
      opts.removeSpaceInviteeCredential &&
      targetRoleSet.type === RoleSetType.SPACE
    ) {
      await this.removeSpaceInviteeCredential(actorID, targetRoleSet);
    }
    for (const extraRole of opts.extraRoles ?? []) {
      try {
        await this.assignActorToRole(
          targetRoleSet,
          extraRole,
          actorID,
          actorContext,
          false
        );
      } catch (e: any) {
        // Do not throw further as there might not be entitlements to grant the
        // extra role (behaviour-preserving with the previous invitation flow).
        this.logger.warn?.(
          `Unable to add actor (${actorID}) to extra roles (${opts.extraRoles}) in community: ${e}`,
          LogContext.COMMUNITY
        );
      }
    }

    // Source-specific cache tail (mirrors the original callers).
    if (opts.source === 'application') {
      await this.roleSetCacheService.deleteOpenApplicationFromCache(
        actorID,
        targetRoleSet.id
      );
    } else {
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        actorID,
        targetRoleSet.id
      );
    }
  }

  /**
   * Walk `parentRoleSet` from the supplied role-set up to the L0 root and return
   * the chain TOP-DOWN (root first ... target last). Single-hop `getParentRoleSet`
   * is looped (typ. depth <= 3). Guards against cycles.
   */
  public async getRoleSetAncestorChain(roleSet: IRoleSet): Promise<IRoleSet[]> {
    const chain: IRoleSet[] = [roleSet];
    const seen = new Set<string>([roleSet.id]);
    let current: IRoleSet | undefined = roleSet;
    while (current) {
      const parent = await this.getParentRoleSet(current);
      if (!parent || seen.has(parent.id)) {
        break;
      }
      chain.push(parent);
      seen.add(parent.id);
      current = parent;
    }
    return chain.reverse();
  }

  /**
   * Re-evaluates (FR-015) whether the combined Subspace-application flow is
   * authorised to grant the ancestor chain for the supplied target role-set.
   *
   * Reachability is ACTOR-RELATIVE (explicit scope decision, 2026-07-07 — see
   * ADR 0001): when `actorID` is supplied, ancestors the actor already belongs
   * to impose NO requirements — they are skipped by the missing-only grant
   * anyway. Every ancestor the actor would actually be GRANTED into must be
   * PUBLIC (FR-002) and have `allowSubspaceAdminsToInviteMembers` enabled
   * (FR-003). The target's own privacy is never part of the gate — a Space
   * with an application membership policy accepts applications regardless of
   * its privacy mode. Without `actorID` the check degrades to the generic
   * non-member reading (every ancestor public + opted in). An L0 Space (no
   * parent) is not part of the combined flow.
   *
   * The client-facing APPLY privilege exposure is driven by
   * {@link getCombinedApplicationEligibleCriteria}, the credential-rule
   * counterpart of this predicate, so the offered entry point and the actual
   * grant stay consistent (contract §1/§2).
   */
  public async isCombinedApplicationGrantAuthorised(
    targetRoleSet: IRoleSet,
    actorID?: string
  ): Promise<boolean> {
    if (targetRoleSet.type !== RoleSetType.SPACE) {
      return false;
    }
    const chain = await this.getRoleSetAncestorChain(targetRoleSet);
    const ancestors = chain.slice(0, -1); // root .. parent (excludes target)
    if (ancestors.length === 0) {
      return false; // L0 Space — no combined flow
    }
    for (const ancestorRoleSet of ancestors) {
      // Actor-relative reachability: an ancestor the actor already belongs to
      // is not granted (missing-only) and imposes no requirements.
      if (actorID && (await this.isMember(actorID, ancestorRoleSet))) {
        continue;
      }
      // Every ancestor the actor would be granted into must be reachable
      // (public) and must have opted in to admitting members via a descendant
      // application.
      const settings = await this.getSpaceSettingsForRoleSet(ancestorRoleSet);
      if (!settings || settings.privacy.mode !== SpacePrivacyMode.PUBLIC) {
        return false;
      }
      if (!settings.membership.allowSubspaceAdminsToInviteMembers) {
        return false;
      }
    }
    return true;
  }

  /**
   * Credential-rule counterpart of {@link isCombinedApplicationGrantAuthorised}
   * for the authorization-policy APPLY exposure (contract §1). Authorization
   * policies are static credential rules, so actor-relative reachability is
   * expressed via the platform invariant `member(Space) ⇒ member(parent)`
   * (upheld by assignActorToRole, the shared top-down grant, and the removal
   * cascade): being a member of the DEEPEST PRIVATE ancestor implies membership
   * of every ancestor above it, so that single membership credential identifies
   * exactly the population for which every non-owned ancestor is public.
   *
   * Returns the criteria for who may be offered APPLY on the target:
   * - `{ kind: 'globalRegistered' }` — no private ancestor; every ancestor is
   *   public + opted in (the generic non-member cell).
   * - `{ kind: 'credential', credential }` — the MEMBER credential of the
   *   deepest private ancestor; every ancestor BELOW it is public + opted in.
   *   (Ancestors at/above the deepest private ancestor are owned by that
   *   population by the invariant, so they impose no requirements.)
   * - `undefined` — no eligible non-parent-member population (some ancestor
   *   that would need granting is private or not opted in, the deepest private
   *   ancestor IS the direct parent — that population is already covered by the
   *   parent-member APPLY rule — or the target is an L0 Space / non-Space).
   */
  public async getCombinedApplicationEligibleCriteria(
    targetRoleSet: IRoleSet
  ): Promise<
    | { kind: 'globalRegistered' }
    | { kind: 'credential'; credential: ICredentialDefinition }
    | undefined
  > {
    if (targetRoleSet.type !== RoleSetType.SPACE) {
      return undefined;
    }
    const chain = await this.getRoleSetAncestorChain(targetRoleSet);
    const ancestors = chain.slice(0, -1); // root .. parent (top-down)
    if (ancestors.length === 0) {
      return undefined; // L0 Space — no combined flow
    }

    const ancestorSettings = await Promise.all(
      ancestors.map(a => this.getSpaceSettingsForRoleSet(a))
    );
    let deepestPrivateIndex = -1;
    for (let i = 0; i < ancestors.length; i++) {
      if (ancestorSettings[i]?.privacy.mode !== SpacePrivacyMode.PUBLIC) {
        deepestPrivateIndex = i;
      }
    }

    // Every ancestor BELOW the deepest private one would be granted to this
    // population, so it must be public (guaranteed by deepest-private choice)
    // and opted in via the setting.
    for (let i = deepestPrivateIndex + 1; i < ancestors.length; i++) {
      if (!ancestorSettings[i]?.membership.allowSubspaceAdminsToInviteMembers) {
        return undefined;
      }
    }

    if (deepestPrivateIndex === -1) {
      return { kind: 'globalRegistered' };
    }
    if (deepestPrivateIndex === ancestors.length - 1) {
      // Deepest private ancestor is the direct parent — parent members are
      // already offered APPLY by the parent-member rule; nothing to add.
      return undefined;
    }
    const credential = await this.getCredentialDefinitionForRole(
      ancestors[deepestPrivateIndex],
      RoleName.MEMBER
    );
    return { kind: 'credential', credential };
  }

  private async getSpaceSettingsForRoleSet(
    roleSet: IRoleSet
  ): Promise<ISpaceSettings | undefined> {
    if (roleSet.type !== RoleSetType.SPACE) {
      return undefined;
    }
    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      roleSet.id
    );
    return space.settings;
  }

  /**
   * The post-commit side-effects of a MEMBER grant, factored out so the shared
   * ancestor-chain grant reproduces exactly what {@link assignActorToRole} emits
   * (cache clears + community events/notifications/Matrix membership), one
   * dispatch per Space joined (FR-021). Ancestor grants are always MEMBER, so the
   * ADMIN-only implicit-role branch of assignActorToRole never applies here.
   */
  private async applyMemberGrantSideEffects(
    roleSet: IRoleSet,
    actorID: string,
    actorType: ActorType,
    actorContext: ActorContext,
    triggerNewMemberEvents: boolean
  ): Promise<void> {
    await this.roleSetCacheService.deleteOpenApplicationFromCache(
      actorID,
      roleSet.id
    );
    await this.roleSetCacheService.deleteOpenInvitationFromCache(
      actorID,
      roleSet.id
    );

    await this.actorAddedToRole(
      actorID,
      actorType,
      roleSet,
      RoleName.MEMBER,
      actorContext,
      triggerNewMemberEvents
    );

    if (
      actorType === ActorType.VIRTUAL_CONTRIBUTOR &&
      roleSet.type === RoleSetType.SPACE
    ) {
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(
          roleSet.id
        );
      void this.aiServerAdapter.ensureContextIsLoaded(space.id);
    }
  }

  public async isEntryRole(
    roleSet: IRoleSet,
    roleType: RoleName
  ): Promise<boolean> {
    const isEntryRole = roleSet.entryRoleName === roleType;
    return isEntryRole;
  }

  /**
   * Batch-counts members for multiple roleSets in a single DB query.
   * Returns a Map from roleSet.id to member count.
   * Requires roleSet.roles to be pre-loaded.
   */
  async getMembersCountBatch(
    roleSets: IRoleSet[]
  ): Promise<Map<string, number>> {
    if (roleSets.length === 0) {
      return new Map();
    }

    // Build credential criteria for each roleSet
    const criteriaList: {
      roleSetId: string;
      type: string;
      resourceID: string;
    }[] = [];
    for (const roleSet of roleSets) {
      const credential = this.getCredentialForRoleSync(
        roleSet,
        RoleName.MEMBER
      );
      if (credential) {
        criteriaList.push({
          roleSetId: roleSet.id,
          type: credential.type,
          resourceID: credential.resourceID,
        });
      }
    }

    if (criteriaList.length === 0) {
      return new Map();
    }

    // Batch count credentials
    const countsByResourceID =
      await this.actorService.countActorsWithMatchingCredentialsBatch(
        criteriaList.map(c => ({ type: c.type, resourceID: c.resourceID }))
      );

    // Map back to roleSet.id
    const result = new Map<string, number>();
    for (const criteria of criteriaList) {
      result.set(
        criteria.roleSetId,
        countsByResourceID.get(criteria.resourceID) ?? 0
      );
    }
    return result;
  }

  /**
   * Synchronous version of getCredentialForRole that works when roles are pre-loaded.
   * Returns null if roles are not loaded.
   */
  private getCredentialForRoleSync(
    roleSet: IRoleSet,
    roleName: RoleName
  ): ICredentialDefinition | null {
    if (!roleSet.roles) return null;
    const role = roleSet.roles.find(rd => rd.name === roleName);
    if (!role) return null;
    return role.credential;
  }
}
