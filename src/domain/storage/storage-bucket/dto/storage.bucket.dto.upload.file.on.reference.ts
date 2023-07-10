import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class StorageBucketUploadFileOnReferenceInput {
  @Field({ nullable: false })
  referenceID!: string;
}
