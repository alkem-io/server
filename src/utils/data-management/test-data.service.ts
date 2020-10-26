import { Injectable } from '@nestjs/common';
import { EcoverseService } from '../../domain/ecoverse/ecoverse.service';
import { UserInput } from '../../domain/user/user.dto';
import { IUser } from '../../domain/user/user.interface';
import { UserService } from '../../domain/user/user.service';

@Injectable()
export class TestDataService {
  constructor(
    private ecoverseService: EcoverseService,
    private userService: UserService
  ) {}

  async initUsers() {
    const user = new UserInput();
    user.email = 'testuser@test.com';
    user.name = 'Bat Georgi';
    await this.ecoverseService.createUser(user);
  }

  async teardownUsers() {
    const batGergi = (await this.userService.getUserByEmail(
      'testuser@test.com'
    )) as IUser;
    await this.ecoverseService.removeUser(batGergi?.id);
  }
}
