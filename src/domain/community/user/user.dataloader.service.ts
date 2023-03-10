import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IProfile } from '@domain/common/profile/profile.interface';
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
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      relations: ['profile'],
      select: ['id'],
    });

    const results = users.filter(user => userIds.includes(user.id));
    return userIds.map(
      id =>
        results.find(result => result.id === id)?.profile ||
        new EntityNotFoundException(
          `Could not load user ${id}`,
          LogContext.COMMUNITY
        )
    );
  }
}
