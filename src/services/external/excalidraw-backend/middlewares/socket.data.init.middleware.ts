import { AgentInfo } from '@core/authentication';
import { SocketIoSocket } from '../types/socket.io.socket';
import { SimpleMiddlewareHandler } from './middleware.handler.type';

export const socketDataInitMiddleware: SimpleMiddlewareHandler = (
  socket: SocketIoSocket,
  next: (err?: Error) => void
) => {
  socket.data.agentInfo = new AgentInfo();
  socket.data.lastContributed = -1;
  socket.data.read = false;
  socket.data.update = false;
  socket.data.session = undefined;
  socket.data.roomId = '';

  next();
};
