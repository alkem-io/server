import { IProfileOpts } from '../adapter-group/matrix.group.dto.profile.options';
import { MatrixGroup } from '../adapter-group/matrix.group.dto.result';
import { IRoomCreateOpts } from '../adapter-room/matrix.room.dto.create.options';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixEventHandler } from './matrix.event.handler.type';

export type MatrixClient = {
  startClient: () => void;
  stopClient: () => void;
  getGroups: () => MatrixGroup[];
  getRooms: () => MatrixRoom[];
  getRoom: (roomId: string) => Promise<any>;
  joinRoom: (roomId: string) => Promise<void>;
  getGroup: (groupId: string) => Promise<any>;
  acceptGroupInvite: (groupId: string) => Promise<void>;
  getGroupRooms: (groupId: string) => Promise<MatrixRoom[]>;
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
  createRoom: (roomOpt: IRoomCreateOpts) => Promise<{ room_id: string }>;
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
