import { Field, ObjectType } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@ObjectType('StorageBucketUploadFileResult')
export class StorageBucketUploadFileResult {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the uploaded Document.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The publicly accessible URL for the uploaded file.',
  })
  url!: string;
}
