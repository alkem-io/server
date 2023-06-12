import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@domain/community/user/user.entity';

@Injectable()
export class IdentityResolverService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async getUserIDByCommunicationsID(communicationID: string): Promise<string> {
    const userMatch = await this.userRepository
      .createQueryBuilder('user')
      .where('user.communicationID = :communicationID')
      .setParameters({
        communicationID: `${communicationID}`,
      })
      .getOne();
    if (userMatch) return userMatch.id;
    return '';
  }
}
