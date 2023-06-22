import { Field, InputType } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';
import { SpacePreferenceType } from '@common/enums/space.preference.type';

@InputType()
export class UpdateSpacePreferenceInput {
  @Field(() => UUID_NAMEID, {
    description: 'ID of the Space',
  })
  spaceID!: string;

  @Field(() => SpacePreferenceType, {
    description: 'Type of the user preference',
  })
  type!: SpacePreferenceType;

  @Field(() => String)
  value!: string;
}
