import { ExtendedError } from 'socket.io/dist/namespace';
import { SocketIoSocket } from '@services/external/excalidraw-backend/types';

export type MiddlewareHandler = (
  socket: SocketIoSocket,
  next: (err?: ExtendedError) => void
) => void;
