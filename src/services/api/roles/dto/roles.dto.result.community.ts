import { SpaceLevel } from '@common/enums/space.level';
import { Field, ObjectType } from '@nestjs/graphql';
import { RolesResult } from './roles.dto.result';

@ObjectType()
export class RolesResultCommunity extends RolesResult {
  @Field(() => SpaceLevel, {
    nullable: false,
    description: 'The level of the Space e.g. L0/L1/L2.',
  })
  level!: SpaceLevel;

  constructor(nameID: string, id: string, displayName: string, level: number) {
    super(nameID, id, displayName);
    this.level = level;
  }
}
