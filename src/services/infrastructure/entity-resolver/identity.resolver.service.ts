import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

@Injectable()
export class IdentityResolverService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>
  ) {}

  async getUserIDByAgentID(agentID: string): Promise<string | undefined> {
    const userMatch = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.agent', 'agent')
      .where('agent.id = :agentID')
      .setParameters({
        agentID: `${agentID}`,
      })
      .getOne();

    return userMatch ? userMatch.id : undefined;
  }

  async getContributorIDByAgentID(
    agentID: string
  ): Promise<string | undefined> {
    const userMatch = await this.virtualContributorRepository
      .createQueryBuilder('virtual_contributor')
      .leftJoinAndSelect('virtual_contributor.agent', 'agent')
      .where('agent.id = :agentID')
      .setParameters({
        agentID: `${agentID}`,
      })
      .getOne();

    return userMatch ? userMatch.id : undefined;
  }
}
