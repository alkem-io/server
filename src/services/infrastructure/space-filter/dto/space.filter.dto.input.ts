import { Field, InputType } from '@nestjs/graphql';
import { SpaceVisibility } from '@common/enums/space.visibility';

@InputType()
export class SpaceFilterInput {
  @Field(() => [SpaceVisibility], {
    nullable: true,
    description:
      'Return Spaces with a Visibility matching one of the provided types.',
  })
  visibilities!: SpaceVisibility[];
}
