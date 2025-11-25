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
    const userMatch = await this.userRepository.findOne({
      where: { agent: { id: agentID } },
      select: ['id'],
    });
    return userMatch?.id;
  }

  async getVirtualContributorIDByAgentID(
    agentID: string
  ): Promise<string | undefined> {
    const vcMatch = await this.virtualContributorRepository.findOne({
      where: { agent: { id: agentID } },
      select: ['id'],
    });
    return vcMatch?.id;
  }
}
