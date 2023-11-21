import { FrontendApi } from '@ory/kratos-client';
import { ExtendedError } from 'socket.io/dist/namespace';
import { getSession } from '@common/utils';
import { SocketIoSocket } from '../types';
import { UnauthorizedException } from '@nestjs/common';

export const attachSessionMiddleware =
  (kratosFrontEndApi: FrontendApi) =>
  async (socket: SocketIoSocket, next: (err?: ExtendedError) => void) => {
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
