import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import { AccountMapping } from './account.mapping';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async populateAccountMapping(email: string): Promise<AccountMapping> {
    const knownUser = await this.userService.getUserWithGroups(email);
    return new AccountMapping(email, knownUser);
  }
}
