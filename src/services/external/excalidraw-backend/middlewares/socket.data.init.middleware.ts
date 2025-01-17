import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { SocketIoSocket } from '../types/socket.io.socket';
import { SimpleMiddlewareHandler } from './middleware.handler.type';

export const createSocketDataInitMiddleware = (
  agentInfoService: AgentInfoService
): SimpleMiddlewareHandler => {
  return (socket: SocketIoSocket, next: (err?: Error) => void) => {
    socket.data.agentInfo = agentInfoService.createAnonymousAgentInfo();
    socket.data.lastContributed = -1;
    socket.data.read = false;
    socket.data.update = false;
    socket.data.session = undefined;
    next();
  };
};
