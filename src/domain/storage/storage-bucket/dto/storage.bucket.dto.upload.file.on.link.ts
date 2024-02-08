import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class StorageBucketUploadFileOnLinkInput {
  @Field({ nullable: false })
  linkID!: string;
}
