import { MatrixEventHandler } from './matrix.event.handler.type';

export type MatrixClient = {
  startClient: () => void;
  stopClient: () => void;
  getGroups: () => Promise<any[]>;
  getRooms: () => Promise<any[]>;
  getRoom: (roomId: string) => Promise<any>;
  joinRoom: (roomId: string) => Promise<void>;
  getGroup: (groupId: string) => Promise<any>;
  acceptGroupInvite: (groupId: string) => Promise<void>;
  getGroupRooms: (groupId: string) => Promise<any[]>;
  isUsernameAvailable: (username: string) => Promise<boolean>;
  loginWithPassword: (
    user: string,
    password: string,
    callback?: any
  ) => Promise<any>;
  sendEvent: (
    roomId: string,
    type: string,
    content: Record<string, any>,
    _: string
  ) => void;

  on: (type: string, handler: MatrixEventHandler) => void;
  off: (type: string, handler: MatrixEventHandler) => void;

  credentials: any;
};
