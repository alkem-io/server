import { FrontendApi } from '@ory/kratos-client';
import { LoggerService } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { CONNECTION_CLOSED, SocketIoSocket } from '../types';

/* Sets the user into the context field or closes the connection */
export const authenticate = async (
  kratosFrontEndApi: FrontendApi,
  headers: Record<string, string | string[] | undefined>,
  logger: LoggerService,
  authService: AuthenticationService
): Promise<AgentInfo> => {
  const cookie = headers.cookie as string;

  try {
    const { data: session } = await kratosFrontEndApi.toSession({
      cookie,
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
    return undefined;
  }
};
export const canUserRead = (
  authorizationService: AuthorizationService,
  agentInfo: AgentInfo,
  wbRtAuthorization?: IAuthorizationPolicy
): boolean => {
  try {
    authorizationService.grantAccessOrFail(
      agentInfo,
      wbRtAuthorization,
      AuthorizationPrivilege.READ,
      'access whiteboardRt'
    );
  } catch (e) {
    return false;
  }

  return true;
};
export const canUserUpdate = (
  authorizationService: AuthorizationService,
  agentInfo: AgentInfo,
  wbRtAuthorization?: IAuthorizationPolicy
): boolean => {
  try {
    authorizationService.grantAccessOrFail(
      agentInfo,
      wbRtAuthorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      'access whiteboardRt'
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
