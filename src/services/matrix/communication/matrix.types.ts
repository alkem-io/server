type eventHandler = <T = unknown, R = unknown>(args?: T) => R;

export type MatrixClient = {
  startClient: () => void;
  stopClient: () => void;
  getGroups: () => Promise<any[]>;
  getRooms: () => Promise<any[]>;
  getRoom: (roomId: string) => Promise<any>;
  getGroup: (groupId: string) => Promise<any>;
  getGroupRooms: (groupId: string) => Promise<any[]>;
  sendEvent: (
    roomId: string,
    type: string,
    content: Record<string, any>,
    _: string
  ) => void;

  on: (type: string, handler: eventHandler) => void;
  off: (type: string, handler: eventHandler) => void;
};
