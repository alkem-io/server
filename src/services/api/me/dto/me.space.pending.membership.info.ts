import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IProfile } from '@domain/common/profile';
import { IContext } from '@domain/context';
import { SpaceLevel } from '@common/enums/space.level';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';

// Class to return the set of information that a user that is invited / had an application for a Space
// needs to see to be able to make a decision
// TBD: decide what fields go in here, including if we want to return full entities like the Profile or only part of that entity.
@ObjectType()
export class SpacePendingMembershipInfo {
  @Field(() => UUID, {
    description: 'The Space ID',
  })
  id!: string;

  @Field(() => IProfile, {
    description: 'The Profile of the Space',
  })
  profile!: IProfile;

  @Field(() => SpaceLevel, {
    description: 'The Level of the Space',
  })
  level!: SpaceLevel;

  @Field(() => IContext, {
    description: 'The Context of the Space',
  })
  context!: IContext;

  @Field(() => ICommunityGuidelines, {
    description: 'The CommunityGuidelines for the Space',
  })
  communityGuidelines?: ICommunityGuidelines;
}
