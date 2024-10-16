import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceType } from '@common/enums/space.type';
import { RolesResult } from './roles.dto.result';
import { SpaceLevel } from '@common/enums/space.level';

@ObjectType()
export class RolesResultCommunity extends RolesResult {
  @Field(() => SpaceType, {
    nullable: false,
    description: 'The Type of the Space e.g. space/challenge/opportunity.',
  })
  type!: SpaceType;

  @Field(() => SpaceLevel, {
    nullable: false,
    description: 'The level of the Space e.g. space/challenge/opportunity.',
  })
  level!: SpaceLevel;

  constructor(
    nameID: string,
    id: string,
    displayName: string,
    type: SpaceType,
    level: number
  ) {
    super(nameID, id, displayName);
    this.type = type;
    this.level = level;
  }
}
