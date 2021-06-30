import { MatrixEventHandler } from './matrix.event.handler.type';
import { IProfileOpts } from './matrix.group.profile.options.type';
import { MatrixGroup } from './matrix.group.type';
import { IRoomCreateOpts } from './matrix.room.create.options.type';
import { MatrixRoom } from './matrix.room.type';

export type MatrixClient = {
  startClient: () => void;
  stopClient: () => void;
  getGroups: () => MatrixGroup[];
  getRooms: () => MatrixRoom[];
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

  getAccountData: (key: string) => any;
  setAccountData: (key: string, object: any) => Promise<void>;
  getUserId: () => string;
  createRoom: (roomOpt: IRoomCreateOpts) => any;
  addRoomToGroup: (
    groupId: string,
    roomId: string,
    isPublic: boolean
  ) => Promise<void>;
  invite: (roomId: string, userId: string) => Promise<void>;
  createGroup: (content: createGroupContent) => Promise<MatrixGroup>;
  setGroupJoinPolicy: (groupId: string, obj: any) => Promise<void>;
  inviteUserToGroup: (groupId: string, userId: string) => Promise<void>;

  on: (type: string, handler: MatrixEventHandler) => void;
  off: (type: string, handler: MatrixEventHandler) => void;

  credentials: any;
};

export type createGroupContent = {
  localpart: string;
  profile: IProfileOpts;
};
