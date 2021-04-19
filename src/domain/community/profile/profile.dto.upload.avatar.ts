import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UploadProfileAvatarInput {
  @Field({ nullable: false })
  profileID!: string;

  @Field({ nullable: false })
  file!: string;
}
