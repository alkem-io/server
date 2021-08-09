export { MatrixClient } from 'matrix-js-sdk';
import { IProfileOpts } from '../adapter-group/matrix.group.dto.profile.options';

export type createGroupContent = {
  localpart: string;
  profile: IProfileOpts;
};
