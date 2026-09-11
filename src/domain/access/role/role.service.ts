import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CreateRoleInput } from './dto/role.dto.create';
import { Role } from './role.entity';
import { IRole } from './role.interface';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createRole(roleData: CreateRoleInput): IRole {
    const role = Role.create(roleData);
    // Deep-copy every embedded object rather than aliasing the caller's.
    // Role definitions are supplied as module-level constants
    // (organizationRoleDefinitions, spaceCommunityRoles, subspaceCommunityRoles),
    // so a shared reference here is shared by every concurrent creation — and
    // updateRoleResourceID() then mutates credential.resourceID in place. Two
    // organizations created at the same time ended up with each other's
    // organization-admin resourceID, which mis-issues admin credentials and
    // leaves the organization undeletable. Copying at this single seam fixes
    // every caller at once.
    role.credential = structuredClone(roleData.credentialData);
    role.parentCredentials = structuredClone(roleData.parentCredentialsData);
    role.userPolicy = structuredClone(roleData.userPolicyData);
    role.organizationPolicy = structuredClone(roleData.organizationPolicyData);
    role.virtualContributorPolicy = structuredClone(
      roleData.virtualContributorPolicyData
    );
    return role;
  }

  public async removeRole(role: IRole): Promise<boolean> {
    await this.roleRepository.remove(role as Role);
    return true;
  }

  public getCredentialsForRoleWithParents(
    role: IRole
  ): ICredentialDefinition[] {
    const parentCredentials = role.parentCredentials;
    return parentCredentials.concat(role.credential);
  }
}
