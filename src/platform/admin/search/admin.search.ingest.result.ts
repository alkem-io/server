import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class IngestBulkResult {
  @Field(() => Boolean, {
    description: 'Whether the operation was successful.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'A message to describe the result of the operation.',
    nullable: true,
  })
  message?: string;

  // @Field(() => ErroredDocument, {
  //   description: 'Errored documents.',
  //   nullable: true,
  // })
  // erroredDocuments?: ErroredDocument[];
}

@ObjectType()
export class IngestResult {
  @Field(() => String, {
    description: 'The index that the documents were ingested into.',
  })
  index!: string;

  @Field(() => IngestBulkResult, {
    description: 'The result of the operation.',
  })
  result!: IngestBulkResult;
}

@ObjectType()
export class AdminSearchIngestResult {
  @Field(() => [IngestResult], {
    description: 'The result of the operation.',
  })
  results!: IngestResult[];
}
