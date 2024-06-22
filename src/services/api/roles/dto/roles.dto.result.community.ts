import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceType } from '@common/enums/space.type';
import { RolesResult } from './roles.dto.result';

@ObjectType()
export class RolesResultCommunity extends RolesResult {
  @Field(() => SpaceType, {
    nullable: false,
    description: 'The Type of the Space e.g. space/challenge/opportunity.',
  })
  type!: SpaceType;

  constructor(
    nameID: string,
    id: string,
    displayName: string,
    type: SpaceType
  ) {
    super(nameID, id, displayName);
    this.type = type;
  }
}
