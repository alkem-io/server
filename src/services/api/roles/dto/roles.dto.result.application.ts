import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceLevel } from '@common/enums/space.level';

@ObjectType()
export class ApplicationForRoleResult {
  @Field(() => UUID, {
    description: 'ID for the application',
  })
  id: string;

  @Field(() => UUID, {
    description: 'ID for the community',
  })
  communityID: string;

  @Field(() => String, {
    description: 'Display name of the community',
  })
  displayName: string;

  @Field(() => String, {
    description: 'The current state of the application.',
  })
  state: string;

  @Field(() => Date, {
    description: 'Date of creation',
  })
  createdDate: Date;

  @Field(() => Date, {
    description: 'Date of last update',
  })
  updatedDate: Date;

  @Field(() => UUID, {
    description: 'ID for the ultimate containing Space',
  })
  spaceID!: string;

  @Field(() => Number, {
    description: 'Nesting level of the Space',
  })
  spaceLevel!: SpaceLevel;

  constructor(
    communityID: string,
    displayName: string,
    state: string,
    id: string,
    spaceID: string,
    spaceLevel: SpaceLevel,
    createdDate: Date,
    updatedDate: Date
  ) {
    this.displayName = displayName;
    this.communityID = communityID;
    this.state = state;
    this.id = id;
    this.spaceID = spaceID;
    this.spaceLevel = spaceLevel;
    this.createdDate = createdDate;
    this.updatedDate = updatedDate;
  }
}
