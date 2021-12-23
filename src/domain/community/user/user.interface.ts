import { IProfile } from '@domain/community/profile/profile.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IUserPreference } from '../user-preferences/user.preference.interface';

@ObjectType('User', {
  implements: () => [ISearchable],
})
export abstract class IUser extends INameable {
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
  city!: string;

  @Field(() => String)
  country!: string;

  @Field(() => String)
  gender!: string;

  profile?: IProfile;

  agent?: IAgent;

  preferences?: IUserPreference[];

  // the internal communicationID (Matrix) for the user
  communicationID!: string;

  // Indicates if this profile is a service profile that is only used for service account style access
  // to the platform. Temporary measure, full service account support for later.
  serviceProfile!: boolean;

  // Protected via field access for gdpr reasons
  email!: string;
  phone!: string;
}
