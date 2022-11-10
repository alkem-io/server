import { CommunityRole } from '@common/enums/community.role';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
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

  async createCommunityPolicy(
    member: ICommunityRolePolicy,
    lead: ICommunityRolePolicy
  ): Promise<ICommunityPolicy> {
    const policy: ICommunityPolicy = new CommunityPolicy(
      this.serializeRolePolicy(member),
      this.serializeRolePolicy(lead)
    );
    return await this.save(policy);
  }

  async removeCommunityPolicy(
    communityPolicy: ICommunityPolicy
  ): Promise<boolean> {
    await this.communityPolicyRepository.remove(
      communityPolicy as CommunityPolicy
    );
    return true;
  }

  async save(policy: ICommunityPolicy): Promise<ICommunityPolicy> {
    return await this.communityPolicyRepository.save(policy);
  }

  getCommunityRolePolicy(
    policy: ICommunityPolicy,
    role: CommunityRole
  ): ICommunityRolePolicy {
    switch (role) {
      case CommunityRole.MEMBER:
        return this.deserializeRolePolicy(policy.member);
        break;
      case CommunityRole.LEAD:
        return this.deserializeRolePolicy(policy.lead);
        break;

        throw new EntityNotInitializedException(
          `Unable to locate role for community policy: ${policy.id}`,
          LogContext.COMMUNITY
        );
    }
  }

  // Update the Community policy to have the right resource ID
  async updateCommunityPolicyResourceID(
    communityPolicy: ICommunityPolicy,
    resourceID: string
  ): Promise<ICommunityPolicy> {
    const memberPolicy = this.deserializeRolePolicy(communityPolicy.member);
    memberPolicy.credential.resourceID = resourceID;
    communityPolicy.member = this.serializeRolePolicy(memberPolicy);

    const leadPolicy = this.deserializeRolePolicy(communityPolicy.lead);
    leadPolicy.credential.resourceID = resourceID;
    communityPolicy.lead = this.serializeRolePolicy(leadPolicy);

    return this.save(communityPolicy);
  }

  private deserializeRolePolicy(rolePolicyStr: string): ICommunityRolePolicy {
    return JSON.parse(rolePolicyStr);
  }

  private serializeRolePolicy(rolePolicy: ICommunityRolePolicy): string {
    return JSON.stringify(rolePolicy);
  }
}
