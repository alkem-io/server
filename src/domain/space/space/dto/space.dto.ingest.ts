import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IngestionPurpose } from '@services/infrastructure/event-bus/messages';

@InputType()
export class IngestSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The identifier for the Space to be ingested.',
  })
  spaceID!: string;

  @Field(() => IngestionPurpose, {
    nullable: false,
    description: 'The purpose of the ingestions - either knowledge or context.',
  })
  purpose!: IngestionPurpose;
}
