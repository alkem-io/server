import { ISpace } from '@domain/space/space/space.interface';
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
    description: 'Details of the Subspace the user is a member of',
  })
  subspaces: RolesResultCommunity[] = [];

  @Field(() => SpaceVisibility, {
    nullable: false,
    description: 'Visibility of the Space.',
  })
  visibility!: SpaceVisibility;

  constructor(space: ISpace) {
    super(
      space.nameID,
      space.id,
      space.about.profile.displayName,
      space.type,
      space.level
    );
    this.spaceID = space.id;
    this.space = space;
    this.visibility = space.visibility ?? SpaceVisibility.ACTIVE;
  }
}
