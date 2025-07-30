import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

@InputType()
export class NotificationRecipientsInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the entity to retrieve the recipients for.',
  })
  entityID!: string;

  @Field(() => SpaceFilterInput, {
    nullable: true,
    description: 'Return membership in Spaces matching the provided filter.',
  })
  filter?: SpaceFilterInput;
}
