import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class StorageSpaceUploadFileInput {
  @Field({ nullable: false })
  referenceID!: string;
}
