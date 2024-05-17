import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AccessGrantedInputData } from '@services/auth/types';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhiteboardService } from '@domain/common/whiteboard';
import { UserService } from '@domain/community/user/user.service';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
import { LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private readonly authService: AuthorizationService,
    private readonly whiteboardService: WhiteboardService,
    private readonly userService: UserService
  ) {}

  public async accessGrantedWhiteboard(
    data: AccessGrantedInputData
  ): Promise<boolean> {
    try {
      const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        data.whiteboardId
      );
      const user = await this.userService.getUserOrFail(data.userId, {
        relations: { agent: true },
      });

      if (!user.agent) {
        const err = new EntityNotInitializedException(
          `Agent not loaded for User: ${user.id}`,
          LogContext.AUTH,
          { userId: data.userId }
        );
        this.logger.error(err.message, err.stack, LogContext.AUTH);
        return false;
      }

      // const verifiedCredentials =
      //   await this.agentService.getVerifiedCredentials(user.agent);
      const verifiedCredentials = [] as IVerifiedCredential[];
      // construct the agent info object needed for isAccessGranted
      const agentInfo = {
        credentials: user.agent.credentials ?? [],
        verifiedCredentials,
      } as AgentInfo;

      return this.authService.isAccessGranted(
        agentInfo,
        whiteboard.authorization,
        data.privilege
      );
    } catch (e: any) {
      this.logger.error(e?.message, e?.stack, LogContext.AUTH);
      return false;
    }
  }
}
