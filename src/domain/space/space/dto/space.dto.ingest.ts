import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class IngestSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the Space to be ingested.',
  })
  spaceID!: string;
}
