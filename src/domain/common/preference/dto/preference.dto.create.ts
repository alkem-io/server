import { IHub } from '@domain/challenge/hub/hub.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IPreferenceDefinition } from '..';

export class CreatePreferenceInput {
  preferenceDefinition!: IPreferenceDefinition;
  user?: IUser;
  hub?: IHub;
  value!: any;
}
