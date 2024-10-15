import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { NameID } from '@domain/common/scalars';
import { IProfile } from '@domain/common/profile';
import { IContext } from '@domain/context';
import { SpaceLevel } from '@common/enums/space.level';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';

@ObjectType()
export class SpaceInfo {
  @Field(() => UUID, {
    description: 'The Space ID',
  })
  id!: string;

  @Field(() => NameID, {
    description: 'The Space nameID',
  })
  nameID!: string;

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
