import { ISpace } from '@domain/challenge/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { RolesResultCommunity } from './roles.dto.result.community';

@ObjectType()
export class RolesResultSpace extends RolesResultCommunity {
  @Field(() => String, {
    description: 'The Space ID',
  })
  spaceID: string;

  space: ISpace;

  @Field(() => [RolesResultCommunity], {
    description: 'Details of the Challenges the user is a member of',
  })
  challenges: RolesResultCommunity[] = [];

  @Field(() => [RolesResultCommunity], {
    description: 'Details of the Opportunities the Contributor is a member of',
  })
  opportunities: RolesResultCommunity[] = [];

  @Field(() => SpaceVisibility, {
    nullable: false,
    description: 'Visibility of the Space.',
  })
  visibility!: SpaceVisibility;

  constructor(space: ISpace) {
    super(space.nameID, space.id, space.profile.displayName);
    this.spaceID = space.id;
    this.space = space;
    this.visibility = space.license?.visibility ?? SpaceVisibility.ACTIVE;
  }
}
