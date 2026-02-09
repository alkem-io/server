import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class StorageBucketUploadFileInput {
  @Field({ nullable: false })
  storageBucketId!: string;

  // Whether this is a temporarily created Document that can be moved to
  // another StorageBucket
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Is this a temporary Document that will be moved later to another StorageBucket.',
  })
  @IsOptional()
  temporaryLocation?: boolean;
}
