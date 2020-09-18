import { UserGroup } from '../entities';

export interface IGroupable {
 groups?: UserGroup[];
 restrictedGroupNames?: string[];
}
