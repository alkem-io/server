import { FrontendApi } from '@ory/kratos-client';
import { LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { getSession } from '@common/utils';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { SocketIoSocket } from '../types/socket.io.socket';
import { CONNECTION_CLOSED } from '../types/event.names';

/* Sets the user into the context field or closes the connection */
const authenticate = async (
  kratosFrontEndApi: FrontendApi,
  headers: Record<string, string | string[] | undefined>,
  logger: LoggerService,
  authService: AuthenticationService
): Promise<AgentInfo> => {
  const authorization = headers.authorization as string;

  try {
    const session = await getSession(kratosFrontEndApi, {
      authorization,
    });

    if (!session) {
      logger.verbose?.('No Ory Kratos session', LogContext.EXCALIDRAW_SERVER);
      return authService.createAgentInfo();
    }

    const oryIdentity = session.identity as OryDefaultIdentitySchema;
    return authService.createAgentInfo(oryIdentity);
  } catch (e: any) {
    throw new Error(e?.message);
  }
};
/* returns the user agent info */
export const getUserInfo = async (
  kratosFrontEndApi: FrontendApi,
  headers: Record<string, string | string[] | undefined>,
  logger: LoggerService,
  authService: AuthenticationService
) => {
  try {
    return await authenticate(kratosFrontEndApi, headers, logger, authService);
  } catch (e) {
    const err = e as Error;
    logger.error(
      `Error when trying to authenticate with excalidraw server: ${err.message}`,
      err.stack,
      LogContext.EXCALIDRAW_SERVER
    );
    return authService.createAgentInfo();
  }
};
export const canUserRead = (
  authorizationService: AuthorizationService,
  agentInfo: AgentInfo,
  wbAuthorization?: IAuthorizationPolicy
): boolean => {
  try {
    authorizationService.grantAccessOrFail(
      agentInfo,
      wbAuthorization,
      AuthorizationPrivilege.READ,
      'access whiteboard'
    );
  } catch (e) {
    return false;
  }

  return true;
};
export const canUserUpdate = (
  authorizationService: AuthorizationService,
  agentInfo: AgentInfo,
  wbAuthorization?: IAuthorizationPolicy
): boolean => {
  try {
    authorizationService.grantAccessOrFail(
      agentInfo,
      wbAuthorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      'access whiteboard'
    );
  } catch (e) {
    return false;
  }

  return true;
};

// closes the connection for this socket
// and sends an optional message before disconnecting
export const closeConnection = (socket: SocketIoSocket, message?: string) => {
  if (message) {
    socket.emit(CONNECTION_CLOSED, message);
  }
  socket.removeAllListeners();
  socket.disconnect(true);
};
