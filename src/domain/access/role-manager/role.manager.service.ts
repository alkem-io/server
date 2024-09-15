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
import { CreateRoleManagerInput } from './dto/role.manager.dto.create';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ApplicationService } from '@domain/community/application/application.service';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { RoleManager } from './role.manager.entity';
import { IRoleManager } from './role.manager.interface';
import { RoleService } from '../role/role.service';
import { CommunityRoleType } from '@common/enums/community.role';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IRole } from '../role/role.interface';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@Injectable()
export class RoleManagerService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private formService: FormService,
    private roleService: RoleService,
    @InjectRepository(RoleManager)
    private roleManagerRepository: Repository<RoleManager>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createRoleManager(
    roleManagerData: CreateRoleManagerInput
  ): Promise<IRoleManager> {
    const roleManager: IRoleManager = new RoleManager();
    roleManager.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ROLE_MANAGER
    );
    roleManager.roles = [];
    roleManager.applications = [];
    roleManager.invitations = [];
    roleManager.platformInvitations = [];

    roleManager.parentRoleManager = roleManagerData.parentRoleManager;

    for (const roleData of roleManagerData.roles) {
      const role = this.roleService.createRole(roleData);
      roleManager.roles.push(role);
    }

    roleManager.applicationForm = this.formService.createForm(
      roleManagerData.applicationForm
    );

    return roleManager;
  }

  async getRoleManagerOrFail(
    roleManagerID: string,
    options?: FindOneOptions<RoleManager>
  ): Promise<IRoleManager | never> {
    const roleManager = await this.roleManagerRepository.findOne({
      where: { id: roleManagerID },
      ...options,
    });
    if (!roleManager)
      throw new EntityNotFoundException(
        `Unable to find RoleManager with ID: ${roleManagerID}`,
        LogContext.COMMUNITY
      );
    return roleManager;
  }

  async removeRoleManager(roleManagerID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const roleManager = await this.getRoleManagerOrFail(roleManagerID, {
      relations: {
        roles: true,
        applications: true,
        invitations: true,
        platformInvitations: true,
        applicationForm: true,
      },
    });
    if (
      !roleManager.roles ||
      !roleManager.applications ||
      !roleManager.invitations ||
      !roleManager.platformInvitations ||
      !roleManager.applicationForm
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for roleManager for deletion: ${roleManager.id} `,
        LogContext.COMMUNITY
      );
    }

    for (const role of roleManager.roles) {
      await this.roleService.removeRole(role);
    }

    if (roleManager.authorization)
      await this.authorizationPolicyService.delete(roleManager.authorization);

    // Remove all applications
    for (const application of roleManager.applications) {
      await this.applicationService.deleteApplication({
        ID: application.id,
      });
    }

    // Remove all invitations
    for (const invitation of roleManager.invitations) {
      await this.invitationService.deleteInvitation({
        ID: invitation.id,
      });
    }

    for (const externalInvitation of roleManager.platformInvitations) {
      await this.platformInvitationService.deletePlatformInvitation({
        ID: externalInvitation.id,
      });
    }

    await this.formService.removeForm(roleManager.applicationForm);

    await this.roleManagerRepository.remove(roleManager as RoleManager);
    return true;
  }

  async save(roleManager: IRoleManager): Promise<IRoleManager> {
    return await this.roleManagerRepository.save(roleManager);
  }

  async getParentRoleManager(
    roleManager: IRoleManager
  ): Promise<IRoleManager | undefined> {
    const roleManagerWithParent = await this.getRoleManagerOrFail(
      roleManager.id,
      {
        relations: { parentRoleManager: true },
      }
    );

    const parentRoleManager = roleManagerWithParent?.parentRoleManager;
    if (parentRoleManager) {
      return await this.getRoleManagerOrFail(parentRoleManager.id);
    }
    return undefined;
  }

  async updateApplicationForm(
    roleManager: IRoleManager,
    formData: UpdateFormInput
  ): Promise<IRoleManager> {
    const applicationForm = await this.getApplicationForm(roleManager);
    roleManager.applicationForm = await this.formService.updateForm(
      applicationForm,
      formData
    );
    return await this.save(roleManager);
  }

  async getApplicationForm(roleManager: IRoleManager): Promise<IForm> {
    const roleManagerForm = await this.getRoleManagerOrFail(roleManager.id, {
      relations: { applicationForm: true },
    });
    const applicationForm = roleManagerForm.applicationForm;
    if (!applicationForm) {
      throw new EntityNotFoundException(
        `Unable to find Application Form for RoleManager with ID: ${roleManager.id}`,
        LogContext.COMMUNITY
      );
    }
    return applicationForm;
  }

  // Update the Community policy to have the right resource ID
  public updateRoleResourceID(
    roleManager: IRoleManager,
    resourceID: string
  ): IRoleManager {
    const roleDefinitions = this.getRoleDefinitions(roleManager);
    for (const roleDefinition of roleDefinitions) {
      const credential = this.roleService.getCredentialForRole(roleDefinition);
      credential.resourceID = resourceID;
    }

    return roleManager;
  }

  public async getPeerRoleManagers(
    parentRoleManager: IRoleManager,
    childRoleManager: IRoleManager
  ): Promise<IRoleManager[]> {
    const peerRoleManagers: IRoleManager[] =
      await this.roleManagerRepository.find({
        where: {
          parentRoleManager: {
            id: parentRoleManager.id,
          },
        },
      });
    const result: IRoleManager[] = [];
    for (const roleManager of peerRoleManagers) {
      if (roleManager && !(roleManager.id === childRoleManager.id)) {
        result.push(roleManager);
      }
    }
    return result;
  }

  public inheritParentCredentials(roleManager: IRoleManager): IRoleManager {
    const roleManagerParent = roleManager.parentRoleManager;
    if (!roleManagerParent) {
      throw new RelationshipNotFoundException(
        `Unable to inherit parent credentials for role Manager ${roleManager.id}`,
        LogContext.ROLES
      );
    }
    const roleDefinitions = this.getRoleDefinitions(roleManager);

    for (const roleDefinition of roleDefinitions) {
      const parentRoleDefinition = this.getRoleDefinition(
        roleManagerParent,
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

    return roleManager;
  }

  getDirectParentCredentialForRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType
  ): ICredentialDefinition | undefined {
    const parentCredentials = this.getParentCredentialsForRole(
      roleManager,
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
    roleManager: IRoleManager,
    roleType: CommunityRoleType
  ): ICredentialDefinition[] {
    const roleDefinition = this.getRoleDefinition(roleManager, roleType);
    return this.roleService.getParentCredentialsForRole(roleDefinition);
  }

  public getCredentialsForRoleWithParents(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    spaceSettings: ISpaceSettings
  ): ICredentialDefinition[] {
    const result = this.getCredentialsForRole(
      roleManager,
      roleType,
      spaceSettings
    );
    return result.concat(
      this.getParentCredentialsForRole(roleManager, roleType)
    );
  }

  public getCredentialsForRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    spaceSettings: ISpaceSettings // TODO: would like not to have this here; for later
  ): ICredentialDefinition[] {
    const result = [this.getCredentialForRole(roleManager, roleType)];
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
    roleManager: IRoleManager,
    roleType: CommunityRoleType
  ): ICredentialDefinition {
    const roleDefinition = this.getRoleDefinition(roleManager, roleType);
    return this.roleService.getCredentialForRole(roleDefinition);
  }

  public getRoleDefinitions(roleManager: IRoleManager): IRole[] {
    const roleDefinitions = roleManager.roles;
    if (!roleDefinitions) {
      throw new RelationshipNotFoundException(
        `Unable to load roles for RoleManager: ${roleManager.id}`,
        LogContext.COMMUNITY
      );
    }
    return roleDefinitions;
  }

  public getRoleDefinition(
    roleManager: IRoleManager,
    roleType: CommunityRoleType
  ): IRole {
    const roleDefinitions = this.getRoleDefinitions(roleManager);
    const role = roleDefinitions.find(rd => rd.type === roleType);
    if (!role) {
      throw new RelationshipNotFoundException(
        `Unable to find Role for type ${roleType} for RoleManager: ${roleManager.id}`,
        LogContext.COMMUNITY
      );
    }
    return role;
  }
}
