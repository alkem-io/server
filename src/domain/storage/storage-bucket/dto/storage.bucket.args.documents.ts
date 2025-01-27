import { UUID } from '@domain/common/scalars';
import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class StorageBucketArgsDocuments {
  @Field(() => [UUID], {
    description: 'The IDs of the Documents to return',
    nullable: true,
  })
  IDs?: string[];

  @Field(() => Float, {
    description:
      'The number of Documents to return; if omitted return all Documents.',
    nullable: true,
  })
  limit?: number;
}
