import { CommunityRoleType } from '@common/enums/community.role';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CommunityPolicy } from './community.policy.entity';
import { ICommunityPolicy } from './community.policy.interface';
import { ICommunityRolePolicy } from './community.policy.role.interface';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

@Injectable()
export class CommunityPolicyService {
  constructor(
    @InjectRepository(CommunityPolicy)
    private communityPolicyRepository: Repository<CommunityPolicy>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createCommunityPolicy(
    member: ICommunityRolePolicy,
    lead: ICommunityRolePolicy,
    admin: ICommunityRolePolicy
  ): ICommunityPolicy {
    return new CommunityPolicy(
      this.serializeRolePolicy(member),
      this.serializeRolePolicy(lead),
      this.serializeRolePolicy(admin)
    );
  }

  public async removeCommunityPolicy(
    communityPolicy: ICommunityPolicy
  ): Promise<boolean> {
    await this.communityPolicyRepository.remove(
      communityPolicy as CommunityPolicy
    );
    return true;
  }

  public getCommunityRolePolicy(
    policy: ICommunityPolicy,
    role: CommunityRoleType
  ): ICommunityRolePolicy {
    switch (role) {
      case CommunityRoleType.MEMBER:
        return this.deserializeRolePolicy(policy.member);
      case CommunityRoleType.LEAD:
        return this.deserializeRolePolicy(policy.lead);
      case CommunityRoleType.ADMIN:
        return this.deserializeRolePolicy(policy.admin);
      default:
        throw new EntityNotInitializedException(
          `Unable to locate role '${role}' for community policy: ${policy.id}`,
          LogContext.COMMUNITY
        );
    }
  }

  getDirectParentCredentialForRole(
    policy: ICommunityPolicy,
    role: CommunityRoleType
  ): ICredentialDefinition | undefined {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);

    // First entry is the immediate parent
    if (rolePolicy.parentCredentials.length === 0) {
      return undefined;
    }
    const parentCommunityCredential = rolePolicy.parentCredentials[0];
    return parentCommunityCredential;
  }

  public getParentCredentialsForRole(
    policy: ICommunityPolicy,
    role: CommunityRoleType
  ): ICredentialDefinition[] {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);

    return rolePolicy.parentCredentials;
  }

  public getCredentialsForRoleWithParents(
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    role: CommunityRoleType
  ): ICredentialDefinition[] {
    const result = this.getCredentialsForRole(policy, spaceSettings, role);
    return result.concat(this.getParentCredentialsForRole(policy, role));
  }

  public getCredentialsForRole(
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    role: CommunityRoleType
  ): ICredentialDefinition[] {
    const result = [this.getCredentialForRole(policy, role)];
    if (
      role === CommunityRoleType.ADMIN &&
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
    policy: ICommunityPolicy,
    role: CommunityRoleType
  ): ICredentialDefinition {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);
    return rolePolicy.credential;
  }

  // Update the Community policy to have the right resource ID
  public updateCommunityPolicyResourceID(
    communityPolicy: ICommunityPolicy,
    resourceID: string
  ): ICommunityPolicy {
    const memberPolicy = this.deserializeRolePolicy(communityPolicy.member);
    memberPolicy.credential.resourceID = resourceID;
    communityPolicy.member = this.serializeRolePolicy(memberPolicy);

    const leadPolicy = this.deserializeRolePolicy(communityPolicy.lead);
    leadPolicy.credential.resourceID = resourceID;
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);

    const adminPolicy = this.deserializeRolePolicy(communityPolicy.admin);
    adminPolicy.credential.resourceID = resourceID;
    communityPolicy.admin = this.serializeRolePolicy(adminPolicy);

    return communityPolicy;
  }

  public inheritParentCredentials(
    communityPolicyParent: ICommunityPolicy,
    communityPolicy: ICommunityPolicy
  ): ICommunityPolicy {
    const memberPolicy = this.inheritParentRoleCredentials(
      communityPolicyParent.member,
      communityPolicy.member
    );
    const leadPolicy = this.inheritParentRoleCredentials(
      communityPolicyParent.lead,
      communityPolicy.lead
    );
    const adminPolicy = this.inheritParentRoleCredentials(
      communityPolicyParent.admin,
      communityPolicy.admin
    );

    communityPolicy.member = this.serializeRolePolicy(memberPolicy);
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);
    communityPolicy.admin = this.serializeRolePolicy(adminPolicy);

    return communityPolicy;
  }

  private save(policy: ICommunityPolicy): Promise<ICommunityPolicy> {
    return this.communityPolicyRepository.save(policy);
  }

  private inheritParentRoleCredentials(
    rolePolicyParentStr: string,
    rolePolicyStr: string
  ): ICommunityRolePolicy {
    const rolePolicyParent: ICommunityRolePolicy =
      this.deserializeRolePolicy(rolePolicyParentStr);
    const rolePolicy: ICommunityRolePolicy =
      this.deserializeRolePolicy(rolePolicyStr);
    rolePolicy.parentCredentials?.push(rolePolicyParent.credential);
    rolePolicyParent.parentCredentials?.forEach(c =>
      rolePolicy.parentCredentials?.push(c)
    );

    return rolePolicy;
  }

  private deserializeRolePolicy(rolePolicyStr: string): ICommunityRolePolicy {
    return JSON.parse(rolePolicyStr);
  }

  private serializeRolePolicy(rolePolicy: ICommunityRolePolicy): string {
    return JSON.stringify(rolePolicy);
  }
}
