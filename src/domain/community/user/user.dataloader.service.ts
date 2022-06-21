import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfile } from '../profile';
import { User } from './user.entity';

@Injectable()
export class UserDataloaderService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  public async findProfilesByBatch(
    userIds: string[]
  ): Promise<(IProfile | Error)[]> {
    const users = await this.userRepository.findByIds(userIds, {
      relations: ['profile'],
      select: ['id'],
    });

    const results = users.filter(user => userIds.includes(user.id));
    const mappedResults = userIds.map(
      id =>
        results.find(result => result.id === id)?.profile ||
        new Error(`Could not load user ${id}`)
    );
    return mappedResults;
  }
}
