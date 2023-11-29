import { UnauthorizedException } from '@nestjs/common';
import { SocketIoSocket } from '../types';
import { isSessionValid } from '../utils';
import { SimpleMiddlewareHandler } from './middleware.handler.type';

export const checkSessionMiddleware: SimpleMiddlewareHandler = (
  socket: SocketIoSocket,
  next: (err?: Error) => void
) => {
  const { session } = socket.data;
  if (!isSessionValid(session) && !socket.disconnected) {
    return next(new UnauthorizedException('Session invalid or expired'));
  }

  next();
};
