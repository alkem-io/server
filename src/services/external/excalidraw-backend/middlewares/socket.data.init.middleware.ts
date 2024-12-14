import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { SocketIoSocket } from '../types/socket.io.socket';
import { SimpleMiddlewareHandler } from './middleware.handler.type';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AuthorizationCredential } from '@common/enums/authorization.credential';

export const socketDataInitMiddleware: SimpleMiddlewareHandler = (
  socket: SocketIoSocket,
  next: (err?: Error) => void
) => {
  socket.data.agentInfo = createAnonymousAgentInfo();
  socket.data.lastContributed = -1;
  socket.data.read = false;
  socket.data.update = false;
  socket.data.session = undefined;

  next();
};

// Todo: duplicate as have both service + function implementations
const createAnonymousAgentInfo = (): AgentInfo => {
  const emptyAgentInfo = new AgentInfo();
  const anonymousCredential: ICredentialDefinition = {
    type: AuthorizationCredential.GLOBAL_ANONYMOUS,
    resourceID: '',
  };
  emptyAgentInfo.credentials = [anonymousCredential];
  return emptyAgentInfo;
};
