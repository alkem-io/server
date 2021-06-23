import { IProfile } from '@domain/community/profile/profile.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchable } from '@domain/common/interfaces/searchable.interface';
import { INameable } from '@domain/common/entity/nameable-entity';

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
  email!: string;

  @Field(() => String)
  phone!: string;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  country!: string;

  @Field(() => String)
  gender!: string;

  @Field(() => IProfile, {
    nullable: true,
    description: 'The profile for this User',
  })
  profile?: IProfile;

  @Field(() => IAgent, {
    nullable: true,
    description: 'The agent for this User',
  })
  agent?: IAgent;
}
