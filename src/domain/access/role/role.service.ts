import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { IRole } from './role.interface';
import { CreateRoleInput } from './dto/role.dto.create';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createRole(roleData: CreateRoleInput): IRole {
    const role = Role.create(roleData);
    role.credential = roleData.credentialData;
    role.parentCredentials = roleData.parentCredentialsData;
    role.userPolicy = roleData.userPolicyData;
    role.organizationPolicy = roleData.organizationPolicyData;
    role.virtualContributorPolicy = roleData.virtualContributorPolicyData;
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
