import { CommunityPolicyFlag } from '@common/enums/community.policy.flag';
import { CommunityRole } from '@common/enums/community.role';
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
    admin: ICommunityRolePolicy,
    host: ICommunityRolePolicy
  ): Promise<ICommunityPolicy> {
    const policy: ICommunityPolicy = new CommunityPolicy(
      this.serializeRolePolicy(member),
      this.serializeRolePolicy(lead),
      this.serializeRolePolicy(host),
      this.serializeRolePolicy(admin)
    );
    return this.save(policy);
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
    role: CommunityRole
  ): ICommunityRolePolicy {
    switch (role) {
      case CommunityRole.MEMBER:
        return this.deserializeRolePolicy(policy.member);
      case CommunityRole.LEAD:
        return this.deserializeRolePolicy(policy.lead);
      case CommunityRole.ADMIN:
        return this.deserializeRolePolicy(policy.admin);
      case CommunityRole.HOST:
        return this.deserializeRolePolicy(policy.host);
      default:
        throw new EntityNotInitializedException(
          `Unable to locate role '${role}' for community policy: ${policy.id}`,
          LogContext.COMMUNITY
        );
    }
  }

  setFlag(policy: ICommunityPolicy, flag: CommunityPolicyFlag, value: boolean) {
    policy.flags.set(flag, value);
  }

  getFlag(policy: ICommunityPolicy, flag: CommunityPolicyFlag): boolean {
    const result = policy.flags.get(flag);
    if (result === undefined) {
      throw new EntityNotInitializedException(
        `Unable to locate flag for community policy: ${policy.id}, flag: ${flag}`,
        LogContext.COMMUNITY
      );
    }
    return result;
  }

  getDirectParentCredentialForRole(
    policy: ICommunityPolicy,
    role: CommunityRole
  ): ICredentialDefinition {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);

    // First entry is the immediate parent
    const parentCommunityCredential = rolePolicy.parentCredentials[0];
    return parentCommunityCredential;
  }

  getParentCredentialsForRole(
    policy: ICommunityPolicy,
    role: CommunityRole
  ): ICredentialDefinition[] {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);

    return rolePolicy.parentCredentials;
  }

  getAllCredentialsForRole(
    policy: ICommunityPolicy,
    role: CommunityRole
  ): ICredentialDefinition[] {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);
    return [rolePolicy.credential, ...rolePolicy.parentCredentials];
  }

  getCredentialForRole(
    policy: ICommunityPolicy,
    role: CommunityRole
  ): ICredentialDefinition {
    const rolePolicy = this.getCommunityRolePolicy(policy, role);
    return rolePolicy.credential;
  }

  // Update the Community policy to have the right resource ID
  public updateCommunityPolicyResourceID(
    communityPolicy: ICommunityPolicy,
    resourceID: string
  ): Promise<ICommunityPolicy> {
    const memberPolicy = this.deserializeRolePolicy(communityPolicy.member);
    memberPolicy.credential.resourceID = resourceID;
    communityPolicy.member = this.serializeRolePolicy(memberPolicy);

    const leadPolicy = this.deserializeRolePolicy(communityPolicy.lead);
    leadPolicy.credential.resourceID = resourceID;
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);

    const adminPolicy = this.deserializeRolePolicy(communityPolicy.admin);
    adminPolicy.credential.resourceID = resourceID;
    communityPolicy.admin = this.serializeRolePolicy(adminPolicy);

    const hostPolicy = this.deserializeRolePolicy(communityPolicy.host);
    hostPolicy.credential.resourceID = resourceID;
    communityPolicy.host = this.serializeRolePolicy(hostPolicy);

    return this.save(communityPolicy);
  }

  public inheritParentCredentials(
    communityPolicyParent: ICommunityPolicy,
    communityPolicy: ICommunityPolicy
  ): Promise<ICommunityPolicy> {
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
    const hostPolicy = this.inheritParentRoleCredentials(
      communityPolicyParent.host,
      communityPolicy.host
    );

    communityPolicy.member = this.serializeRolePolicy(memberPolicy);
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);
    communityPolicy.admin = this.serializeRolePolicy(adminPolicy);
    communityPolicy.host = this.serializeRolePolicy(hostPolicy);

    return this.save(communityPolicy);
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
