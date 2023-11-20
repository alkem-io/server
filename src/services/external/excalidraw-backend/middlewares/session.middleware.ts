import { closeConnection } from '../utils';
import { MiddlewareHandler } from './middleware.handler.type';

export const sessionMiddleware: MiddlewareHandler = (socket, next) => {
  const { session } = socket.data;
  if (!session || !session.expires_at) {
    closeConnection(socket, 'Invalid session');
    return next();
  }

  if (Date.now() > new Date(session.expires_at).getTime()) {
    closeConnection(socket, 'Invalid session');
    return next();
  }

  next();
};
