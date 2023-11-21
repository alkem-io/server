import { FrontendApi } from '@ory/kratos-client';
import { ExtendedError } from 'socket.io/dist/namespace';
import { LoggerService, UnauthorizedException } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { authenticate } from '../utils';
import { SocketIoSocket } from '../types';

export const attachAgentMiddleware = async (
  socket: SocketIoSocket,
  next: (err?: ExtendedError) => void,
  kratosFrontEndApi: FrontendApi,
  headers: Record<string, string | string[] | undefined>,
  logger: LoggerService,
  authService: AuthenticationService
) => {
  try {
    socket.data.agentInfo = await authenticate(
      kratosFrontEndApi,
      headers,
      logger,
      authService
    );
  } catch (e: any) {
    next(
      new UnauthorizedException(
        `Error when trying to authenticate with excalidraw server: ${e?.message}`
      )
    );
  }

  next();
};
