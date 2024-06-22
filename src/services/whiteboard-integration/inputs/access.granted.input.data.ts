import { AuthorizationPrivilege } from '@common/enums';

export type AccessGrantedInputData = {
  userId: string;
  whiteboardId: string;
  privilege: AuthorizationPrivilege;
};
