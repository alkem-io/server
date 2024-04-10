import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor';

@Injectable()
export class IdentityResolverService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>
  ) {}

  async getUserIDByCommunicationsID(
    communicationID: string
  ): Promise<string | undefined> {
    const userMatch = await this.userRepository
      .createQueryBuilder('user')
      .where('user.communicationID = :communicationID')
      .setParameters({
        communicationID: `${communicationID}`,
      })
      .getOne();

    return userMatch ? userMatch.id : undefined;
  }

  async getContributorIDByCommunicationsID(
    communicationID: string
  ): Promise<string | undefined> {
    const userMatch = await this.virtualContributorRepository
      .createQueryBuilder('virtual_contributor')
      .where('virtual_contributor.communicationID = :communicationID')
      .setParameters({
        communicationID: `${communicationID}`,
      })
      .getOne();

    return userMatch ? userMatch.id : undefined;
  }
}
