import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';
import { IPreferenceSet } from '@domain/common/preference-set';
import { IContributor } from '../contributor/contributor.interface';

@ObjectType('User', {
  implements: () => [ISearchable],
})
export class IUser extends IContributor {
  rowId!: number;

  @Field(() => String, {
    description:
      'The unique personal identifier (upn) for the account associated with this user profile',
  })
  accountUpn!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String)
  gender!: string;

  preferenceSet?: IPreferenceSet;

  // the internal communicationID (Matrix) for the user
  communicationID!: string;

  // Indicates if this profile is a service profile that is only used for service account style access
  // to the platform. Temporary measure, full service account support for later.
  serviceProfile!: boolean;

  // Protected via field access for gdpr reasons
  email!: string;
  phone!: string;
}
