import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AdminAuthenticationIDBackfillResult')
export class AdminAuthenticationIDBackfillResult {
  @Field(() => Int, {
    description: 'Total users examined during the backfill run',
  })
  processed!: number;

  @Field(() => Int, {
    description: 'Users whose authenticationID was updated during the run',
  })
  updated!: number;

  @Field(() => Int, {
    description:
      'Users skipped because they already had authenticationID or no Kratos identity was found',
  })
  skipped!: number;

  @Field(() => Int, {
    description:
      'Batches that initially failed but succeeded after a retry during the run',
  })
  retriedBatches!: number;
}
