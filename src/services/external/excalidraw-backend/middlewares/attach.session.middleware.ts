import { FrontendApi } from '@ory/kratos-client';
import { UnauthorizedException } from '@nestjs/common';
import { getSession } from '@common/utils';
import { WrappedMiddlewareHandler } from './middleware.handler.type';

export const attachSessionMiddleware: WrappedMiddlewareHandler =
  (kratosFrontEndApi: FrontendApi) => async (socket, next) => {
    try {
      socket.data.session = await getSession(kratosFrontEndApi, {
        cookie: socket.handshake.headers.cookie,
      });
    } catch (e: any) {
      next(
        new UnauthorizedException(`Unable to resolve session: ${e?.message}`)
      );
    }

    next();
  };
