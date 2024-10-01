import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { IRole } from './role.interface';
import { CreateRoleInput } from './dto/role.dto.create';
import { IContributorRolePolicy } from './contributor.role.policy.interface';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createRole(roleData: CreateRoleInput): IRole {
    const role = Role.create(roleData);
    role.credential = JSON.stringify(roleData.credentialData);
    role.parentCredentials = JSON.stringify(roleData.parentCredentialsData);
    role.userPolicy = JSON.stringify(roleData.userPolicyData);
    role.organizationPolicy = JSON.stringify(roleData.organizationPolicyData);
    role.virtualContributorPolicy = JSON.stringify(
      roleData.virtualContributorPolicyData
    );
    return role;
  }

  public async removeRole(role: IRole): Promise<boolean> {
    await this.roleRepository.remove(role as Role);
    return true;
  }

  public getParentCredentialsForRole(role: IRole): ICredentialDefinition[] {
    const parentCredentials: ICredentialDefinition[] = JSON.parse(
      role.parentCredentials
    );
    return parentCredentials;
  }

  public getCredentialsForRoleWithParents(
    role: IRole
  ): ICredentialDefinition[] {
    const result = this.getCredentialsForRole(role);
    return result.concat(this.getParentCredentialsForRole(role));
  }

  public getCredentialsForRole(role: IRole): ICredentialDefinition[] {
    const result = [this.getCredentialForRole(role)];
    return result;
  }

  public getCredentialForRole(role: IRole): ICredentialDefinition {
    const result: ICredentialDefinition = JSON.parse(role.credential);
    return result;
  }

  public convertCredentialToString(credential: ICredentialDefinition): string {
    return JSON.stringify(credential);
  }

  public convertParentCredentialsToString(
    parentCredentials: ICredentialDefinition[]
  ): string {
    return JSON.stringify(parentCredentials);
  }

  public getUserPolicy(role: IRole): IContributorRolePolicy {
    const result: IContributorRolePolicy = JSON.parse(role.userPolicy);
    return result;
  }

  public getOrganizationPolicy(role: IRole): IContributorRolePolicy {
    const result: IContributorRolePolicy = JSON.parse(role.organizationPolicy);
    return result;
  }

  public getVirtualContributorPolicy(role: IRole): IContributorRolePolicy {
    const result: IContributorRolePolicy = JSON.parse(
      role.virtualContributorPolicy
    );
    return result;
  }

  public save(role: IRole): Promise<IRole> {
    return this.roleRepository.save(role);
  }
}
