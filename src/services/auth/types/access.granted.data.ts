import { AuthorizationPrivilege } from '@common/enums';

// todo rename
export type AccessGrantedData = {
  userId: string;
  whiteboardId: string;
  privilege: AuthorizationPrivilege;
};
