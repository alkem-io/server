import { SocketIoSocket } from '../types';
import { isSessionValid } from './is.session.valid';
import { closeConnection } from './util';

export const checkSession = (socket: SocketIoSocket) => {
  const { session } = socket.data;
  if (!isSessionValid(session) && !socket.disconnected) {
    return closeConnection(socket, 'Session invalid or expired');
  }
};
