import { SpaceVisibility } from '@common/enums/space.visibility';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SpaceFilterInput {
  @Field(() => [SpaceVisibility], {
    nullable: true,
    description:
      'Return Spaces with a Visibility matching one of the provided types.',
  })
  visibilities?: SpaceVisibility[];
}
