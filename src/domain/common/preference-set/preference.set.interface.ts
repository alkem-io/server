import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IPreference } from '../preference/preference.interface';

export abstract class IPreferenceSet extends IAuthorizable {
  preferences?: IPreference[];
}
