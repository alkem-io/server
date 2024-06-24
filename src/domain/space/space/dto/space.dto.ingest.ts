import { InputType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { SpaceIngestionPurpose } from '@services/infrastructure/event-bus/commands';

@InputType()
export class IngestSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the Space to be ingested.',
  })
  spaceID!: string;

  @Field(() => SpaceIngestionPurpose, {
    nullable: false,
    description: 'The purpose of the ingestions - either knowledge or context.',
  })
  purpose!: SpaceIngestionPurpose;
}
