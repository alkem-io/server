import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
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
import { CommunityRoleType } from '@common/enums/community.role';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IRole } from '../role/role.interface';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@Injectable()
export class RoleSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private formService: FormService,
    private roleService: RoleService,
    @InjectRepository(RoleSet)
    private roleSetRepository: Repository<RoleSet>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoleSet(roleSetData: CreateRoleSetInput): Promise<IRoleSet> {
    const roleSet: IRoleSet = new RoleSet();
    roleSet.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ROLE_MANAGER
    );
    roleSet.roles = [];
    roleSet.applications = [];
    roleSet.invitations = [];
    roleSet.platformInvitations = [];

    roleSet.parentRoleSet = roleSetData.parentRoleSet;

    for (const roleData of roleSetData.roles) {
      const role = this.roleService.createRole(roleData);
      roleSet.roles.push(role);
    }

    roleSet.applicationForm = this.formService.createForm(
      roleSetData.applicationForm
    );

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
      },
    });
    if (
      !roleSet.roles ||
      !roleSet.applications ||
      !roleSet.invitations ||
      !roleSet.platformInvitations ||
      !roleSet.applicationForm
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

  // Update the Community policy to have the right resource ID
  public updateRoleResourceID(roleSet: IRoleSet, resourceID: string): IRoleSet {
    const roleDefinitions = this.getRoleDefinitions(roleSet);
    for (const roleDefinition of roleDefinitions) {
      const credential = this.roleService.getCredentialForRole(roleDefinition);
      credential.resourceID = resourceID;
    }

    return roleSet;
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

  public inheritParentCredentials(roleSet: IRoleSet): IRoleSet {
    const roleSetParent = roleSet.parentRoleSet;
    if (!roleSetParent) {
      throw new RelationshipNotFoundException(
        `Unable to inherit parent credentials for role Manager ${roleSet.id}`,
        LogContext.ROLES
      );
    }
    const roleDefinitions = this.getRoleDefinitions(roleSet);

    for (const roleDefinition of roleDefinitions) {
      const parentRoleDefinition = this.getRoleDefinition(
        roleSetParent,
        roleDefinition.type
      );
      const parentCredentials: ICredentialDefinition[] = [];
      const parentDirectCredential =
        this.roleService.getCredentialForRole(parentRoleDefinition);
      const parentParentCredentials =
        this.roleService.getParentCredentialsForRole(parentRoleDefinition);

      parentCredentials.push(parentDirectCredential);
      parentParentCredentials.forEach(c => parentCredentials?.push(c));

      roleDefinition.parentCredentials = JSON.stringify(parentCredentials);
    }

    return roleSet;
  }

  getDirectParentCredentialForRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): ICredentialDefinition | undefined {
    const parentCredentials = this.getParentCredentialsForRole(
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

  public getParentCredentialsForRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): ICredentialDefinition[] {
    const roleDefinition = this.getRoleDefinition(roleSet, roleType);
    return this.roleService.getParentCredentialsForRole(roleDefinition);
  }

  public getCredentialsForRoleWithParents(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    spaceSettings: ISpaceSettings
  ): ICredentialDefinition[] {
    const result = this.getCredentialsForRole(roleSet, roleType, spaceSettings);
    return result.concat(this.getParentCredentialsForRole(roleSet, roleType));
  }

  public getCredentialsForRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType,
    spaceSettings: ISpaceSettings // TODO: would like not to have this here; for later
  ): ICredentialDefinition[] {
    const result = [this.getCredentialForRole(roleSet, roleType)];
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

  public getCredentialForRole(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): ICredentialDefinition {
    const roleDefinition = this.getRoleDefinition(roleSet, roleType);
    return this.roleService.getCredentialForRole(roleDefinition);
  }

  public getRoleDefinitions(roleSet: IRoleSet): IRole[] {
    const roleDefinitions = roleSet.roles;
    if (!roleDefinitions) {
      throw new RelationshipNotFoundException(
        `Unable to load roles for RoleSet: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return roleDefinitions;
  }

  public getRoleDefinition(
    roleSet: IRoleSet,
    roleType: CommunityRoleType
  ): IRole {
    const roleDefinitions = this.getRoleDefinitions(roleSet);
    const role = roleDefinitions.find(rd => rd.type === roleType);
    if (!role) {
      throw new RelationshipNotFoundException(
        `Unable to find Role for type ${roleType} for RoleSet: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return role;
  }
}
