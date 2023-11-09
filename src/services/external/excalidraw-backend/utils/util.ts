import { FrontendApi } from '@ory/kratos-client';
import { LoggerService } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication';
import { LogContext } from '@common/enums';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';

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
