import { MiddlewareHandler } from "./middleware.handler.type";

export const SessionExtendMiddleware: MiddlewareHandler = (socket, next) => {
  const { session } = socket.handshake;
  if (session) {
    socket.handshake.session = session;
  }
  next();
};