import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SpaceAuthorizationResetInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description:
      'The identifier of the Space whose Authorization Policy should be reset.',
  })
  spaceID!: string;
}
