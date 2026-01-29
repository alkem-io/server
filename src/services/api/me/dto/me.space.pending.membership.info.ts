import { SpaceLevel } from '@common/enums/space.level';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ISpaceAbout } from '@domain/space/space.about';
import { Field, ObjectType } from '@nestjs/graphql';

// Class to return the set of information that a user that is invited / had an application for a Space
// needs to see to be able to make a decision
// TBD: decide what fields go in here, including if we want to return full entities like the Profile or only part of that entity.
@ObjectType()
export class SpacePendingMembershipInfo {
  @Field(() => UUID, {
    description: 'The Space ID',
  })
  id!: string;

  @Field(() => ISpaceAbout, {
    description: 'About the Space',
  })
  about!: ISpaceAbout;

  @Field(() => SpaceLevel, {
    description: 'The Level of the Space',
  })
  level!: SpaceLevel;

  @Field(() => ICommunityGuidelines, {
    description: 'The CommunityGuidelines for the Space',
  })
  communityGuidelines?: ICommunityGuidelines;
}
