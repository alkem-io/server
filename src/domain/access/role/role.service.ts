import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateRoleInput } from './dto/role.dto.create';
import { Role } from './role.entity';
import { IRole } from './role.interface';
import { roles } from './role.schema';

@Injectable()
export class RoleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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
    await this.db.delete(roles).where(eq(roles.id, role.id));
    return true;
  }

  public getCredentialsForRoleWithParents(
    role: IRole
  ): ICredentialDefinition[] {
    const parentCredentials = role.parentCredentials;
    return parentCredentials.concat(role.credential);
  }
}
