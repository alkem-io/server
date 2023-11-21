import { UnauthorizedException } from '@nestjs/common';
import { SocketIoSocket } from '@services/external/excalidraw-backend/types';
import { isSessionValid } from '@services/external/excalidraw-backend/utils';

export const checkSessionMiddleware = (
  socket: SocketIoSocket,
  next: (err?: Error) => void
) => {
  const { session } = socket.data;
  if (!isSessionValid(session) && !socket.disconnected) {
    return next(new UnauthorizedException('Session invalid or expired'));
  }

  next();
};
