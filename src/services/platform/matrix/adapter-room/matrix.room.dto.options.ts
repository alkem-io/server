import { IRoomCreateOpts } from './matrix.room.dto.create.options';

export type IRoomOpts = {
  dmUserId?: string;
  createOpts?: IRoomCreateOpts;
  spinner?: boolean;
  guestAccess?: boolean;
  encryption?: boolean;
  inlineErrors?: boolean;
  andView?: boolean;
  groupId?: string;
  metadata?: Record<string, string>;
};
