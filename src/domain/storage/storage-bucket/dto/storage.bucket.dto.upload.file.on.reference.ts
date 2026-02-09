import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class StorageBucketUploadFileOnReferenceInput {
  @Field({ nullable: false })
  referenceID!: string;
}
