import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class StorageBucketUploadFileOnLinkInput {
  @Field({ nullable: false })
  linkID!: string;
}
