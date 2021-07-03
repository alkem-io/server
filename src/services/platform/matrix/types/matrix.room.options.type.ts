import { IRoomCreateOpts } from './matrix.room.create.options.type';

export type IRoomOpts = {
  dmUserId?: string;
  createOpts?: IRoomCreateOpts;
  spinner?: boolean;
  guestAccess?: boolean;
  encryption?: boolean;
  inlineErrors?: boolean;
  andView?: boolean;
  communityId?: string;
};
