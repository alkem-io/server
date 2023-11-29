import { FrontendApi } from '@ory/kratos-client';
import { LoggerService, UnauthorizedException } from '@nestjs/common';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { authenticate } from '../utils';
import { WrappedMiddlewareHandler } from './middleware.handler.type';

export const attachAgentMiddleware: WrappedMiddlewareHandler =
  (
    kratosFrontEndApi: FrontendApi,
    logger: LoggerService,
    authService: AuthenticationService
  ) =>
  async (socket, next) => {
    try {
      socket.data.agentInfo = await authenticate(
        kratosFrontEndApi,
        socket.handshake.headers,
        logger,
        authService
      );
    } catch (e: any) {
      next(
        new UnauthorizedException(
          `Error when trying to authenticate with excalidraw server: ${e.message}`
        )
      );
    }

    next();
  };
