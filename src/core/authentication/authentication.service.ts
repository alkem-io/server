import { UserService } from '@domain/community/user/user.service';
import { Injectable } from '@nestjs/common';
import { UserInfo } from './user-info';

@Injectable()
export class AuthenticationService {
  constructor(private readonly userService: UserService) {}

  async createUserInfo(email: string): Promise<UserInfo> {
    let knownUser;
    try {
      knownUser = await this.userService.getUserWithAgent(email);
    } catch (_error) {}
    let credentials = knownUser?.agent?.credentials;
    if (!credentials) credentials = [];
    return { email, user: knownUser, credentials: credentials };
  }
}
