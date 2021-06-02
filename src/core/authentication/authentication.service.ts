import { LogContext } from '@common/enums';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserInfo } from './user-info';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUserInfo(email: string): Promise<UserInfo> {
    const userInfo = new UserInfo();
    userInfo.email = email;
    const userExists = await this.userService.isRegisteredUser(email);
    if (userExists) {
      const user = await this.userService.getUserWithAgent(email);
      userInfo.user = user;
      this.logger.verbose?.(
        `Authentication Info: User registered: ${email}, with id: ${user.id}`,
        LogContext.AUTH
      );
    } else {
      this.logger.verbose?.(
        `Authentication Info: User not registered: ${email}`,
        LogContext.AUTH
      );
    }
    return userInfo;
  }
}
