import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import { AuthenticatedUserDTO } from './authenticated.user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async populateAuthenticatedUser(
    email: string
  ): Promise<AuthenticatedUserDTO> {
    const knownUser = await this.userService.getUserWithGroups(email);
    return new AuthenticatedUserDTO(email, knownUser);
  }
}
