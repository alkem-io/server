import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  AuthorizationAssignCapabilityInput,
  AuthorizationRemoveCapabilityInput,
} from '@core/authorization';
import { IUser } from '@domain/community/user';
import { ICapability } from '@domain/common/capability';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async assignCapability(
    assignCapabilityData: AuthorizationAssignCapabilityInput
  ): Promise<IUser> {
    const user = await this.userService.getUserByIdOrFail(
      assignCapabilityData.userID,
      {
        relations: ['capabilities'],
      }
    );

    // todo: create and assign the capability after various logic checks
    return user;
  }

  async removeCapability(
    removeCapabilityData: AuthorizationRemoveCapabilityInput
  ): Promise<IUser> {
    const user = await this.userService.getUserByIdOrFail(
      removeCapabilityData.userID,
      {
        relations: ['capabilities'],
      }
    );

    // todo: remove the capability after various logic checks
    return user;
  }

  isAuthorized(
    assignedCapabilities: ICapability[],
    acceptedPriviliges: string[]
  ): boolean {
    this.logger.verbose?.(
      `Validating authorization via capabilities: ${assignedCapabilities.length} - ${acceptedPriviliges}`,
      LogContext.AUTH
    );
    // todo: check if one matches
    return true;
  }
}
