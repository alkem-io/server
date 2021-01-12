import { ReferenceInput } from '@domain/reference/reference.dto';
import { TagsetInput } from '@domain/tagset/tagset.dto';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ProfileInput {
  @Field({ nullable: true })
  avatar!: string;

  @Field({ nullable: true })
  description!: string;

  @Field(() => [TagsetInput], { nullable: true })
  tagsetsData?: TagsetInput[];

  @Field(() => [ReferenceInput], { nullable: true })
  referencesData?: ReferenceInput[];
}
