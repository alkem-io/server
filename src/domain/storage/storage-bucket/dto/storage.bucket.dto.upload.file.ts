import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class StorageBucketUploadFileInput {
  @Field({ nullable: false })
  storageBucketId!: string;
}
