import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';

export class UserLookupService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getUserByUUID(
    userID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    let user: IUser | null = null;

    if (userID.length === UUID_LENGTH) {
      {
        user = await this.userRepository.findOne({
          where: {
            id: userID,
          },
          ...options,
        });
      }
    }

    return user;
  }
}
