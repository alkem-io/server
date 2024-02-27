import { UnauthorizedException } from '@nestjs/common';
import { SocketIoSocket } from '../types/socket.io.socket';
import { checkSession } from '../utils';
import { SimpleMiddlewareHandler } from './middleware.handler.type';

export const checkSessionMiddleware: SimpleMiddlewareHandler = (
  socket: SocketIoSocket,
  next: (err?: Error) => void
) => {
  if (socket.disconnected) {
    return next();
  }

  const { session } = socket.data;
  const result = checkSession(session);

  if (result) {
    return next(new UnauthorizedException(result));
  }

  next();
};
